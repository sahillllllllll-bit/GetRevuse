// require('dotenv').config();
// const mongoose = require('mongoose');
// const { Worker } = require('bullmq');

// const { redisConnection } = require('./services/queueService');
// const { sendReviewRequestEmail } = require('./services/emailService');
// const { sendReviewRequestSMS }   = require('./services/smsService');
// const { deductCredit }           = require('./services/creditService');

// const Campaign        = require('./models/Campaign');
// const Customer        = require('./models/Customer');
// const FeedbackPage    = require('./models/FeedbackPage');
// const CampaignLog     = require('./models/CampaignLog');

// // ─── Connect to MongoDB ───────────────────────────────────────
// mongoose.connect(process.env.MONGO_URI)
//   .then(() => console.log('[Worker] MongoDB connected'))
//   .catch((err) => { console.error('[Worker] MongoDB error:', err); process.exit(1); });

// // ─── Process a single send job ────────────────────────────────
// async function processJob(job) {
//   const { campaignId, customerId, userId, channel } = job.data;

//   // Load required documents
//   const [campaign, customer, feedbackPage] = await Promise.all([
//     Campaign.findOne({ campaignId }).lean(),
//     Customer.findOne({ customerId }),
//     FeedbackPage.findOne({ campaignId }).lean(),
//   ]);

//   if (!campaign || !customer || !feedbackPage) {
//     throw new Error(`Missing data: campaign=${!!campaign} customer=${!!customer} feedbackPage=${!!feedbackPage}`);
//   }

//   // Skip if already sent or unsubscribed
//   if (['sent', 'delivered', 'unsubscribed'].includes(customer.status)) {
//     console.log(`[Worker] Skipping ${customerId} — already ${customer.status}`);
//     return { skipped: true };
//   }

//   const results = {};

//   // ── Send Email ──────────────────────────────────────────────
//   if (['email', 'both'].includes(channel) && customer.email) {
//     try {
//       // Deduct credit before send
//       await deductCredit(userId, 'email', campaignId, customerId);

//       const result = await sendReviewRequestEmail(customer, campaign, feedbackPage);
//       results.email = { success: true, messageId: result.messageId };

//       customer.emailStatus = 'sent';
//       customer.sentAt      = new Date();

//       await CampaignLog.record({
//         campaignId, customerId, userId,
//         eventType: 'sent',
//         channel:   'email',
//         metadata:  { messageId: result.messageId, provider: 'sendgrid' },
//       });

//       await Campaign.incrementStat(campaignId, 'totalSent');
//     } catch (err) {
//       results.email = { success: false, error: err.message };
//       customer.emailStatus = 'failed';
//       customer.failReason  = err.message;

//       await CampaignLog.record({
//         campaignId, customerId, userId,
//         eventType: 'failed',
//         channel:   'email',
//         metadata:  { errorMessage: err.message },
//       });

//       await Campaign.incrementStat(campaignId, 'totalFailed');
//     }
//   }

//   // ── Send SMS ────────────────────────────────────────────────
//   if (['sms', 'both'].includes(channel) && customer.phone) {
//     try {
//       await deductCredit(userId, 'sms', campaignId, customerId);

//       const result = await sendReviewRequestSMS(customer, campaign, feedbackPage);
//       results.sms  = { success: true, messageSid: result.messageSid };

//       customer.smsStatus   = 'sent';
//       customer.sentAt      = customer.sentAt || new Date();
//       customer.externalIds.smsMessageId = result.messageSid;

//       await CampaignLog.record({
//         campaignId, customerId, userId,
//         eventType: 'sent',
//         channel:   'sms',
//         metadata:  { messageId: result.messageSid, provider: 'twilio' },
//       });

//       await Campaign.incrementStat(campaignId, 'totalSent');
//     } catch (err) {
//       results.sms = { success: false, error: err.message };
//       customer.smsStatus  = 'failed';
//       customer.failReason = err.message;

//       await CampaignLog.record({
//         campaignId, customerId, userId,
//         eventType: 'failed',
//         channel:   'sms',
//         metadata:  { errorMessage: err.message },
//       });

//       await Campaign.incrementStat(campaignId, 'totalFailed');
//     }
//   }

//   // Update customer overall status
//   const anySuccess = results.email?.success || results.sms?.success;
//   customer.status  = anySuccess ? 'sent' : 'failed';
//   await customer.save();

//   return results;
// }

// // ─── Worker ───────────────────────────────────────────────────
// const worker = new Worker(
//   'campaign-sends',
//   async (job) => {
//     console.log(`[Worker] Processing job ${job.id} — ${job.data.customerId}`);
//     return processJob(job);
//   },
//   {
//     connection:  redisConnection,
//     concurrency: 5,   // process 5 jobs simultaneously
//   }
// );

// worker.on('completed', (job, result) => {
//   console.log(`[Worker] ✓ Job ${job.id} completed`, result);
// });

// worker.on('failed', (job, err) => {
//   console.error(`[Worker] ✗ Job ${job.id} failed:`, err.message);
// });

// worker.on('error', (err) => {
//   console.error('[Worker] Worker error:', err);
// });

// console.log('[Worker] 🚀 Campaign send worker started');

// // Graceful shutdown
// process.on('SIGTERM', async () => {
//   console.log('[Worker] Shutting down gracefully...');
//   await worker.close();
//   await mongoose.disconnect();
//   process.exit(0);
// });


/**
 * worker.js — DISABLED for MVP
 *
 * BullMQ worker is not used in MVP mode.
 * Sending is handled directly inside queueService.js
 * running within the main server process.
 *
 * To re-enable BullMQ later:
 *  1. npm install bullmq ioredis
 *  2. Restore the original queueService.js
 *  3. Restore this worker.js from git
 *  4. Run: npm run dev:worker in a separate terminal
 */

console.log('[Worker] MVP mode — worker not needed. Sending handled by main server.');
console.log('[Worker] To use BullMQ, restore queueService.js and this file.');
process.exit(0);