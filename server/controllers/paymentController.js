const Razorpay        = require('razorpay');
const crypto          = require('crypto');
const User            = require('../models/User');
const Payment         = require('../models/Payment');
const { asyncHandler} = require('../middlewares/asyncHandler');

// ─── Razorpay instance ────────────────────────────────────────
const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ─── Currency conversion rates (update periodically) ─────────
const EXCHANGE_RATES = {
  USD: 83.5,   // 1 USD = 83.5 INR
  INR: 1,
  EUR: 90.5,
  GBP: 105.0,
};

// ─── Plan config ──────────────────────────────────────────────
const CREDITS_PER_DOLLAR = 30;

const PLANS = {
  starter: {
    name:          'Starter',
    amountUSD:     0,
    credits:       100,
    isFree:        true,
  },
  pro: {
    name:          'Pro',
    amountUSD:     19.99,
    originalUSD:   29.99,
    discountPct:   33,
    credits:       1000,
    isFree:        false,
  },
  growth: {
    name:          'Growth',
    amountUSD:     49.99,
    originalUSD:   74.99,
    discountPct:   33,
    credits:       3000,
    isFree:        false,
  },
};

// ─── Helper: USD → paise ──────────────────────────────────────
function usdToPaise(usd) {
  return Math.round(usd * EXCHANGE_RATES.USD * 100);
}

function currencyToPaise(amount, currency) {
  const rate = EXCHANGE_RATES[currency] || EXCHANGE_RATES.USD;
  return Math.round(amount * rate * 100);
}

const ok = (res, data, code = 200, meta = {}) =>
  res.status(code).json({ success: true, ...meta, ...data });

// ═══════════════════════════════════════════════════════════════
// GET /api/payments/plans
// Return plan config for frontend
// ═══════════════════════════════════════════════════════════════
const getPlans = asyncHandler(async (_req, res) => {
  return ok(res, {
    plans: {
      starter: {
        name:       'Starter',
        amountUSD:  0,
        credits:    100,
        discount:   0,
        isFree:     true,
      },
      pro: {
        name:          'Pro',
        amountUSD:     PLANS.pro.amountUSD,
        originalUSD:   PLANS.pro.originalUSD,
        discountPct:   PLANS.pro.discountPct,
        credits:       PLANS.pro.credits,
        isFree:        false,
      },
      growth: {
        name:          'Growth',
        amountUSD:     PLANS.growth.amountUSD,
        originalUSD:   PLANS.growth.originalUSD,
        discountPct:   PLANS.growth.discountPct,
        credits:       PLANS.growth.credits,
        isFree:        false,
      },
    },
    creditsPerDollar: CREDITS_PER_DOLLAR,
    minCustomAmount:  0.10,
    maxCustomAmount:  999,
    exchangeRates:    EXCHANGE_RATES,
    razorpayKeyId:    process.env.RAZORPAY_KEY_ID,
  });
});

