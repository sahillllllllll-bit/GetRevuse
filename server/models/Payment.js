const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const paymentSchema = new mongoose.Schema({
  paymentId: {
    type:    String,
    default: () => `pay_${uuidv4().replace(/-/g, '').slice(0, 16)}`,
    unique:  true,
    index:   true,
  },

  userId:  { type: String, required: true, index: true }, // Firebase UID
  email:   { type: String, required: true, lowercase: true },

  // LemonSqueezy identifiers
  lsOrderId:     { type: String, default: null, index: true },
  lsVariantId:   { type: String, default: null },
  lsProductId:   { type: String, default: null },
  lsCheckoutId:  { type: String, default: null },
  lsCustomerId:  { type: String, default: null },

  // Plan details
  plan: {
    type: String,
    enum: ['starter', 'pro', 'growth', 'custom'],
    required: true,
  },

  // Amount in cents
  amountCents:  { type: Number, required: true },
  amountUSD:    { type: Number, required: true },  // e.g. 19.99
  currency:     { type: String, default: 'USD' },

  // Credits granted
  creditsAdded: { type: Number, required: true },

  // Discount applied
  discountApplied:  { type: Boolean, default: false },
  discountPercent:  { type: Number, default: 0 },
  originalAmountUSD:{ type: Number, default: null },

  // Status
  status: {
    type:  String,
    enum:  ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
    index:   true,
  },

  // Webhook metadata
  webhookEvent: { type: String, default: null },
  processedAt:  { type: Date,   default: null },

  // For custom plans
  isCustomAmount: { type: Boolean, default: false },
}, {
  timestamps: true,
  toJSON:    { virtuals: true },
  toObject:  { virtuals: true },
});

paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ lsOrderId: 1 });

// Virtual: formatted amount
paymentSchema.virtual('formattedAmount').get(function () {
  return `$${this.amountUSD.toFixed(2)}`;
});

const Payment = mongoose.model('Payment', paymentSchema);
module.exports = Payment;