/**
 * queueService.js — In-Memory Queue with Brevo Quota Guard
 *
 * If Brevo daily quota (300/day) is exceeded:
 *  - All running campaigns are paused immediately
 *  - A 'quota_paused' reason is saved on each campaign
 *  - Campaigns only resume when the client manually resumes them
 *    (next day after quota resets, or whenever Brevo allows again)
 */

const { sendReviewRequestEmail } = require('./emailService');
const { sendReviewRequestSMS }   = require('./smsService');
const { deductCredit }           = require('./creditService');

const Campaign     = require('../models/Campaign');
const Customer     = require('../models/Customer');
const FeedbackPage = require('../models/FeedbackPage');
const CampaignLog  = require('../models/CampaignLog');
const EmailQuota   = require('../models/EmailQuota');

// ─── In-memory job tracker ────────────────────────────────────
const activeJobs = new Map(); // campaignId → { total, done, failed, started }

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Pause ALL running campaigns due to quota ─────────────────
async function pauseAllForQuota() {
  console.warn('[Queue] ⚠️  Brevo daily quota exceeded — pausing ALL running campaigns');

  const running = await Campaign.find({
    status: { $in: ['running', 'scheduled'] },
    isDeleted: false,
  });

  for (const c of running) {
    c.status       = 'paused';
    c.pauseReason  = 'quota_exceeded'; // save reason so UI can show it
    await c.save();

    await CampaignLog.record({
      campaignId: c.campaignId,
      customerId: 'system',
      userId:     c.userId,
      eventType:  'paused',
      channel:    'system',
      metadata: {
        provider:     'system',
        feedbackText: 'Campaign auto-paused: Brevo daily email quota (300/day) exceeded. Resume manually tomorrow.',
      },
    });

    console.warn(`[Queue] Campaign ${c.campaignId} auto-paused (quota)`);
  }
}

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

  if (['sent', 'delivered', 'unsubscribed'].includes(customer.status)) {
    return { skipped: true };
  }

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
        metadata:  { messageId: result.messageId, provider: 'brevo' },
      });
      await Campaign.incrementStat(campaignId, 'totalSent');
    } catch (err) {
      // ── Quota exceeded → pause all campaigns immediately ───
      if (err.code === 'QUOTA_EXCEEDED') {
        results.email = { success: false, error: err.message, quotaExceeded: true };
        customer.emailStatus = 'failed';
        customer.failReason  = 'brevo_quota_exceeded';
        await customer.save();
        await pauseAllForQuota(); // ← stops everything
        return { ...results, quotaExceeded: true };
      }

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
      results.sms         = { success: false, error: err.message };
      customer.smsStatus  = 'failed';
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

  ;(async () => {
    try {
      if (delayMs > 0) {
        console.log(`[Queue] Scheduled — waiting ${Math.round(delayMs / 1000)}s`);
        await sleep(delayMs);
      }

      await Campaign.findOneAndUpdate(
        { campaignId },
        { $set: { status: 'running', 'launch.startedAt': new Date() } }
      );

      const tracker = activeJobs.get(campaignId);
      if (tracker) tracker.started = true;

      console.log(`[Queue] Sending campaign ${campaignId} — ${total} customers`);

      const BATCH_SIZE  = 5;
      const BATCH_DELAY = 1000;

      for (let i = 0; i < customers.length; i += BATCH_SIZE) {
        const latest = await Campaign.findOne({ campaignId }).lean();
        if (['paused', 'cancelled'].includes(latest?.status)) {
          console.log(`[Queue] Stopped — campaign is ${latest.status}`);
          break;
        }

        // ── Pre-batch quota check (email channels) ──────────
        if (['email', 'both'].includes(campaign.channel)) {
          const batchSize  = Math.min(BATCH_SIZE, customers.length - i);
          const quotaCheck = await EmailQuota.checkAvailable(batchSize);
          if (!quotaCheck.sufficient) {
            console.warn(`[Queue] Quota insufficient before batch — pausing all`);
            await pauseAllForQuota();
            break;
          }
        }

        const batch   = customers.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map((c) => processSingleJob(campaignId, c.customerId, userId, channel))
        );

        // Check if any result triggered quota pause
        const quotaHit = results.some(
          (r) => r.status === 'fulfilled' && r.value?.quotaExceeded
        );
        if (quotaHit) {
          console.warn(`[Queue] Quota hit mid-batch — stopping campaign ${campaignId}`);
          break;
        }

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

        if (i + BATCH_SIZE < customers.length) {
          await sleep(BATCH_DELAY);
        }
      }

      // Only mark completed if not paused mid-way
      await Campaign.findOneAndUpdate(
        { campaignId, status: { $nin: ['paused', 'cancelled'] } },
        { $set: { status: 'completed', 'launch.completedAt': new Date() } }
      );

      console.log(`[Queue] Campaign ${campaignId} done ✓`);
    } catch (err) {
      console.error(`[Queue] Campaign ${campaignId} error:`, err.message);
    } finally {
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
    note:    'MVP in-memory queue — Brevo email provider',
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