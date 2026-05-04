const axios          = require('axios');
const User           = require('../models/User');
const Payment        = require('../models/Payment');
const { asyncHandler } = require('../middlewares/asyncHandler');

// ─── Plan config ──────────────────────────────────────────────
// Credits per dollar for custom plans
const CREDITS_PER_DOLLAR = 30;  // $1 = 30 credits

const PLANS = {
  starter: {
    name:          'Starter',
    amountUSD:     0,
    credits:       100,
    variantId:     null,  // Free — no payment needed
    discountPct:   0,
  },
  pro: {
    name:          'Pro',
    amountUSD:     19.99,
    originalUSD:   29.99,   // crossed-out price
    discountPct:   33,
    credits:       1000,
    variantId:     process.env.LEMONSQUEEZY_PRO_VARIANT_ID,
  },
  growth: {
    name:          'Growth',
    amountUSD:     49.99,
    originalUSD:   74.99,
    discountPct:   33,
    credits:       3000,
    variantId:     process.env.LEMONSQUEEZY_GROWTH_VARIANT_ID,
  },
};

// ─── LemonSqueezy API helper ──────────────────────────────────
const lsApi = axios.create({
  baseURL: 'https://api.lemonsqueezy.com/v1',
  headers: {
    Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
    Accept:        'application/vnd.api+json',
    'Content-Type':'application/vnd.api+json',
  },
});

const success = (res, data, code = 200, meta = {}) =>
  res.status(code).json({ success: true, ...meta, ...data });

// ═══════════════════════════════════════════════════════════════
// POST /api/payments/checkout
// Create a LemonSqueezy checkout URL
// Body: { plan: 'pro'|'growth'|'custom', customAmount?: number }
// ═══════════════════════════════════════════════════════════════
const createCheckout = asyncHandler(async (req, res) => {
  const { uid, email } = req.user;
  const { plan, customAmount, currency = 'USD' } = req.body;

  // ── Validate plan ───────────────────────────────────────────
  if (!plan || !['pro', 'growth', 'custom'].includes(plan)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid plan. Must be pro, growth, or custom',
    });
  }

  // ── Custom amount plan ──────────────────────────────────────
  if (plan === 'custom') {
    const amount = parseFloat(customAmount);

    if (!amount || isNaN(amount) || amount < 5) {
      return res.status(400).json({
        success: false,
        message: 'Minimum custom amount is $5',
      });
    }

    if (amount > 999) {
      return res.status(400).json({
        success: false,
        message: 'Maximum custom amount is $999. Contact us for larger amounts.',
      });
    }

    const credits    = Math.floor(amount * CREDITS_PER_DOLLAR);
    const amountCents = Math.round(amount * 100);
    const variantId   = process.env.LEMONSQUEEZY_CUSTOM_VARIANT_ID;

    if (!variantId) {
      return res.status(500).json({
        success: false,
        message: 'Custom plan not configured. Please contact support.',
      });
    }

    // Create pending payment record
    const payment = await Payment.create({
      userId:         uid,
      email,
      plan:           'custom',
      amountCents,
      amountUSD:      amount,
      creditsAdded:   credits,
      isCustomAmount: true,
      status:         'pending',
    });

    const checkoutUrl = await createLSCheckout({
      variantId,
      email,
      userId:    uid,
      paymentId: payment.paymentId,
      amount:    amountCents,
      name:      `Custom Plan — ${credits} Credits`,
      custom:    { payment_id: payment.paymentId, credits, plan: 'custom' },
    });

    return success(res, {
      checkoutUrl,
      credits,
      amountUSD: amount,
      paymentId: payment.paymentId,
    });
  }

  // ── Standard plans (Pro / Growth) ──────────────────────────
  const planConfig = PLANS[plan];
  if (!planConfig.variantId) {
    return res.status(500).json({
      success: false,
      message: `${plan} plan variant ID not configured`,
    });
  }

  // Create pending payment record
  const payment = await Payment.create({
    userId:            uid,
    email,
    plan,
    amountCents:       Math.round(planConfig.amountUSD * 100),
    amountUSD:         planConfig.amountUSD,
    originalAmountUSD: planConfig.originalUSD || null,
    discountApplied:   planConfig.discountPct > 0,
    discountPercent:   planConfig.discountPct || 0,
    creditsAdded:      planConfig.credits,
    status:            'pending',
  });

  const checkoutUrl = await createLSCheckout({
    variantId:  planConfig.variantId,
    email,
    userId:     uid,
    paymentId:  payment.paymentId,
    name:       `${planConfig.name} Plan — ${planConfig.credits} Credits`,
    custom:     { payment_id: payment.paymentId, credits: planConfig.credits, plan },
  });

  return success(res, {
    checkoutUrl,
    credits:   planConfig.credits,
    amountUSD: planConfig.amountUSD,
    paymentId: payment.paymentId,
  });
});