// ═══════════════════════════════════════════════════════════════
// POST /api/payments/create-order
// Create Razorpay order — called before showing payment modal
// Body: { plan, customAmount?, currency? }
// ═══════════════════════════════════════════════════════════════
const createOrder = asyncHandler(async (req, res) => {
  try {
    // ✅ Check if user is attached
    if (!req.user) {
      console.error('[Payment] req.user is undefined!');
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
        code:    'NO_USER',
      });
    }

    const { uid, email } = req.user;
    
    if (!uid) {
      console.error('[Payment] req.user.uid is missing!');
      return res.status(401).json({
        success: false,
        message: 'Invalid user context',
        code:    'NO_UID',
      });
    }

    const { plan, customAmount, currency = 'USD' } = req.body;

    console.log(`[Payment] createOrder called: uid=${uid}, plan=${plan}, amount=${customAmount}, currency=${currency}`);

    // ── Validate ────────────────────────────────────────────────
    if (!plan || !['pro', 'growth', 'custom'].includes(plan)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan. Must be pro, growth, or custom',
      });
    }

    if (!EXCHANGE_RATES[currency]) {
      return res.status(400).json({
        success: false,
        message: `Unsupported currency: ${currency}`,
      });
    }

    let amountUSD, credits, planName, discountPct, originalUSD;

    // ── Custom amount ────────────────────────────────────────────
    if (plan === 'custom') {
      const amt = parseFloat(customAmount);
      if (!amt || isNaN(amt) || amt < 0.10) {
        return res.status(400).json({
          success: false,
          message: 'Minimum custom amount is $0.10',
        });
      }
      if (amt > 999) {
        return res.status(400).json({
          success: false,
          message: 'Maximum custom amount is $999',
        });
      }
      amountUSD = amt;
      credits   = Math.floor(amt * CREDITS_PER_DOLLAR);
      planName  = 'Custom';
      discountPct = 0;
      originalUSD = null;
    } else {
      // ── Standard plan ────────────────────────────────────────
      const cfg = PLANS[plan];
      amountUSD   = cfg.amountUSD;
      credits     = cfg.credits;
      planName    = cfg.name;
      discountPct = cfg.discountPct || 0;
      originalUSD = cfg.originalUSD || null;
    }

    // ── Convert to paise (Razorpay uses smallest currency unit) ──
    const amountPaise = currencyToPaise(amountUSD, currency);

    console.log(`[Payment] Creating Razorpay order: amountPaise=${amountPaise}, credits=${credits}`);

    // ── Create Razorpay order ────────────────────────────────────
    let rzpOrder;
    try {
      rzpOrder = await razorpay.orders.create({
        amount:   amountPaise,
        currency: 'INR',               // Razorpay India uses INR
        receipt:  `rcpt_${Date.now()}`,
        notes: {
          userId:   uid,
          email,
          plan,
          credits:  String(credits),
          amountUSD: String(amountUSD),
        },
      });
      console.log(`[Payment] ✅ Razorpay order created: ${rzpOrder.id}`);
    } catch (rzpErr) {
      console.error('[Payment] Razorpay full error:', JSON.stringify(rzpErr, null, 2));
  console.error('[Payment] Razorpay error keys:', Object.keys(rzpErr));
  console.error('[Payment] statusCode:', rzpErr.statusCode);
  console.error('[Payment] error:', rzpErr.error);

      return res.status(400).json({
        success: false,
        message: 'Failed to create payment order. Please try again.',
        code:    'RZP_ORDER_FAILED',
      });
    }

    // ── Save pending payment to DB ───────────────────────────────
    let payment;
    try {
      payment = await Payment.create({
        userId:            uid,
        email,
        rzpOrderId:        rzpOrder.id,
        plan,
        amountPaise,
        amountUSD,
        displayAmount:     amountUSD,
        currency,
        creditsAdded:      credits,
        discountApplied:   discountPct > 0,
        discountPercent:   discountPct,
        originalAmountUSD: originalUSD,
        isCustomAmount:    plan === 'custom',
        status:            'created',
      });
      console.log(`[Payment] ✅ Payment saved to DB: ${payment.paymentId}`);
    } catch (dbErr) {
      console.error('[Payment] Database save failed:', {
        message: dbErr.message,
        code: dbErr.code,
      });
      return res.status(400).json({
        success: false,
        message: 'Failed to save payment. Please try again.',
        code:    'DB_SAVE_FAILED',
      });
    }

    console.log(`[Payment] Order created: ${rzpOrder.id} for ${email} — ${credits} credits`);

    return ok(res, {
      orderId:      rzpOrder.id,
      paymentId:    payment.paymentId,
      amountPaise,
      amountUSD,
      currency:     'INR',
      credits,
      planName,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      // Display info for modal
      displayCurrency: currency,
      displayAmount:   amountUSD,
      exchangeRate:    EXCHANGE_RATES[currency],
    }, 201);

  } catch (err) {
    // ✅ Catch any unexpected errors
    console.error('[Payment] Unexpected error in createOrder:', {
      message: err.message,
      code: err.code,
      stack: err.stack,
    });
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      code:    'UNEXPECTED_ERROR',
    });
  }
});


