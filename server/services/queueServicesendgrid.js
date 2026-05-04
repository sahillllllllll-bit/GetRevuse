/**
 * queueService.js — Simple In-Memory Queue (No Redis / BullMQ)
 *
 * MVP replacement for BullMQ. Jobs are processed immediately
 * in the background using async functions. No Redis needed.
 *
 * Limitations vs BullMQ:
 *  - Jobs lost if server restarts mid-send (acceptable for MVP)
 *  - No separate worker process needed — runs inside main server
 *
 * To restore BullMQ later: swap this file back and restart worker.
 */

const { sendReviewRequestEmail } = require('./emailServicesendgrid');
const { sendReviewRequestSMS }   = require('./smsService');
const { deductCredit }           = require('./creditService');

const Campaign     = require('../models/Campaign');
const Customer     = require('../models/Customer');
const FeedbackPage = require('../models/FeedbackPage');
const CampaignLog  = require('../models/CampaignLog');

// ─── In-memory job tracker ────────────────────────────────────
const activeJobs = new Map();  // campaignId → { total, done, failed, started }

// ─── Helper ───────────────────────────────────────────────────
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Process a single customer ────────────────────────────────
async function processSingleJob(campaignId, customerId, userId, channel) {
  const [campaign, customer, feedbackPage] = await Promise.all([
    Campaign.findOne({ campaignId }).lean(),
    Customer.findOne({ customerId }),
    FeedbackPage.findOne({ campaignId }).lean(),
  ]);

  if (!campaign || !customer || !feedbackPage) {
    console.error(`[Queue] Missing data for ${customerId}`);
    return { success: false };
  }

  // Skip already processed
  if (['sent', 'delivered', 'unsubscribed'].includes(customer.status)) {
    return { skipped: true };
  }

  // Stop if campaign paused/cancelled
  if (['paused', 'cancelled'].includes(campaign.status)) {
    return { paused: true };
  }

  const results = {};

  // ── Email ───────────────────────────────────────────────────
  if (['email', 'both'].includes(channel) && customer.email) {
    try {
      await deductCredit(userId, 'email', campaignId, customerId);
      const result = await sendReviewRequestEmail(customer, campaign, feedbackPage);
      results.email        = { success: true, messageId: result.messageId };
      customer.emailStatus = 'sent';
      customer.sentAt      = new Date();
      await CampaignLog.record({
        campaignId, customerId, userId,
        eventType: 'sent', channel: 'email',
        metadata:  { messageId: result.messageId, provider: 'sendgrid' },
      });
      await Campaign.incrementStat(campaignId, 'totalSent');
    } catch (err) {
      results.email        = { success: false, error: err.message };
      customer.emailStatus = 'failed';
      customer.failReason  = err.message;
      await CampaignLog.record({
        campaignId, customerId, userId,
        eventType: 'failed', channel: 'email',
        metadata:  { errorMessage: err.message },
      });
      await Campaign.incrementStat(campaignId, 'totalFailed');
      console.error(`[Queue] Email failed ${customerId}:`, err.message);
    }
  }

  // ── SMS ─────────────────────────────────────────────────────
  if (['sms', 'both'].includes(channel) && customer.phone) {
    try {
      await deductCredit(userId, 'sms', campaignId, customerId);
      const result = await sendReviewRequestSMS(customer, campaign, feedbackPage);
      results.sms                       = { success: true, messageSid: result.messageSid };
      customer.smsStatus                = 'sent';
      customer.sentAt                   = customer.sentAt || new Date();
      customer.externalIds.smsMessageId = result.messageSid;
      await CampaignLog.record({
        campaignId, customerId, userId,
        eventType: 'sent', channel: 'sms',
        metadata:  { messageId: result.messageSid, provider: 'twilio' },
      });
      await Campaign.incrementStat(campaignId, 'totalSent');
    } catch (err) {
      results.sms        = { success: false, error: err.message };
      customer.smsStatus = 'failed';
      customer.failReason = err.message;
      await CampaignLog.record({
        campaignId, customerId, userId,
        eventType: 'failed', channel: 'sms',
        metadata:  { errorMessage: err.message },
      });
      await Campaign.incrementStat(campaignId, 'totalFailed');
      console.error(`[Queue] SMS failed ${customerId}:`, err.message);
    }
  }

  const anySuccess = results.email?.success || results.sms?.success;
  customer.status  = anySuccess ? 'sent' : 'failed';
  await customer.save();

  return results;
}

// ─── Main: queue all jobs for a campaign ─────────────────────
async function addCampaignJobs(campaign, customers, delayMs = 0) {
  const { campaignId, userId, channel } = campaign;
  const total = customers.length;

  activeJobs.set(campaignId, { total, done: 0, failed: 0, started: false });
  console.log(`[Queue] ${total} jobs queued for campaign ${campaignId}`);

  // Fire and forget — runs in background, never blocks the HTTP response
  ;(async () => {
    try {
      // Wait for scheduled delay
      if (delayMs > 0) {
        console.log(`[Queue] Scheduled — waiting ${Math.round(delayMs / 1000)}s`);
        await sleep(delayMs);
      }

      // Mark campaign running
      await Campaign.findOneAndUpdate(
        { campaignId },
        { $set: { status: 'running', 'launch.startedAt': new Date() } }
      );

      const tracker = activeJobs.get(campaignId);
      if (tracker) tracker.started = true;

      console.log(`[Queue] Sending campaign ${campaignId} — ${total} customers`);

      // Send in batches of 5, 1s apart to respect rate limits
      const BATCH_SIZE  = 5;
      const BATCH_DELAY = 1000;

      for (let i = 0; i < customers.length; i += BATCH_SIZE) {
        // Re-check campaign status before each batch
        const latest = await Campaign.findOne({ campaignId }).lean();
        if (['paused', 'cancelled'].includes(latest?.status)) {
          console.log(`[Queue] Stopped — campaign is ${latest.status}`);
          break;
        }

        const batch   = customers.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map((c) => processSingleJob(campaignId, c.customerId, userId, channel))
        );

        // Update tracker
        const t = activeJobs.get(campaignId);
        if (t) {
          results.forEach((r) => {
            if (r.status === 'fulfilled' && !r.value?.skipped && !r.value?.paused) {
              const v = r.value;
              if (v?.email?.success || v?.sms?.success) t.done++;
              else t.failed++;
            }
          });
        }

        // Delay between batches (skip after last)
        if (i + BATCH_SIZE < customers.length) {
          await sleep(BATCH_DELAY);
        }
      }

      // Mark completed
      await Campaign.findOneAndUpdate(
        { campaignId, status: { $nin: ['paused', 'cancelled'] } },
        { $set: { status: 'completed', 'launch.completedAt': new Date() } }
      );

      console.log(`[Queue] Campaign ${campaignId} done ✓`);
    } catch (err) {
      console.error(`[Queue] Campaign ${campaignId} error:`, err.message);
    } finally {
      // Clean up tracker after 10 min
      setTimeout(() => activeJobs.delete(campaignId), 10 * 60 * 1000);
    }
  })();

  return total;
}

// ─── Stats ────────────────────────────────────────────────────
async function getQueueStats() {
  return {
    active:  activeJobs.size,
    waiting: 0,
    note:    'MVP in-memory queue — no Redis',
  };
}

function getCampaignProgress(campaignId) {
  return activeJobs.get(campaignId) || null;
}

module.exports = {
  addCampaignJobs,
  getQueueStats,
  getCampaignProgress,
  sendQueue:       null,
  redisConnection: null,
};