const express = require('express');
const router  = express.Router();

const { auth }                   = require('../middlewares/auth');
const { validateCampaign,
        validateCampaignUpdate } = require('../middlewares/validate');
const {
  createCampaign,
  getCampaigns,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
  duplicateCampaign,
  pauseCampaign,
  resumeCampaign,
} = require('../controllers/campaignController');

const {
  launchCampaign,
  getCampaignSendStatus,
} = require('../controllers/sendController');

// All routes require authentication
router.use(auth);

// ─── CRUD ─────────────────────────────────────────────────────

/**
 * POST /api/campaigns
 * Create campaign + bulk insert customers.
 * If schedule = "now" → immediately checks credits, creates FeedbackPage,
 * queues all send jobs, and sets status = "running".
 * For any other schedule → saves as "scheduled", jobs queued on launch.
 */
router.post('/', validateCampaign, createCampaign);

/**
 * GET /api/campaigns
 * List all campaigns for logged-in user.
 * Query: page, limit, status, channel, platform, search, sortBy, sortOrder
 * Response includes feedbackSlug for each campaign.
 */
router.get('/', getCampaigns);

/**
 * GET /api/campaigns/:id
 * Get single campaign — includes customerStats + feedbackPage.
 */
router.get('/:id', getCampaignById);

/**
 * PUT /api/campaigns/:id
 * Update campaign fields (draft or paused only).
 * Also syncs FeedbackPage if routing/reviewLink/businessName changed.
 */
router.put('/:id', validateCampaignUpdate, updateCampaign);

/**
 * DELETE /api/campaigns/:id
 * Soft delete — sets isDeleted=true, status=cancelled.
 * Also deactivates the linked FeedbackPage.
 */
router.delete('/:id', deleteCampaign);

// ─── ACTIONS ──────────────────────────────────────────────────

/**
 * POST /api/campaigns/:id/launch
 * Manually launch a draft or scheduled campaign.
 * - Validates credits
 * - Creates FeedbackPage if not already exists
 * - Queues all pending customers as BullMQ jobs
 * - Sets campaign status = "running" or "scheduled"
 *
 * Use this for campaigns saved with schedule != "now",
 * or when relaunching a draft from the dashboard.
 */
router.post('/:id/launch', launchCampaign);

/**
 * GET /api/campaigns/:id/status
 * Poll send progress: { status, progress%, counts: { total, sent, failed, queued } }
 * Auto-marks campaign as "completed" when all jobs are done.
 */
router.get('/:id/status', getCampaignSendStatus);

/**
 * POST /api/campaigns/:id/duplicate
 * Clone campaign + all customers (reset to pending).
 * Creates a new FeedbackPage with a new slug.
 * Cloned campaign starts as "draft".
 */
router.post('/:id/duplicate', duplicateCampaign);

/**
 * PATCH /api/campaigns/:id/pause
 * Pause a running or scheduled campaign.
 * Jobs already in the queue will finish; new ones won't be processed
 * (handled by worker checking campaign status before sending).
 */
router.patch('/:id/pause', pauseCampaign);

/**
 * PATCH /api/campaigns/:id/resume
 * Resume a paused campaign.
 * Sets status back to "running" or "scheduled" based on scheduledAt.
 */
router.patch('/:id/resume', resumeCampaign);

module.exports = router;