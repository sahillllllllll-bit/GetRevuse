const express = require('express');
const router  = express.Router();

const { auth }                       = require('../middlewares/auth');
const { verifyLemonSqueezyWebhook }  = require('../middlewares/webhookVerify');
const {
  createCheckout,
  handleWebhook,
  getPaymentHistory,
  verifyPayment,
  getPlans,
} = require('../controllers/paymentController');

// ── Public ────────────────────────────────────────────────────

/**
 * GET /api/payments/plans
 * Returns plan config — credits, prices, discounts
 * Public so pricing page loads without auth
 */
router.get('/plans', getPlans);

/**
 * POST /api/payments/webhook
 * LemonSqueezy webhook — must use raw body for sig verification
 * IMPORTANT: register BEFORE express.json() in app.js
 */
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  verifyLemonSqueezyWebhook,
  handleWebhook
);

// ── Protected (require auth) ──────────────────────────────────

/**
 * POST /api/payments/checkout
 * Create checkout session
 * Body: { plan: 'pro'|'growth'|'custom', customAmount?: number }
 */
router.post('/checkout', auth, createCheckout);

/**
 * GET /api/payments/history
 * User's payment history
 */
router.get('/history', auth, getPaymentHistory);

/**
 * GET /api/payments/verify?pid=xxx
 * Verify payment after redirect from LemonSqueezy
 */
router.get('/verify', auth, verifyPayment);

module.exports = router;