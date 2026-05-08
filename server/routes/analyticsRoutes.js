const express = require('express');
const router  = express.Router();
const { auth } = require('../middlewares/auth');
const {
  getDashboard,
  getCampaignStats,
  getCustomerList,
  getDailyStats,
  getDashboardDaily,
  getQuota,
  exportCustomers,
  logEvent,
  getCacheStats,
} = require('../controllers/analyticsController');

// ── Public ──────────────────────────────────────────────────
// Tracking event (called by email pixel, feedback form)
router.post('/log', logEvent);

// ── Protected ───────────────────────────────────────────────
// Dashboard overview
router.get('/dashboard',        auth, getDashboard);
router.get('/dashboard/daily',  auth, getDashboardDaily);

// Quota
router.get('/quota',            auth, getQuota);

// Per-campaign
router.get('/:campaignId/stats',     auth, getCampaignStats);
router.get('/:campaignId/customers', auth, getCustomerList);
router.get('/:campaignId/daily',     auth, getDailyStats);
router.get('/:campaignId/export',    auth, exportCustomers);

// Dev only
router.get('/cache/stats', auth, getCacheStats);

module.exports = router;