const FeedbackPage       = require('../models/FeedbackPage');
const FeedbackSubmission = require('../models/FeedbackSubmission');
const Customer           = require('../models/Customer');
const Campaign           = require('../models/Campaign');
const CampaignLog        = require('../models/CampaignLog');
const { asyncHandler }   = require('../middlewares/asyncHandler');

const success = (res, data, code = 200, meta = {}) =>
  res.status(code).json({ success: true, ...meta, ...data });

// ═══════════════════════════════════════════════════════════════
// GET /api/f/:slug
// Public: Get feedback page config (for rendering rating/form)
// ═══════════════════════════════════════════════════════════════
const getPublicFeedbackPage = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const { cid }  = req.query;   // customerId

  const page = await FeedbackPage.findOne({ slug, active: true }).lean();
  if (!page) {
    return res.status(404).json({ success: false, message: 'Page not found' });
  }

  // Optional: validate customer belongs to this campaign
  let customer = null;
  if (cid) {
    customer = await Customer.findOne({
      customerId: cid,
      campaignId: page.campaignId,
    }).select('name customerId status starRating routingOutcome').lean();
  }

  return success(res, {
    page: {
      slug:                page.slug,
      businessName:        page.businessName,
      logoUrl:             page.logoUrl,
      primaryColor:        page.primaryColor,
      threshold:           page.threshold,
      feedbackFormEnabled: page.feedbackFormEnabled,
      feedbackFields:      page.feedbackFields,
      feedbackNote:        page.feedbackNote,
      positiveThankYouMsg: page.positiveThankYouMsg,
      negativeThankYouMsg: page.negativeThankYouMsg,
    },
    customer: customer ? {
      customerId:     customer.customerId,
      name:           customer.name,
      alreadyRated:   !!customer.starRating,
      routingOutcome: customer.routingOutcome,
    } : null,
  });
});

// ═══════════════════════════════════════════════════════════════
// POST /api/f/:slug/rate
// Public: Customer submits star rating → returns routing destination
// ═══════════════════════════════════════════════════════════════
const submitRating = asyncHandler(async (req, res) => {
  const { slug }      = req.params;
  const { cid, stars } = req.body;

  // Always parse stars as integer — body may send string
  const starsNum = parseInt(stars, 10);

  // ── Validate stars (required) ─────────────────────────────────
  // cid is optional — customer may not be tracked if URL didn't include it
  if (!starsNum || starsNum < 1 || starsNum > 5) {
    return res.status(400).json({
      success: false,
      message: 'stars (1-5) is required',
    });
  }

  const page = await FeedbackPage.findOne({ slug, active: true }).lean();
  if (!page) {
    return res.status(404).json({ success: false, message: 'Page not found' });
  }

  // ── Update customer record if cid provided ────────────────────
  // (customer may be tracked or anonymous)
  if (cid) {
    const customer = await Customer.findOne({ customerId: cid, campaignId: page.campaignId });
    if (customer) {
      customer.starRating     = starsNum;
      customer.routingOutcome = starsNum >= page.threshold ? 'positive' : 'negative';
      customer.linkClicked    = true;
      customer.linkClickedAt  = new Date();
      await customer.save();

      // Log the event (only if customer exists with valid cid)
      try {
        await CampaignLog.record({
          campaignId: page.campaignId,
          customerId: cid,
          userId:     page.userId,
          eventType:  'star_rated',
          channel:    'system',
          metadata:   {
            starRating: starsNum,
            routedTo:   customer.routingOutcome === 'positive' ? 'review_link' : 'feedback_form',
          },
        });
      } catch (logErr) {
        console.error('[submitRating] CampaignLog error:', logErr.message);
        // Don't fail the whole request if logging fails
      }

      // Increment campaign stat
      const statField = customer.routingOutcome === 'positive'
        ? 'totalPositiveRouted'
        : 'totalNegativeRouted';
      await Campaign.incrementStat(page.campaignId, statField);
    }
  }

  // ── Route based on FeedbackPage threshold ──────────────────────
  // (works even without customer tracking)
  const isPositive  = starsNum >= page.threshold;
  const destination = isPositive ? 'review_link' : 'feedback_form';

  return success(res, {
    destination,
    reviewLink:          isPositive ? page.reviewLink : null,
    feedbackFormEnabled: page.feedbackFormEnabled,
    positiveThankYouMsg: page.positiveThankYouMsg,
    negativeThankYouMsg: page.negativeThankYouMsg,
  });
});

