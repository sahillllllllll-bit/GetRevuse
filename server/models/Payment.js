const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const paymentSchema = new mongoose.Schema({
  paymentId: {
    type:    String,
    default: () => `pay_${uuidv4().replace(/-/g, '').slice(0, 16)}`,
    unique:  true,
    index:   true,
  },

  // ── User ─────────────────────────────────────────────────────
  userId: { type: String, required: true, index: true },
  email:  { type: String, required: true, lowercase: true },

  // ── Razorpay IDs ─────────────────────────────────────────────
  rzpOrderId:   { type: String, default: null, index: true },
  rzpPaymentId: { type: String, default: null, index: true },
  rzpSignature: { type: String, default: null },

  // ── Plan ─────────────────────────────────────────────────────
  plan: {
    type:     String,
    enum:     ['starter', 'pro', 'growth', 'custom'],
    required: true,
  },

  // ── Amount ───────────────────────────────────────────────────
  // Stored in smallest unit: paise for INR, cents for USD
  amountPaise:  { type: Number, default: null }, // e.g. 149900 = ₹1499
  amountUSD:    { type: Number, default: null }, // e.g. 19.99
  displayAmount:{ type: Number, default: null }, // what user sees
  currency:     { type: String, default: 'INR' },

  // ── Credits ──────────────────────────────────────────────────
  creditsAdded: { type: Number, required: true },

  // ── Discount ─────────────────────────────────────────────────
  discountApplied:   { type: Boolean, default: false },
  discountPercent:   { type: Number,  default: 0      },
  originalAmountUSD: { type: Number,  default: null   },

  // ── Custom plan ───────────────────────────────────────────────
  isCustomAmount: { type: Boolean, default: false },

  // ── Status ───────────────────────────────────────────────────
  status: {
    type:    String,
    enum:    ['created', 'paid', 'failed', 'refunded'],
    default: 'created',
    index:   true,
  },

  failureReason: { type: String, default: null },
  processedAt:   { type: Date,   default: null },
}, {
  timestamps: true,
  toJSON:    { virtuals: true },
  toObject:  { virtuals: true },
});

paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ rzpOrderId: 1 });

paymentSchema.virtual('formattedAmount').get(function () {
  if (this.currency === 'INR' && this.amountPaise) {
    return `₹${(this.amountPaise / 100).toFixed(0)}`;
  }
  return `$${this.amountUSD?.toFixed(2) || '0.00'}`;
});

const Payment = mongoose.model('Payment', paymentSchema);
module.exports = Payment;