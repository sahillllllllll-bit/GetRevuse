const Campaign     = require('../models/Campaign');
const Customer     = require('../models/Customer');
const CampaignLog  = require('../models/CampaignLog');
const FeedbackPage = require('../models/FeedbackPage');
const { asyncHandler } = require('../middlewares/asyncHandler');

// Lazy imports — loaded only when actually called
// Prevents Redis/service startup errors from breaking all routes
const getCreditService = () => require('../services/creditService');
const getQueueService  = () => require('../services/queueService'); // Brevo-based queue

// ─── Helpers ──────────────────────────────────────────────────
const ITEMS_PER_PAGE = 10;

const success = (res, data, statusCode = 200, meta = {}) =>
  res.status(statusCode).json({ success: true, ...meta, ...data });

// ═══════════════════════════════════════════════════════════════
// POST /api/campaigns
// Create campaign + bulk insert customers
// If schedule = "now" → immediately validate credits + queue jobs
// ═══════════════════════════════════════════════════════════════
const createCampaign = asyncHandler(async (req, res) => {
  const { uid } = req.user;
  const {
    businessName, platform, reviewLink, channel,
    customers = [], templates, routing, launch,
  } = req.body;

  // ── Check credits upfront before saving anything ────────────
  const { checkCredits } = getCreditService();
  const creditCheck = await checkCredits(uid, channel, customers.length);
  if (!creditCheck.sufficient) {
    return res.status(402).json({
      success:   false,
      message:   `Insufficient credits. Need ${creditCheck.needed}, you have ${creditCheck.balance}.`,
      code:      'INSUFFICIENT_CREDITS',
      needed:    creditCheck.needed,
      balance:   creditCheck.balance,
      shortfall: creditCheck.shortfall,
    });
  }

  // ── Check Brevo daily email quota before creating ───────────
  if (['email', 'both'].includes(channel)) {
  const EmailQuota = require('../models/EmailQuota');
  const DAILY_LIMIT = parseInt(process.env.BREVO_DAILY_LIMIT || '300', 10);
  const quotaCheck  = await EmailQuota.checkAvailable(customers.length, DAILY_LIMIT);
  if (!quotaCheck.sufficient) {
    return res.status(429).json({
      success:   false,
      message:   `Brevo daily email quota nearly exhausted. Only ${quotaCheck.remaining} emails remaining today (limit: ${DAILY_LIMIT}). Try again tomorrow or reduce customer count.`,
      code:      'EMAIL_QUOTA_EXCEEDED',
      remaining: quotaCheck.remaining,
      needed:    quotaCheck.needed,
      resetTime: 'Midnight UTC',
    });
  }
}

  // ── Build + save campaign ───────────────────────────────────
  const campaign = new Campaign({
    userId:       uid,
    campaignName: launch.campaignName,
    businessName,
    platform,
    reviewLink,
    channel,
    templates: {
      email: ['email', 'both'].includes(channel) ? templates?.email : null,
      sms:   ['sms',   'both'].includes(channel) ? templates?.sms   : null,
    },
    routing: {
      threshold:           routing?.threshold           ?? 4,
      feedbackFormEnabled: routing?.feedbackFormEnabled ?? true,
      feedbackFields:      routing?.feedbackFields      || ['name', 'email', 'message'],
      feedbackNote:        routing?.feedbackNote        || '',
      notifyOnNegative:    routing?.notifyOnNegative    ?? true,
      notifyEmail:         routing?.notifyEmail         || null,
    },
    launch: {
      campaignName:   launch.campaignName,
      senderName:     launch.senderName,
      senderEmail:    launch.senderEmail   || null,
      senderPhone:    launch.senderPhone   || null,
      schedule:       launch.schedule      || 'now',
      customDateTime: launch.customDateTime ? new Date(launch.customDateTime) : null,
    },
    stats: {
      totalCustomers: customers.length,
    },
  });

  // Resolve scheduledAt from schedule string
  campaign.resolveScheduledAt();

  await campaign.save();

  // ── Bulk insert customers ───────────────────────────────────
  let insertedCustomers = [];
  if (customers.length > 0) {
    insertedCustomers = await Customer.bulkInsertForCampaign(
      campaign.campaignId,
      uid,
      customers
    );
  }

  // ── Create FeedbackPage for this campaign ───────────────────
  // Slug is auto-generated in FeedbackPage pre-save hook via slugService
  const feedbackPage = await FeedbackPage.create({
    campaignId:          campaign.campaignId,
    userId:              uid,
    businessName:        campaign.businessName,
    threshold:           campaign.routing.threshold,
    reviewLink:          campaign.reviewLink,
    feedbackFormEnabled: campaign.routing.feedbackFormEnabled,
    feedbackFields:      campaign.routing.feedbackFields,
    feedbackNote:        campaign.routing.feedbackNote,
  });

  // ── Log creation ────────────────────────────────────────────
  await CampaignLog.record({
    campaignId: campaign.campaignId,
    customerId: 'system',
    userId:     uid,
    eventType:  'queued',
    channel:    'system',
    metadata:   {
      provider:     'system',
      feedbackText: `Campaign created with ${customers.length} customers. FeedbackPage: ${feedbackPage.slug}`,
    },
  });

  // ── Auto-launch if schedule = "now" ─────────────────────────
  let jobsQueued = 0;
  if (launch.schedule === 'now' && insertedCustomers.length > 0) {
    const { addCampaignJobs } = getQueueService();
    jobsQueued = await addCampaignJobs(campaign, insertedCustomers, 0);

    // Mark customers as queued
    await Customer.updateMany(
      { campaignId: campaign.campaignId, status: 'pending' },
      { $set: { status: 'queued' } }
    );

    campaign.status           = 'running';
    campaign.launch.startedAt = new Date();
    await campaign.save();
  }

  return success(
    res,
    {
      campaign,
      customersAdded:   insertedCustomers.length,
      jobsQueued,
      feedbackPage: {
        slug:       feedbackPage.slug,
        publicUrl:  feedbackPage.publicUrl,
      },
      credits: {
        needed:    creditCheck.needed,
        balance:   creditCheck.balance,
        remaining: creditCheck.balance - creditCheck.needed,
      },
    },
    201,
    {
      message: launch.schedule === 'now'
        ? 'Campaign created and launched successfully'
        : 'Campaign created successfully',
    }
  );
});