// ═══════════════════════════════════════════════════════════════
// POST /api/f/:slug/submit
// Public: Customer submits feedback form
// ═══════════════════════════════════════════════════════════════
const submitFeedback = asyncHandler(async (req, res) => {
  const { slug }   = req.params;
  const { cid, starRating, fields = {} } = req.body;

  const page = await FeedbackPage.findOne({ slug, active: true }).lean();
  if (!page) {
    return res.status(404).json({ success: false, message: 'Page not found' });
  }

  // Always parse starRating as integer — body may send string
  const starRatingNum = parseInt(starRating, 10);

  if (!starRatingNum || starRatingNum < 1 || starRatingNum > 5) {
    return res.status(400).json({ success: false, message: 'Star rating (1-5) is required' });
  }

  const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
  const userAgent = req.headers['user-agent'] || null;

  const isPositive = starRatingNum >= page.threshold;

  // Save submission
  const submission = await FeedbackSubmission.create({
    campaignId:     page.campaignId,
    customerId:     cid || null,
    userId:         page.userId,
    slug,
    starRating:     starRatingNum,
    routingOutcome: isPositive ? 'positive' : 'negative',
    fields: {
      name:    fields.name    || null,
      email:   fields.email   || null,
      phone:   fields.phone   || null,
      message: fields.message || null,
      order:   fields.order   || null,
    },
    ipAddress,
    userAgent,
  });

  // Update customer record
  if (cid) {
    const customer = await Customer.findOne({ customerId: cid });
    if (customer) {
      customer.feedbackSubmitted   = true;
      customer.feedbackSubmittedAt = new Date();
      customer.feedbackText        = fields.message || null;
      await customer.save();
    }
  }

  // Log event
  await CampaignLog.record({
    campaignId: page.campaignId,
    customerId: cid || 'anonymous',
    userId:     page.userId,
    eventType:  'feedback_submitted',
    channel:    null,
    metadata:   {
      starRating: starRatingNum,
      feedbackText: fields.message || null,
      ipAddress,
    },
  });

  // Increment campaign stats based on routing outcome
  const statField = isPositive ? 'totalPositiveRouted' : 'totalNegativeRouted';
  await Campaign.incrementStat(page.campaignId, statField);
  await Campaign.incrementStat(page.campaignId, 'totalFeedback');

  return success(res, {
    submissionId:        submission.submissionId,
    negativeThankYouMsg: page.negativeThankYouMsg,
  }, 201, { message: 'Feedback submitted successfully' });
});

// ═══════════════════════════════════════════════════════════════
// GET /api/feedback  (dashboard)
// Auth: Get all feedback submissions for logged-in user
// ═══════════════════════════════════════════════════════════════
const getFeedbackList = asyncHandler(async (req, res) => {
  const { uid } = req.user;
  const {
    page       = 1,
    limit      = 20,
    campaignId,
    status,
    minRating,
    maxRating,
    routing,
  } = req.query;

  const filter = { userId: uid };
  if (campaignId) filter.campaignId    = campaignId;
  if (status)     filter.status        = status;
  if (routing)    filter.routingOutcome = routing;
  if (minRating || maxRating) {
    filter.starRating = {};
    if (minRating) filter.starRating.$gte = Number(minRating);
    if (maxRating) filter.starRating.$lte = Number(maxRating);
  }

  const pageNum  = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
  const skip     = (pageNum - 1) * limitNum;

  const [submissions, total, stats] = await Promise.all([
    FeedbackSubmission.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    FeedbackSubmission.countDocuments(filter),
    FeedbackSubmission.getDashboardStats(uid),
  ]);

  return success(res, {
    submissions,
    stats:  stats[0] || { total: 0, newCount: 0, avgRating: null, negative: 0, positive: 0 },
    pagination: {
      page:      pageNum,
      limit:     limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

// ═══════════════════════════════════════════════════════════════
// PATCH /api/feedback/:id/status
// Auth: Mark feedback as read or resolved
// ═══════════════════════════════════════════════════════════════
const updateFeedbackStatus = asyncHandler(async (req, res) => {
  const { uid } = req.user;
  const { id }  = req.params;
  const { status, ownerNote } = req.body;

  if (!['read', 'resolved'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Status must be "read" or "resolved"' });
  }

  const submission = await FeedbackSubmission.findOne({ submissionId: id, userId: uid });
  if (!submission) {
    return res.status(404).json({ success: false, message: 'Submission not found' });
  }

  submission.status = status;
  if (ownerNote) submission.ownerNote = ownerNote;
  if (status === 'resolved') submission.resolvedAt = new Date();
  await submission.save();

  return success(res, { submission }, 200, { message: 'Feedback status updated' });
});

module.exports = {
  getPublicFeedbackPage,
  submitRating,
  submitFeedback,
  getFeedbackList,
  updateFeedbackStatus,
};