const Campaign     = require('../models/Campaign');
const Customer     = require('../models/Customer');
const CampaignLog  = require('../models/CampaignLog');
const { asyncHandler } = require('../middlewares/asyncHandler');
const { cache, TTL }   = require('../services/cacheService');
const {
  getCampaignBrevoStats,
  getCustomerEmailStats,
  getDashboardOverview,
  getDailyBrevoStats,
  getTodayQuota,
  invalidateCampaignCache,
} = require('../services/brevoAnalyticsService');

const ok = (res, data, meta = {}) =>
  res.status(200).json({ success: true, ...meta, ...data });

// ═══════════════════════════════════════════════════════════════
// GET /api/analytics/dashboard
// Full dashboard overview — all campaigns combined
// Cache: 1 min
// ═══════════════════════════════════════════════════════════════
const getDashboard = asyncHandler(async (req, res) => {
  const { uid } = req.user;

  const overview = await getDashboardOverview(uid);
  const quota    = await getTodayQuota();

  return ok(res, { overview, quota });
});

// ═══════════════════════════════════════════════════════════════
// GET /api/analytics/:campaignId/stats
// Full stats for one campaign — Brevo + DB combined
// Cache: 2 min
// ═══════════════════════════════════════════════════════════════
const getCampaignStats = asyncHandler(async (req, res) => {
  const { uid }        = req.user;
  const { campaignId } = req.params;

  // Ownership check — cached too
  const campaignCacheKey = `campaign:meta:${campaignId}:${uid}`;
  let campaign = cache.get(campaignCacheKey);

  if (!campaign) {
    campaign = await Campaign.findOne({
      campaignId, userId: uid, isDeleted: false,
    }).lean();

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }
    cache.set(campaignCacheKey, campaign, TTL.CAMPAIGN_STATS);
  }

  // Fetch Brevo stats (cached inside service)
  const [brevoStats, customerStats] = await Promise.all([
    getCampaignBrevoStats(campaignId),
    Customer.getStatsForCampaign(campaignId),
  ]);

  const agg      = brevoStats.aggregated || {};
  const sent     = agg.requests   || customerStats.sent     || 0;
  const delivered= agg.delivered  || customerStats.delivered|| 0;

  // Computed rates
  const rates = {
    deliveryRate:  sent      > 0 ? Math.round((delivered                     / sent)      * 100) : 0,
    openRate:      delivered > 0 ? Math.round(((agg.uniqueOpens     || 0)   / delivered)  * 100) : 0,
    clickRate:     delivered > 0 ? Math.round(((agg.uniqueClicks    || 0)   / delivered)  * 100) : 0,
    bounceRate:    sent      > 0 ? Math.round((((agg.hardBounces||0)+(agg.softBounces||0))/ sent) * 100) : 0,
    unsubRate:     delivered > 0 ? Math.round(((agg.unsubscriptions || 0)   / delivered)  * 100) : 0,
    spamRate:      delivered > 0 ? Math.round(((agg.spamReports     || 0)   / delivered)  * 100) : 0,
  };

  return ok(res, {
    campaign: {
      campaignId:   campaign.campaignId,
      campaignName: campaign.campaignName,
      businessName: campaign.businessName,
      status:       campaign.status,
      channel:      campaign.channel,
      platform:     campaign.platform,
      createdAt:    campaign.createdAt,
      scheduledAt:  campaign.launch?.scheduledAt,
      startedAt:    campaign.launch?.startedAt,
      completedAt:  campaign.launch?.completedAt,
    },
    overview: {
      totalCustomers:    customerStats.total      || 0,
      sent:              sent,
      delivered:         delivered,
      uniqueOpens:       agg.uniqueOpens           || 0,
      opens:             agg.opens                 || 0,
      uniqueClicks:      agg.uniqueClicks          || 0,
      clicks:            agg.clicks                || 0,
      hardBounces:       agg.hardBounces           || 0,
      softBounces:       agg.softBounces           || 0,
      unsubscriptions:   agg.unsubscriptions       || 0,
      spamReports:       agg.spamReports           || 0,
      blocked:           agg.blocked               || 0,
      failed:            customerStats.failed      || 0,
      positiveRouted:    customerStats.positiveRouted || 0,
      negativeRouted:    customerStats.negativeRouted || 0,
      feedbackCount:     customerStats.feedbackCount  || 0,
      avgStarRating:     customerStats.avgRating ? Math.round(customerStats.avgRating * 10) / 10 : null,
    },
    rates,
    source:    brevoStats.source    || 'database',
    fromCache: brevoStats.fromCache || false,
    fetchedAt: brevoStats.fetchedAt,
  });
});

