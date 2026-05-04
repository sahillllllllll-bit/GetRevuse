const express = require('express');
const router  = express.Router();

const { auth, optionalAuth }  = require('../middlewares/auth');
const {
  getCampaignStats,
  getCustomerList,
  exportCustomers,
  logEvent,
  getCampaignLogs,
} = require('../controllers/analyticsController');

// ─── Protected analytics routes (require auth) ────────────────────────────────

/**
 * GET /api/analytics/:campaignId/stats
 * Full analytics summary: overview counts, rates, event summary, daily chart data
 */
router.get('/:campaignId/stats', auth, getCampaignStats);

/**
 * GET /api/analytics/:campaignId/customers
 * Paginated customer list with filters
 * Query: page, limit, status, routing, search, opened, clicked, feedback
 */
router.get('/:campaignId/customers', auth, getCustomerList);

/**
 * GET /api/analytics/:campaignId/export
 * Download all customers as CSV
 */
router.get('/:campaignId/export', auth, exportCustomers);

/**
 * GET /api/analytics/:campaignId/logs
 * Paginated event log for a campaign
 * Query: page, limit, eventType, customerId
 */
router.get('/:campaignId/logs', auth, getCampaignLogs);

// ─── Public / semi-public tracking endpoint ───────────────────────────────────

/**
 * POST /api/analytics/log
 * Record a tracking event from email pixel, redirect, or feedback form.
 *
 * This endpoint does NOT require full auth — it's called by:
 *   - Email tracking pixels (no user session)
 *   - Review link redirect handler
 *   - Feedback form submit
 *
 * Body: { campaignId, customerId, eventType, channel?, metadata? }
 *
 * eventType options:
 *   email_opened | link_clicked | star_rated | feedback_submitted
 *   delivered | bounced | failed | unsubscribed
 */
router.post('/log', logEvent);

module.exports = router;