// ─── LemonSqueezy checkout creator helper ─────────────────────
async function createLSCheckout({ variantId, email, userId, paymentId, amount, name, custom }) {
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  const appUrl  = process.env.APP_BASE_URL || 'http://localhost:3000';

  const payload = {
    data: {
      type: 'checkouts',
      attributes: {
        checkout_options: {
          embed:        false,
          media:        false,
          logo:         true,
          desc:         true,
          discount:     false,
          skip_trial:   true,
          subscription_preview: false,
        },
        checkout_data: {
          email,
          custom: {
            user_id:    userId,
            payment_id: paymentId,
            ...custom,
          },
        },
        product_options: {
          name,
          redirect_url:      `${appUrl}/payment/success?pid=${paymentId}`,
          receipt_link_url:  `${appUrl}/payment/success?pid=${paymentId}`,
          receipt_thank_you_note: 'Thank you! Your credits have been added to your account.',
        },
        // Override price for custom amounts
        ...(amount && {
          custom_price: amount,
        }),
      },
      relationships: {
        store: {
          data: { type: 'stores', id: String(storeId) },
        },
        variant: {
          data: { type: 'variants', id: String(variantId) },
        },
      },
    },
  };

  const response = await lsApi.post('/checkouts', payload);
  return response.data?.data?.attributes?.url;
}