// ═══════════════════════════════════════════════════════════════
// GET /api/analytics/:campaignId/customers
// Per-customer email status — paginated
// Cache: 3 min
// ═══════════════════════════════════════════════════════════════
const getCustomerList = asyncHandler(async (req, res) => {
  const { uid }        = req.user;
  const { campaignId } = req.params;
  const {
    page     = 1,
    limit    = 20,
    status,
    routing,
    search,
    opened,
    clicked,
    feedback,
  } = req.query;

  // Ownership check
  const campaign = await Campaign.findOne({
    campaignId, userId: uid, isDeleted: false,
  }).lean();

  if (!campaign) {
    return res.status(404).json({ success: false, message: 'Campaign not found' });
  }

  // Build filter
  const filter = { campaignId, isDeleted: false };
  if (status)   filter.status         = status;
  if (routing)  filter.routingOutcome  = routing;
  if (opened === 'true')   filter.emailOpened       = true;
  if (clicked === 'true')  filter.linkClicked        = true;
  if (feedback === 'true') filter.feedbackSubmitted  = true;
  if (search) {
    const r = new RegExp(search.trim(), 'i');
    filter.$or = [{ name: r }, { email: r }, { phone: r }];
  }

  // Cache key includes all filter params
  const cacheKey = `analytics:customers:${campaignId}:${JSON.stringify({ page, limit, status, routing, search, opened, clicked, feedback })}`;

  const cached = cache.get(cacheKey);
  if (cached) {
    return ok(res, { ...cached, fromCache: true });
  }

  const pageNum  = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip     = (pageNum - 1) * limitNum;

  const [customers, total] = await Promise.all([
    Customer.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select('-externalIds -__v')
      .lean({ virtuals: true }),
    Customer.countDocuments(filter),
  ]);

  const result = {
    customers,
    pagination: {
      page:       pageNum,
      limit:      limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasNext:    pageNum < Math.ceil(total / limitNum),
      hasPrev:    pageNum > 1,
    },
    fromCache: false,
  };

  cache.set(cacheKey, result, TTL.CUSTOMER_LIST);
  return ok(res, result);
});

// ═══════════════════════════════════════════════════════════════
// GET /api/analytics/:campaignId/daily
// Daily stats for chart — last N days
// Cache: 5 min
// ═══════════════════════════════════════════════════════════════
const getDailyStats = asyncHandler(async (req, res) => {
  const { uid }        = req.user;
  const { campaignId } = req.params;
  const { days = 30 }  = req.query;

  const campaign = await Campaign.findOne({
    campaignId, userId: uid, isDeleted: false,
  }).lean();

  if (!campaign) {
    return res.status(404).json({ success: false, message: 'Campaign not found' });
  }

  const { data, fromCache } = await getDailyBrevoStats(uid, parseInt(days, 10));

  return ok(res, { dailyStats: data, fromCache });
});

// ═══════════════════════════════════════════════════════════════
// GET /api/analytics/dashboard/daily
// Daily stats for dashboard chart
// ═══════════════════════════════════════════════════════════════
const getDashboardDaily = asyncHandler(async (req, res) => {
  const { uid }       = req.user;
  const { days = 30 } = req.query;

  const { data, fromCache } = await getDailyBrevoStats(uid, parseInt(days, 10));

  return ok(res, { dailyStats: data, fromCache });
});

// ═══════════════════════════════════════════════════════════════
// GET /api/analytics/quota
// Today's Brevo sending quota
// Cache: 1 min
// ═══════════════════════════════════════════════════════════════
const getQuota = asyncHandler(async (req, res) => {
  const quota = await getTodayQuota();
  return ok(res, { quota });
});

