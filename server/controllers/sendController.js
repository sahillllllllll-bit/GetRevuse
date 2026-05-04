const Campaign     = require('../models/Campaign');
const Customer     = require('../models/Customer');
const FeedbackPage = require('../models/FeedbackPage');
const { asyncHandler } = require('../middlewares/asyncHandler');

// Lazy imports to prevent Redis startup errors breaking routes
const getCreditService = () => require('../services/creditService');
const getQueueService  = () => require('../services/queueService'); // Brevo-based queue

const success = (res, data, code = 200, meta = {}) =>
  res.status(code).json({ success: true, ...meta, ...data });

// ═══════════════════════════════════════════════════════════════
// POST /api/send/campaign/:id
// Validate credits → queue all customer send jobs → update status
// ═══════════════════════════════════════════════════════════════
const launchCampaign = asyncHandler(async (req, res) => {
  const { uid } = req.user;
  const { id }  = req.params;

  // ── Load campaign ───────────────────────────────────────────
  const campaign = await Campaign.findOne({
    campaignId: id,
    userId:     uid,
    isDeleted:  false,
  });

  if (!campaign) {
    return res.status(404).json({ success: false, message: 'Campaign not found' });
  }

  if (['running', 'completed', 'cancelled'].includes(campaign.status)) {
    return res.status(409).json({
      success: false,
      message: `Campaign is already ${campaign.status}`,
    });
  }

  // ── Check Brevo daily email quota before launch ─────────────
  if (['email', 'both'].includes(campaign.channel)) {
  const EmailQuota = require('../models/EmailQuota');
  const DAILY_LIMIT = parseInt(process.env.BREVO_DAILY_LIMIT || '300', 10);
  const quotaCheck  = await EmailQuota.checkAvailable(customers.length, DAILY_LIMIT);
  if (!quotaCheck.sufficient) {
    return res.status(429).json({
      success:   false,
      message:   `Brevo daily email quota nearly exhausted. Only ${quotaCheck.remaining} emails remaining today (limit: ${DAILY_LIMIT}). Try again tomorrow.`,
      code:      'EMAIL_QUOTA_EXCEEDED',
      remaining: quotaCheck.remaining,
      needed:    customers.length,
      resetTime: 'Midnight UTC',
    });
  }
}

  // ── Load pending customers ──────────────────────────────────
  const customers = await Customer.find({
    campaignId: id,
    status:     'pending',
    isDeleted:  false,
  }).lean();

  if (customers.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No pending customers to send to',
    });
  }

  // ── Check credits ───────────────────────────────────────────
  const { checkCredits } = getCreditService();
  const creditCheck = await checkCredits(uid, campaign.channel, customers.length);
  if (!creditCheck.sufficient) {
    return res.status(402).json({
      success:  false,
      message:  `Insufficient credits. Need ${creditCheck.needed}, you have ${creditCheck.balance}.`,
      code:     'INSUFFICIENT_CREDITS',
      needed:   creditCheck.needed,
      balance:  creditCheck.balance,
      shortfall: creditCheck.shortfall,
    });
  }

  // ── Ensure FeedbackPage exists ──────────────────────────────
  let feedbackPage = await FeedbackPage.findOne({ campaignId: id });
  if (!feedbackPage) {
    feedbackPage = await FeedbackPage.create({
      campaignId:          campaign.campaignId,
      userId:              uid,
      businessName:        campaign.businessName,
      threshold:           campaign.routing.threshold,
      reviewLink:          campaign.reviewLink,
      feedbackFormEnabled: campaign.routing.feedbackFormEnabled,
      feedbackFields:      campaign.routing.feedbackFields,
      feedbackNote:        campaign.routing.feedbackNote,
    });
  }

  // ── Resolve scheduled delay ─────────────────────────────────
  campaign.resolveScheduledAt();
  const now      = new Date();
  const delayMs  = campaign.launch.scheduledAt > now
    ? campaign.launch.scheduledAt.getTime() - now.getTime()
    : 0;

  // ── Add jobs to BullMQ ──────────────────────────────────────
  const { addCampaignJobs } = getQueueService();
  const jobsAdded = await addCampaignJobs(campaign, customers, delayMs);

  // ── Update campaign status ──────────────────────────────────
  campaign.status           = delayMs > 0 ? 'scheduled' : 'running';
  campaign.launch.startedAt = delayMs > 0 ? null : new Date();
  campaign.stats.totalCustomers = customers.length;
  await campaign.save();

  // ── Update all customers to 'queued' ───────────────────────
  await Customer.updateMany(
    { campaignId: id, status: 'pending' },
    { $set: { status: 'queued' } }
  );

  return success(res, {
    campaignId:       campaign.campaignId,
    status:           campaign.status,
    jobsQueued:       jobsAdded,
    customersCount:   customers.length,
    scheduledAt:      campaign.launch.scheduledAt,
    feedbackPageSlug: feedbackPage.slug,
    feedbackPageUrl:  feedbackPage.publicUrl,
    creditsNeeded:    creditCheck.needed,
    creditsRemaining: creditCheck.balance - creditCheck.needed,
  }, 200, { message: delayMs > 0 ? 'Campaign scheduled successfully' : 'Campaign launched successfully' });
});

// ═══════════════════════════════════════════════════════════════
// GET /api/send/campaign/:id/status
// Poll campaign send progress
// ═══════════════════════════════════════════════════════════════
const getCampaignSendStatus = asyncHandler(async (req, res) => {
  const { uid } = req.user;
  const { id }  = req.params;

  const campaign = await Campaign.findOne({
    campaignId: id,
    userId:     uid,
    isDeleted:  false,
  }).lean();

  if (!campaign) {
    return res.status(404).json({ success: false, message: 'Campaign not found' });
  }

  const counts = await Customer.aggregate([
    { $match: { campaignId: id } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const statusMap = counts.reduce((acc, { _id, count }) => {
    acc[_id] = count;
    return acc;
  }, {});

  const total    = Object.values(statusMap).reduce((a, b) => a + b, 0);
  const sent     = (statusMap.sent || 0) + (statusMap.delivered || 0);
  const failed   = statusMap.failed   || 0;
  const pending  = statusMap.pending  || 0;
  const queued   = statusMap.queued   || 0;

  const progress = total > 0 ? Math.round(((sent + failed) / total) * 100) : 0;

  // Auto-complete campaign if all sent
  if (campaign.status === 'running' && queued === 0 && pending === 0) {
    await Campaign.findOneAndUpdate(
      { campaignId: id },
      {
        $set: {
          status:                'completed',
          'launch.completedAt':  new Date(),
        },
      }
    );
  }

  return success(res, {
    campaignId: id,
    status:     campaign.status,
    progress,
    counts: { total, sent, failed, pending, queued },
  });
});

module.exports = { launchCampaign, getCampaignSendStatus };