// ═══════════════════════════════════════════════════════════════
// GET /api/campaigns
// Get all campaigns for the logged-in user (paginated, filterable)
// ═══════════════════════════════════════════════════════════════
const getCampaigns = asyncHandler(async (req, res) => {
  const { uid } = req.user;
  const {
    page      = 1,
    limit     = ITEMS_PER_PAGE,
    status,
    channel,
    platform,
    search,
    sortBy    = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  const filter = { userId: uid, isDeleted: false };

  if (status   && status   !== 'all') filter.status   = status;
  if (channel  && channel  !== 'all') filter.channel  = channel;
  if (platform && platform !== 'all') filter.platform = platform;

  if (search) {
    const regex = new RegExp(search.trim(), 'i');
    filter.$or  = [{ campaignName: regex }, { businessName: regex }];
  }

  const pageNum  = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
  const skip     = (pageNum - 1) * limitNum;

  const allowedSortFields = ['createdAt', 'updatedAt', 'campaignName', 'status'];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const sortDir   = sortOrder === 'asc' ? 1 : -1;

  const [campaigns, total] = await Promise.all([
    Campaign.find(filter)
      .sort({ [sortField]: sortDir })
      .skip(skip)
      .limit(limitNum)
      .lean({ virtuals: true }),
    Campaign.countDocuments(filter),
  ]);

  // Attach feedbackPage slug to each campaign
  const campaignIds = campaigns.map((c) => c.campaignId);
  const feedbackPages = await FeedbackPage.find(
    { campaignId: { $in: campaignIds } }
  ).select('campaignId slug').lean();

  const slugMap = feedbackPages.reduce((acc, fp) => {
    acc[fp.campaignId] = fp.slug;
    return acc;
  }, {});

  const enriched = campaigns.map((c) => ({
    ...c,
    feedbackSlug: slugMap[c.campaignId] || null,
  }));

  return success(res, {
    campaigns: enriched,
    pagination: {
      page:       pageNum,
      limit:      limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNext:    pageNum < Math.ceil(total / limitNum),
      hasPrev:    pageNum > 1,
    },
  });
});

// ═══════════════════════════════════════════════════════════════
// GET /api/campaigns/:id
// Get a single campaign by campaignId
// ═══════════════════════════════════════════════════════════════
const getCampaignById = asyncHandler(async (req, res) => {
  const { uid } = req.user;
  const { id }  = req.params;

  const campaign = await Campaign.findOne({
    campaignId: id,
    userId:     uid,
    isDeleted:  false,
  }).lean({ virtuals: true });

  if (!campaign) {
    return res.status(404).json({ success: false, message: 'Campaign not found' });
  }

  // Attach live customer stats + feedback page slug
  const [customerStats, feedbackPage] = await Promise.all([
    Customer.getStatsForCampaign(id),
    FeedbackPage.findOne({ campaignId: id }).select('slug publicUrl active').lean(),
  ]);

  return success(res, {
    campaign,
    customerStats,
    feedbackPage: feedbackPage || null,
  });
});

// ═══════════════════════════════════════════════════════════════
// PUT /api/campaigns/:id
// Update a campaign (only draft or paused)
// ═══════════════════════════════════════════════════════════════
const updateCampaign = asyncHandler(async (req, res) => {
  const { uid } = req.user;
  const { id }  = req.params;

  const campaign = await Campaign.findOne({
    campaignId: id,
    userId:     uid,
    isDeleted:  false,
  });

  if (!campaign) {
    return res.status(404).json({ success: false, message: 'Campaign not found' });
  }

  if (!['draft', 'paused'].includes(campaign.status)) {
    return res.status(409).json({
      success: false,
      message: `Cannot edit a campaign with status "${campaign.status}". Pause it first.`,
    });
  }

  const allowed = [
    'campaignName', 'businessName', 'platform', 'reviewLink',
    'channel', 'templates', 'routing', 'launch',
  ];

  allowed.forEach((key) => {
    if (req.body[key] !== undefined) {
      if (['launch', 'routing', 'templates'].includes(key)) {
        campaign[key] = { ...campaign[key].toObject(), ...req.body[key] };
      } else {
        campaign[key] = req.body[key];
      }
    }
  });

  if (req.body.launch?.campaignName) {
    campaign.campaignName = req.body.launch.campaignName;
  }

  if (req.body.launch?.schedule) {
    campaign.resolveScheduledAt();
  }

  await campaign.save();

  // Sync FeedbackPage if routing config changed
  if (req.body.routing || req.body.reviewLink || req.body.businessName) {
    await FeedbackPage.findOneAndUpdate(
      { campaignId: id },
      {
        $set: {
          ...(req.body.businessName && { businessName: req.body.businessName }),
          ...(req.body.reviewLink   && { reviewLink:   req.body.reviewLink   }),
          ...(req.body.routing?.threshold           !== undefined && { threshold:           req.body.routing.threshold           }),
          ...(req.body.routing?.feedbackFormEnabled !== undefined && { feedbackFormEnabled: req.body.routing.feedbackFormEnabled }),
          ...(req.body.routing?.feedbackFields      && { feedbackFields: req.body.routing.feedbackFields }),
          ...(req.body.routing?.feedbackNote        && { feedbackNote:   req.body.routing.feedbackNote   }),
        },
      }
    );
  }

  return success(res, { campaign }, 200, { message: 'Campaign updated successfully' });
});

// ═══════════════════════════════════════════════════════════════
// DELETE /api/campaigns/:id  (soft delete)
// ═══════════════════════════════════════════════════════════════
const deleteCampaign = asyncHandler(async (req, res) => {
  const { uid } = req.user;
  const { id }  = req.params;

  const campaign = await Campaign.findOne({
    campaignId: id,
    userId:     uid,
    isDeleted:  false,
  });

  if (!campaign) {
    return res.status(404).json({ success: false, message: 'Campaign not found' });
  }

  await campaign.softDelete();

  // Deactivate feedback page too
  await FeedbackPage.findOneAndUpdate(
    { campaignId: id },
    { $set: { active: false } }
  );

  return success(res, {}, 200, { message: 'Campaign deleted successfully' });
});

// ═══════════════════════════════════════════════════════════════
// POST /api/campaigns/:id/duplicate
// ═══════════════════════════════════════════════════════════════
const duplicateCampaign = asyncHandler(async (req, res) => {
  const { uid } = req.user;
  const { id }  = req.params;

  const original = await Campaign.findOne({
    campaignId: id,
    userId:     uid,
    isDeleted:  false,
  }).lean();

  if (!original) {
    return res.status(404).json({ success: false, message: 'Campaign not found' });
  }

  const { _id, campaignId, stats, createdAt, updatedAt, ...rest } = original;

  const duplicate = new Campaign({
    ...rest,
    campaignName:   `${original.campaignName} (Copy)`,
    userId:         uid,
    status:         'draft',
    duplicatedFrom: original.campaignId,
    stats:          {},
    isDeleted:      false,
    deletedAt:      null,
  });

  await duplicate.save();

  // Copy customers (reset to pending)
  const originalCustomers = await Customer.find({
    campaignId: original.campaignId,
    isDeleted:  false,
  }).lean();

  if (originalCustomers.length > 0) {
    const docs = originalCustomers.map((c) => ({
      customerId: `cust_${require('uuid').v4().replace(/-/g, '').slice(0, 16)}`,
      campaignId: duplicate.campaignId,
      userId:     uid,
      name:       c.name,
      email:      c.email || null,
      phone:      c.phone || null,
      status:     'pending',
    }));
    await Customer.insertMany(docs, { ordered: false });
  }

  // Create new FeedbackPage for duplicate (new slug auto-generated)
  const dupFeedbackPage = await FeedbackPage.create({
    campaignId:          duplicate.campaignId,
    userId:              uid,
    businessName:        duplicate.businessName,
    threshold:           duplicate.routing.threshold,
    reviewLink:          duplicate.reviewLink,
    feedbackFormEnabled: duplicate.routing.feedbackFormEnabled,
    feedbackFields:      duplicate.routing.feedbackFields,
    feedbackNote:        duplicate.routing.feedbackNote,
  });

  return success(
    res,
    {
      campaign:        duplicate,
      customersCloned: originalCustomers.length,
      feedbackPage: {
        slug:      dupFeedbackPage.slug,
        publicUrl: dupFeedbackPage.publicUrl,
      },
    },
    201,
    { message: 'Campaign duplicated successfully' }
  );
});

// ═══════════════════════════════════════════════════════════════
// PATCH /api/campaigns/:id/pause
// ═══════════════════════════════════════════════════════════════
const pauseCampaign = asyncHandler(async (req, res) => {
  const { uid } = req.user;
  const { id }  = req.params;

  const campaign = await Campaign.findOne({
    campaignId: id, userId: uid, isDeleted: false,
  });

  if (!campaign) {
    return res.status(404).json({ success: false, message: 'Campaign not found' });
  }

  if (!['running', 'scheduled'].includes(campaign.status)) {
    return res.status(409).json({
      success: false,
      message: `Cannot pause a campaign with status "${campaign.status}"`,
    });
  }

  campaign.status = 'paused';
  await campaign.save();

  return success(res, { campaign }, 200, { message: 'Campaign paused' });
});

// ═══════════════════════════════════════════════════════════════
// PATCH /api/campaigns/:id/resume
// ═══════════════════════════════════════════════════════════════
const resumeCampaign = asyncHandler(async (req, res) => {
  const { uid } = req.user;
  const { id }  = req.params;

  const campaign = await Campaign.findOne({
    campaignId: id, userId: uid, isDeleted: false,
  });

  if (!campaign) {
    return res.status(404).json({ success: false, message: 'Campaign not found' });
  }

  if (campaign.status !== 'paused') {
    return res.status(409).json({
      success: false,
      message: `Cannot resume a campaign with status "${campaign.status}"`,
    });
  }

  const now       = new Date();
  campaign.status = campaign.launch.scheduledAt && campaign.launch.scheduledAt > now
    ? 'scheduled'
    : 'running';

  await campaign.save();

  return success(res, { campaign }, 200, { message: 'Campaign resumed' });
});

module.exports = {
  createCampaign,
  getCampaigns,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
  duplicateCampaign,
  pauseCampaign,
  resumeCampaign,
};