// ═══════════════════════════════════════════════════════════════
// GET /api/analytics/:campaignId/export
// Export customers as CSV
// ═══════════════════════════════════════════════════════════════
const exportCustomers = asyncHandler(async (req, res) => {
  const { uid }        = req.user;
  const { campaignId } = req.params;

  const campaign = await Campaign.findOne({
    campaignId, userId: uid, isDeleted: false,
  }).lean();

  if (!campaign) {
    return res.status(404).json({ success: false, message: 'Campaign not found' });
  }

  const customers = await Customer.find({ campaignId, isDeleted: false })
    .sort({ createdAt: -1 })
    .lean();

  const headers = [
    'Name', 'Email', 'Phone', 'Status',
    'Email Opened', 'Link Clicked', 'Star Rating',
    'Routing', 'Feedback Submitted', 'Feedback Text',
    'Sent At', 'Delivered At',
  ];

  const rows = customers.map((c) => [
    c.name                    || '',
    c.email                   || '',
    c.phone                   || '',
    c.status                  || '',
    c.emailOpened    ? 'Yes'  : 'No',
    c.linkClicked    ? 'Yes'  : 'No',
    c.starRating               ?? '',
    c.routingOutcome           || '',
    c.feedbackSubmitted ? 'Yes': 'No',
    (c.feedbackText || '').replace(/,/g, ';').replace(/\n/g, ' '),
    c.sentAt      ? new Date(c.sentAt).toISOString()      : '',
    c.deliveredAt ? new Date(c.deliveredAt).toISOString() : '',
  ]);

  const escape  = (v) => (String(v).includes(',') ? `"${v}"` : v);
  const csv     = [headers, ...rows].map((r) => r.map(escape).join(',')).join('\n');
  const filename = `${campaign.campaignName.replace(/[^a-z0-9]/gi, '_')}_customers.csv`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(csv);
});

// ═══════════════════════════════════════════════════════════════
// POST /api/analytics/log
// Record tracking event + invalidate cache
// ═══════════════════════════════════════════════════════════════
const logEvent = asyncHandler(async (req, res) => {
  const { campaignId, customerId, eventType, channel, metadata = {} } = req.body;

  if (!campaignId || !customerId || !eventType) {
    return res.status(400).json({
      success: false,
      message: 'campaignId, customerId, eventType required',
    });
  }

  const customer = await Customer.findOne({ customerId, campaignId });
  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }

  const userId    = customer.userId;
  const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
  const userAgent = req.headers['user-agent'] || null;

  switch (eventType) {
    case 'email_opened':
      if (!customer.emailOpened) {
        customer.emailOpened   = true;
        customer.emailOpenedAt = new Date();
      }
      customer.emailOpenCount = (customer.emailOpenCount || 0) + 1;
      await customer.save();
      await Campaign.incrementStat(campaignId, 'totalOpened');
      break;

    case 'link_clicked':
      if (!customer.linkClicked) {
        customer.linkClicked   = true;
        customer.linkClickedAt = new Date();
      }
      customer.linkClickCount = (customer.linkClickCount || 0) + 1;
      await customer.save();
      await Campaign.incrementStat(campaignId, 'totalClicked');
      break;

    case 'delivered':
      customer.status      = 'delivered';
      customer.deliveredAt = new Date();
      await customer.save();
      await Campaign.incrementStat(campaignId, 'totalDelivered');
      break;

    case 'bounced':
      customer.status   = 'bounced';
      customer.failedAt = new Date();
      await customer.save();
      await Campaign.incrementStat(campaignId, 'totalBounced');
      break;

    case 'failed':
      customer.status     = 'failed';
      customer.failedAt   = new Date();
      customer.failReason = metadata.errorMessage || 'Unknown';
      await customer.save();
      await Campaign.incrementStat(campaignId, 'totalFailed');
      break;

    case 'unsubscribed':
      customer.status = 'unsubscribed';
      await customer.save();
      break;
  }

  // Save log
  await CampaignLog.record({
    campaignId, customerId, userId,
    eventType,
    channel:  channel || null,
    metadata: { ...metadata, ipAddress, userAgent },
  });

  // Invalidate cache for this campaign
  invalidateCampaignCache(campaignId);

  return ok(res, {}, 200, { message: 'Event logged' });
});

// ═══════════════════════════════════════════════════════════════
// GET /api/analytics/cache/stats  (dev only)
// ═══════════════════════════════════════════════════════════════
const getCacheStats = asyncHandler(async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, message: 'Not available in production' });
  }
  return ok(res, { cache: cache.stats() });
});

module.exports = {
  getDashboard,
  getCampaignStats,
  getCustomerList,
  getDailyStats,
  getDashboardDaily,
  getQuota,
  exportCustomers,
  logEvent,
  getCacheStats,
};