// ═══════════════════════════════════════════════════════════════
// POST /api/payments/verify
// Verify Razorpay payment signature after user pays
// Called immediately after payment modal closes successfully
// ═══════════════════════════════════════════════════════════════
const verifyPayment = asyncHandler(async (req, res) => {
  const { uid }  = req.user;
  const {
    rzpOrderId,
    rzpPaymentId,
    rzpSignature,
    paymentId,    // our internal payment doc ID
  } = req.body;

  // ── All fields required ──────────────────────────────────────
  if (!rzpOrderId || !rzpPaymentId || !rzpSignature || !paymentId) {
    return res.status(400).json({
      success: false,
      message: 'Missing payment verification fields',
    });
  }

  // ── Find payment record ──────────────────────────────────────
  const payment = await Payment.findOne({ paymentId, userId: uid });
  if (!payment) {
    return res.status(404).json({
      success: false,
      message: 'Payment record not found',
    });
  }

  // ── Prevent double processing ────────────────────────────────
  if (payment.status === 'paid') {
    const user = await User.findOne({ uid }).select('credits');
    return ok(res, {
      alreadyProcessed: true,
      credits:          payment.creditsAdded,
      currentBalance:   user?.credits || 0,
      payment,
    });
  }

  // ── Verify HMAC signature ────────────────────────────────────
  // Razorpay signs: orderId + "|" + paymentId with key_secret
  const body      = `${rzpOrderId}|${rzpPaymentId}`;
  const expected  = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expected !== rzpSignature) {
    // Signature mismatch — mark as failed
    payment.status        = 'failed';
    payment.failureReason = 'Invalid payment signature';
    payment.processedAt   = new Date();
    await payment.save();

    console.error(`[Payment] Signature mismatch for order ${rzpOrderId}`);

    return res.status(400).json({
      success: false,
      message: 'Payment verification failed. Please contact support.',
      code:    'SIGNATURE_MISMATCH',
    });
  }

  // ── Signature valid — update payment record ──────────────────
  payment.rzpPaymentId = rzpPaymentId;
  payment.rzpSignature = rzpSignature;
  payment.status       = 'paid';
  payment.processedAt  = new Date();
  await payment.save();

  // ── Add credits to user atomically ──────────────────────────
  const credits = payment.creditsAdded;

  const updatedUser = await User.findOneAndUpdate(
    { uid },
    {
      $inc: { credits: credits, creditsUsed: 0 },
      $push: {
        creditLog: {
          $each: [{
            type:         'topup',
            amount:       credits,
            balanceAfter: 0,  // approximate
            note:         `${payment.plan} plan — ${credits} credits via Razorpay`,
            createdAt:    new Date(),
          }],
          $slice: -500,
        },
      },
    },
    { new: true }
  );

  console.log(`[Payment] ✓ Verified: ${rzpPaymentId} — Added ${credits} credits to ${uid}. Balance: ${updatedUser?.credits}`);

  return ok(res, {
    verified:       true,
    credits,
    currentBalance: updatedUser?.credits || 0,
    payment: {
      paymentId:    payment.paymentId,
      plan:         payment.plan,
      amountUSD:    payment.amountUSD,
      creditsAdded: payment.creditsAdded,
      status:       payment.status,
      processedAt:  payment.processedAt,
    },
  });
});

// ═══════════════════════════════════════════════════════════════
// POST /api/payments/failed
// Record failed payment from frontend
// ═══════════════════════════════════════════════════════════════
const recordFailure = asyncHandler(async (req, res) => {
  const { uid }  = req.user;
  const { paymentId, rzpOrderId, reason, code } = req.body;

  if (!paymentId) {
    return res.status(400).json({ success: false, message: 'paymentId required' });
  }

  await Payment.findOneAndUpdate(
    { paymentId, userId: uid },
    {
      $set: {
        status:        'failed',
        failureReason: reason || 'Payment cancelled or failed',
        processedAt:   new Date(),
      },
    }
  );

  console.log(`[Payment] Failed: order ${rzpOrderId} — ${reason}`);

  return ok(res, {}, 200, { message: 'Failure recorded' });
});