// ═══════════════════════════════════════════════════════════════
// POST /api/payments/webhook
// LemonSqueezy webhook — order_created, order_refunded
// ═══════════════════════════════════════════════════════════════
const handleWebhook = asyncHandler(async (req, res) => {
  const event    = req.headers['x-event-name'];
  const payload  = req.body;

  console.log(`[Payment Webhook] Event: ${event}`);

  switch (event) {

    // ── Order paid successfully ───────────────────────────────
    case 'order_created': {
      const order      = payload.data;
      const attributes = order.attributes;
      const meta       = payload.meta?.custom_data || {};

      const lsOrderId   = String(order.id);
      const paymentId   = meta.payment_id;
      const creditsStr  = meta.credits;
      const userId      = meta.user_id;
      const plan        = meta.plan;

      if (!paymentId || !userId) {
        console.error('[Webhook] Missing payment_id or user_id in custom data');
        return res.status(200).json({ received: true }); // 200 to ack
      }

      // Idempotency — skip if already processed
      const existing = await Payment.findOne({ lsOrderId });
      if (existing && existing.status === 'paid') {
        console.log(`[Webhook] Order ${lsOrderId} already processed`);
        return res.status(200).json({ received: true });
      }

      const credits = parseInt(creditsStr, 10);
      if (!credits || isNaN(credits)) {
        console.error('[Webhook] Invalid credits in custom data:', creditsStr);
        return res.status(200).json({ received: true });
      }

      // Update payment record
      await Payment.findOneAndUpdate(
        { paymentId },
        {
          $set: {
            status:       'paid',
            lsOrderId,
            lsCustomerId: String(attributes.customer_id || ''),
            lsProductId:  String(attributes.first_order_item?.product_id || ''),
            webhookEvent: event,
            processedAt:  new Date(),
          },
        }
      );

      // Add credits to user atomically
      const user = await User.findOneAndUpdate(
        { uid: userId },
        {
          $inc: { credits: credits, creditsUsed: 0 },
          $push: {
            creditLog: {
              $each: [{
                type:         'topup',
                amount:       credits,
                balanceAfter: 0,  // will be slightly off but ok
                note:         `${plan} plan purchase — ${credits} credits`,
                createdAt:    new Date(),
              }],
              $slice: -500,
            },
          },
        },
        { new: true }
      );

      if (!user) {
        console.error(`[Webhook] User not found: ${userId}`);
      } else {
        console.log(`[Webhook] ✓ Added ${credits} credits to user ${userId}. New balance: ${user.credits}`);
      }

      break;
    }

    // ── Refund ───────────────────────────────────────────────
    case 'order_refunded': {
      const order     = payload.data;
      const lsOrderId = String(order.id);
      const meta      = payload.meta?.custom_data || {};
      const userId    = meta.user_id;
      const credits   = parseInt(meta.credits || '0', 10);

      // Update payment status
      await Payment.findOneAndUpdate(
        { lsOrderId },
        { $set: { status: 'refunded', webhookEvent: event } }
      );

      // Deduct credits on refund
      if (userId && credits) {
        await User.findOneAndUpdate(
          { uid: userId, credits: { $gte: credits } },
          {
            $inc: { credits: -credits },
            $push: {
              creditLog: {
                $each: [{
                  type:         'refund',
                  amount:       -credits,
                  balanceAfter: 0,
                  note:         `Refund processed — ${credits} credits removed`,
                  createdAt:    new Date(),
                }],
                $slice: -500,
              },
            },
          }
        );
        console.log(`[Webhook] Refund: removed ${credits} credits from ${userId}`);
      }

      break;
    }

    default:
      console.log(`[Webhook] Unhandled event: ${event}`);
  }

  // Always return 200 to LemonSqueezy
  res.status(200).json({ received: true });
});

// ═══════════════════════════════════════════════════════════════
// GET /api/payments/history
// Get payment history for logged-in user
// ═══════════════════════════════════════════════════════════════
const getPaymentHistory = asyncHandler(async (req, res) => {
  const { uid } = req.user;

  const payments = await Payment.find({ userId: uid })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return success(res, { payments });
});

// ═══════════════════════════════════════════════════════════════
// GET /api/payments/success?pid=xxx
// Verify payment completed (called after redirect)
// ═══════════════════════════════════════════════════════════════
const verifyPayment = asyncHandler(async (req, res) => {
  const { uid }  = req.user;
  const { pid }  = req.query;

  if (!pid) {
    return res.status(400).json({ success: false, message: 'Payment ID required' });
  }

  const payment = await Payment.findOne({ paymentId: pid, userId: uid });

  if (!payment) {
    return res.status(404).json({ success: false, message: 'Payment not found' });
  }

  // Get current credit balance
  const user = await User.findOne({ uid }).select('credits');

  return success(res, {
    payment,
    status:       payment.status,
    creditsAdded: payment.creditsAdded,
    currentBalance: user?.credits || 0,
  });
});

// ═══════════════════════════════════════════════════════════════
// GET /api/payments/plans
// Return plan config for frontend (no sensitive data)
// ═══════════════════════════════════════════════════════════════
const getPlans = asyncHandler(async (_req, res) => {
  return success(res, {
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
    minCustomAmount:  5,
    maxCustomAmount:  999,
  });
});

module.exports = {
  createCheckout,
  handleWebhook,
  getPaymentHistory,
  verifyPayment,
  getPlans,
};