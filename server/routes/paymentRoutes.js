const express = require('express');
const router  = express.Router();
const { auth } = require('../middlewares/auth');
const {
  getPlans,
  createOrder,
  verifyPayment,
  recordFailure,
  getHistory,
  getPaymentStatus,
  handleWebhook,
} = require('../controllers/paymentController');

// ── Public ────────────────────────────────────────────────────

/**
 * GET /api/payments/plans
 * Plan config + Razorpay key (public — needed before login for pricing page)
 */
router.get('/plans', getPlans);

/**
 * POST /api/payments/webhook
 * Razorpay webhook — raw body needed for signature verification
 */
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  handleWebhook
);

// ── Protected ─────────────────────────────────────────────────

/**
 * POST /api/payments/create-order
 * Step 1: Create Razorpay order before showing payment modal
 * Body: { plan, customAmount?, currency? }
 */
router.post('/create-order', auth, createOrder);

/**
 * POST /api/payments/verify
 * Step 2: Verify signature after successful payment
 * Body: { rzpOrderId, rzpPaymentId, rzpSignature, paymentId }
 */
router.post('/verify', auth, verifyPayment);

/**
 * POST /api/payments/failed
 * Record failed/cancelled payment from frontend
 */
router.post('/failed', auth, recordFailure);

/**
 * GET /api/payments/history
 * User's payment history
 */
router.get('/history', auth, getHistory);

/**
 * GET /api/payments/status/:paymentId
 * Check status of a specific payment
 */
router.get('/status/:paymentId', auth, getPaymentStatus);

module.exports = router;