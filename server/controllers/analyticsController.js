const Campaign    = require('../models/Campaign');
const Customer    = require('../models/Customer');
const CampaignLog = require('../models/CampaignLog');
const { asyncHandler } = require('../middlewares/asyncHandler');

// ─── Helper ───────────────────────────────────────────────────────────────────
const success = (res, data, statusCode = 200, meta = {}) =>
  res.status(statusCode).json({ success: true, ...meta, ...data });

const ITEMS_PER_PAGE = 20;

// ── Ownership guard shared by all analytics endpoints ────────────────────────
const getCampaignOrFail = async (campaignId, userId, res) => {
  const campaign = await Campaign.findOne({
    campaignId,
    userId,
    isDeleted: false,
  }).lean();

  if (!campaign) {
    res.status(404).json({ success: false, message: 'Campaign not found' });
    return null;
  }
  return campaign;
};

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/analytics/:campaignId/stats
// Full analytics summary for a campaign
// ═══════════════════════════════════════════════════════════════════════════════
const getCampaignStats = asyncHandler(async (req, res) => {
  const { uid }        = req.user;
  const { campaignId } = req.params;

  const campaign = await getCampaignOrFail(campaignId, uid, res);
  if (!campaign) return;

  // Live aggregated stats from Customer collection
  const customerStats = await Customer.getStatsForCampaign(campaignId);

  // Event summary from CampaignLog
  const eventSummary = await CampaignLog.getEventSummary(campaignId);

  // Daily stats for the last 7 days (chart data)
  const dailyStats = await CampaignLog.getDailyStats(campaignId, 7);

  // ── Compute rates ───────────────────────────────────────────
  const totalSent      = customerStats.sent + customerStats.delivered;
  const deliveryRate   = totalSent > 0
    ? Math.round((customerStats.delivered / totalSent) * 100)
    : 0;

  const openRate       = customerStats.delivered > 0
    ? Math.round((customerStats.opened / customerStats.delivered) * 100)
    : 0;

  const clickRate      = customerStats.delivered > 0
    ? Math.round((customerStats.clicked / customerStats.delivered) * 100)
    : 0;

  const feedbackRate   = customerStats.negativeRouted > 0
    ? Math.round((customerStats.feedbackCount / customerStats.negativeRouted) * 100)
    : 0;

  const positiveRate   = customerStats.total > 0
    ? Math.round((customerStats.positiveRouted / customerStats.total) * 100)
    : 0;

  // ── Format daily stats for charting ─────────────────────────
  // Transform array to map: { '2025-01-15': { sent: 10, opened: 8, ... } }
  const dailyMap = {};
  dailyStats.forEach(({ _id, count }) => {
    if (!dailyMap[_id.date]) dailyMap[_id.date] = {};
    dailyMap[_id.date][_id.eventType] = count;
  });

  return success(res, {
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
      totalCustomers:   customerStats.total,
      totalSent:        customerStats.sent,
      totalDelivered:   customerStats.delivered,
      totalFailed:      customerStats.failed,
      totalBounced:     customerStats.bounced,
      totalPending:     customerStats.pending,
      totalOpened:      customerStats.opened,
      totalClicked:     customerStats.clicked,
      totalFeedback:    customerStats.feedbackCount,
      positiveRouted:   customerStats.positiveRouted,
      negativeRouted:   customerStats.negativeRouted,
      avgStarRating:    customerStats.avgRating
        ? Math.round(customerStats.avgRating * 10) / 10
        : null,
    },
    rates: {
      deliveryRate,
      openRate,
      clickRate,
      feedbackRate,
      positiveRate,
    },
    eventSummary,
    dailyStats: dailyMap,
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/analytics/:campaignId/customers
// Paginated customer list with filters
// ═══════════════════════════════════════════════════════════════════════════════
const getCustomerList = asyncHandler(async (req, res) => {
  const { uid }        = req.user;
  const { campaignId } = req.params;
  const {
    page    = 1,
    limit   = ITEMS_PER_PAGE,
    status,
    routing,
    search,
    opened,
    clicked,
    feedback,
  } = req.query;

  const campaign = await getCampaignOrFail(campaignId, uid, res);
  if (!campaign) return;

  // ── Build filter ────────────────────────────────────────────
  const filter = { campaignId, isDeleted: false };

  if (status  && status  !== 'all') filter.status         = status;
  if (routing && routing !== 'all') filter.routingOutcome = routing;
  if (opened  === 'true')           filter.emailOpened    = true;
  if (clicked === 'true')           filter.linkClicked    = true;
  if (feedback === 'true')          filter.feedbackSubmitted = true;

  if (search) {
    const regex = new RegExp(search.trim(), 'i');
    filter.$or  = [{ name: regex }, { email: regex }, { phone: regex }];
  }

  // ── Pagination ──────────────────────────────────────────────
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

  return success(res, {
    customers,
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

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/analytics/:campaignId/export
// Export customer list as CSV download
// ═══════════════════════════════════════════════════════════════════════════════
const exportCustomers = asyncHandler(async (req, res) => {
  const { uid }        = req.user;
  const { campaignId } = req.params;

  const campaign = await getCampaignOrFail(campaignId, uid, res);
  if (!campaign) return;

  const customers = await Customer.find({ campaignId, isDeleted: false })
    .sort({ createdAt: -1 })
    .lean();

  // ── Build CSV ───────────────────────────────────────────────
  const headers = [
    'Name', 'Email', 'Phone', 'Status',
    'Email Opened', 'Link Clicked', 'Star Rating',
    'Routing Outcome', 'Feedback Submitted', 'Feedback Text',
    'Sent At', 'Delivered At',
  ];

  const rows = customers.map((c) => [
    c.name                   || '',
    c.email                  || '',
    c.phone                  || '',
    c.status                 || '',
    c.emailOpened ? 'Yes'    : 'No',
    c.linkClicked ? 'Yes'    : 'No',
    c.starRating             ?? '',
    c.routingOutcome         || '',
    c.feedbackSubmitted ? 'Yes' : 'No',
    (c.feedbackText || '').replace(/,/g, ';').replace(/\n/g, ' '),
    c.sentAt      ? new Date(c.sentAt).toISOString()      : '',
    c.deliveredAt ? new Date(c.deliveredAt).toISOString() : '',
  ]);

  const escape = (v) => (String(v).includes(',') ? `"${v}"` : v);
  const csvLines = [
    headers.map(escape).join(','),
    ...rows.map((r) => r.map(escape).join(',')),
  ];

  const csv      = csvLines.join('\n');
  const filename = `${campaign.campaignName.replace(/[^a-z0-9]/gi, '_')}_customers.csv`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(csv);
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/analytics/log
// Record a tracking event (open, click, rating, feedback)
// This is called by tracking pixels, redirect links, and feedback form
// ═══════════════════════════════════════════════════════════════════════════════
const logEvent = asyncHandler(async (req, res) => {
  const {
    campaignId,
    customerId,
    eventType,
    channel,
    metadata = {},
  } = req.body;

  // Basic validation
  if (!campaignId || !customerId || !eventType) {
    return res.status(400).json({
      success: false,
      message: 'campaignId, customerId, and eventType are required',
    });
  }

  // Find customer to get userId (log endpoint is semi-public — no auth required)
  const customer = await Customer.findOne({ customerId, campaignId });
  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }

  const userId = customer.userId;

  // Capture request context
  const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
  const userAgent = req.headers['user-agent'] || null;

  // ── Handle each event type ──────────────────────────────────
  switch (eventType) {

    case 'email_opened': {
      await customer.markEmailOpened();
      await Campaign.incrementStat(campaignId, 'totalOpened');
      break;
    }

    case 'link_clicked': {
      await customer.markLinkClicked();
      await Campaign.incrementStat(campaignId, 'totalClicked');
      break;
    }

    case 'star_rated': {
      const { starRating } = metadata;
      if (!starRating || starRating < 1 || starRating > 5) {
        return res.status(400).json({
          success: false,
          message: 'starRating (1–5) is required for star_rated events',
        });
      }

      // Get campaign to know threshold
      const campaign = await Campaign.findOne({ campaignId }).lean();
      if (!campaign) {
        return res.status(404).json({ success: false, message: 'Campaign not found' });
      }

      await customer.recordRating(starRating, campaign.routing.threshold);

      // Increment appropriate routing counter
      const isPositive = starRating >= campaign.routing.threshold;
      await Campaign.incrementStat(
        campaignId,
        isPositive ? 'totalPositiveRouted' : 'totalNegativeRouted'
      );

      // Return routing destination so frontend can redirect
      return success(res, {
        routedTo:    isPositive ? 'review_link'    : 'feedback_form',
        destination: isPositive ? campaign.reviewLink : null,
        threshold:   campaign.routing.threshold,
        starRating,
      });
    }

    case 'feedback_submitted': {
      const { feedbackText, feedbackFields } = metadata;
      await customer.markFeedbackSubmitted(feedbackText || null);
      await Campaign.incrementStat(campaignId, 'totalFeedback');
      break;
    }

    case 'delivered': {
      customer.status      = 'delivered';
      customer.deliveredAt = new Date();
      await customer.save();
      await Campaign.incrementStat(campaignId, 'totalDelivered');
      break;
    }

    case 'bounced': {
      customer.status   = 'bounced';
      customer.failedAt = new Date();
      await customer.save();
      await Campaign.incrementStat(campaignId, 'totalBounced');
      break;
    }

    case 'failed': {
      customer.status     = 'failed';
      customer.failedAt   = new Date();
      customer.failReason = metadata.errorMessage || 'Unknown error';
      await customer.save();
      await Campaign.incrementStat(campaignId, 'totalFailed');
      break;
    }

    case 'unsubscribed': {
      customer.status = 'unsubscribed';
      await customer.save();
      break;
    }

    default:
      // Just log unknown events — don't reject
      break;
  }

  // ── Save the log entry ──────────────────────────────────────
  await CampaignLog.record({
    campaignId,
    customerId,
    userId,
    eventType,
    channel: channel || null,
    metadata: {
      ...metadata,
      ipAddress,
      userAgent,
    },
  });

  // Update campaign last activity
  await Campaign.findOneAndUpdate(
    { campaignId },
    { $set: { 'stats.lastActivityAt': new Date() } }
  );

  return success(res, {}, 200, { message: 'Event logged' });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/analytics/:campaignId/logs
// Get detailed event log for a campaign (paginated)
// ═══════════════════════════════════════════════════════════════════════════════
const getCampaignLogs = asyncHandler(async (req, res) => {
  const { uid }        = req.user;
  const { campaignId } = req.params;
  const {
    page      = 1,
    limit     = 50,
    eventType,
    customerId,
  } = req.query;

  const campaign = await getCampaignOrFail(campaignId, uid, res);
  if (!campaign) return;

  const filter = { campaignId };
  if (eventType)  filter.eventType  = eventType;
  if (customerId) filter.customerId = customerId;

  const pageNum  = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip     = (pageNum - 1) * limitNum;

  const [logs, total] = await Promise.all([
    CampaignLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean({ virtuals: true }),
    CampaignLog.countDocuments(filter),
  ]);

  return success(res, {
    logs,
    pagination: {
      page:       pageNum,
      limit:      limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

module.exports = {
  getCampaignStats,
  getCustomerList,
  exportCustomers,
  logEvent,
  getCampaignLogs,
};