// ═══════════════════════════════════════════════════════════════
// GET /api/payments/history
// User's payment history
// ═══════════════════════════════════════════════════════════════
const getHistory = asyncHandler(async (req, res) => {
  const { uid } = req.user;

  const payments = await Payment.find({ userId: uid })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean({ virtuals: true });

  return ok(res, { payments });
});

// ═══════════════════════════════════════════════════════════════
// GET /api/payments/status/:paymentId
// Check status of a specific payment
// ═══════════════════════════════════════════════════════════════
const getPaymentStatus = asyncHandler(async (req, res) => {
  const { uid }       = req.user;
  const { paymentId } = req.params;

  const payment = await Payment.findOne({ paymentId, userId: uid })
    .lean({ virtuals: true });

  if (!payment) {
    return res.status(404).json({ success: false, message: 'Payment not found' });
  }

  const user = await User.findOne({ uid }).select('credits');

  return ok(res, {
    payment,
    currentBalance: user?.credits || 0,
  });
});

// ═══════════════════════════════════════════════════════════════
// POST /api/payments/webhook
// Razorpay webhook for server-side payment confirmation
// Backup to frontend verification
// ═══════════════════════════════════════════════════════════════
const handleWebhook = asyncHandler(async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature     = req.headers['x-razorpay-signature'];

  // Verify webhook signature
  if (webhookSecret && signature) {
    const body    = JSON.stringify(req.body);
    const expected = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    if (expected !== signature) {
      console.warn('[Webhook] Invalid Razorpay signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }
  }

  const event   = req.body?.event;
  const payload = req.body?.payload;

  console.log(`[Webhook] Razorpay event: ${event}`);

  switch (event) {
    case 'payment.captured': {
      const rzpPayment = payload?.payment?.entity;
      const rzpOrderId = rzpPayment?.order_id;
      const notes      = rzpPayment?.notes || {};

      if (!rzpOrderId) break;

      // Find payment record
      const payment = await Payment.findOne({ rzpOrderId });
      if (!payment || payment.status === 'paid') break;

      // Update payment
      payment.rzpPaymentId = rzpPayment.id;
      payment.status       = 'paid';
      payment.processedAt  = new Date();
      await payment.save();

      // Add credits if not already added
      const credits = payment.creditsAdded;
      const uid     = notes.userId || payment.userId;

      await User.findOneAndUpdate(
        { uid, credits: { $not: { $gt: payment.creditsAdded + 10000 } } },
        {
          $inc: { credits },
          $push: {
            creditLog: {
              $each: [{
                type:         'topup',
                amount:       credits,
                balanceAfter: 0,
                note:         `${payment.plan} plan (webhook) — ${credits} credits`,
                createdAt:    new Date(),
              }],
              $slice: -500,
            },
          },
        }
      );

      console.log(`[Webhook] ✓ Payment captured: ${rzpPayment.id}`);
      break;
    }

    case 'payment.failed': {
      const rzpPayment = payload?.payment?.entity;
      const rzpOrderId = rzpPayment?.order_id;

      if (!rzpOrderId) break;

      await Payment.findOneAndUpdate(
        { rzpOrderId },
        {
          $set: {
            status:        'failed',
            failureReason: rzpPayment?.error_description || 'Payment failed',
            processedAt:   new Date(),
          },
        }
      );

      console.log(`[Webhook] Payment failed: ${rzpPayment?.id}`);
      break;
    }

    case 'refund.created': {
      const refund     = payload?.refund?.entity;
      const rzpPaymentId = refund?.payment_id;

      if (!rzpPaymentId) break;

      await Payment.findOneAndUpdate(
        { rzpPaymentId },
        { $set: { status: 'refunded' } }
      );

      console.log(`[Webhook] Refund: ${refund?.id}`);
      break;
    }

    default:
      break;
  }

  res.status(200).json({ received: true });
});

module.exports = {
  getPlans,
  createOrder,
  verifyPayment,
  recordFailure,
  getHistory,
  getPaymentStatus,
  handleWebhook,
};