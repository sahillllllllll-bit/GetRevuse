const mongoose = require('mongoose');
// slugService is required lazily inside pre-save to avoid circular deps
// (slugService imports FeedbackPage, FeedbackPage imports slugService)

const feedbackPageSchema = new mongoose.Schema({
  // ── Identity ──────────────────────────────────────────────
  slug: {
    type: String,
    unique: true,
    index: true,
    // e.g. "sunshine-cafe-abc123"
  },

  campaignId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },

  userId: {
    type: String,
    required: true,
    index: true,
  },

  // ── Branding ──────────────────────────────────────────────
  businessName: {
    type: String,
    required: true,
    trim: true,
  },

  // Optional logo URL
  logoUrl: {
    type: String,
    default: null,
  },

  // Theme color (hex)
  primaryColor: {
    type: String,
    default: '#2563eb',
    validate: {
      validator: (v) => /^#[0-9A-Fa-f]{6}$/.test(v),
      message:   'primaryColor must be a valid hex color',
    },
  },

  // ── Routing config (mirrors Campaign.routing) ─────────────
  threshold: {
    type: Number,
    default: 4,
    min: 1,
    max: 5,
  },

  reviewLink: {
    type: String,
    required: true,
  },

  // ── Feedback form config ──────────────────────────────────
  feedbackFormEnabled: { type: Boolean, default: true },

  feedbackFields: {
    type: [String],
    default: ['name', 'email', 'message'],
  },

  feedbackNote: {
    type: String,
    default: "We're sorry your experience wasn't perfect. Please share what happened so we can improve.",
  },

  // ── Thank you messages ────────────────────────────────────
  positiveThankYouMsg: {
    type: String,
    default: "Thank you! We appreciate your support. You're being redirected to leave your review...",
  },

  negativeThankYouMsg: {
    type: String,
    default: "Thank you for your feedback. We'll be in touch shortly to make things right.",
  },

  // ── Status ────────────────────────────────────────────────
  active: { type: Boolean, default: true },
}, {
  timestamps: true,
  toJSON:    { virtuals: true },
  toObject:  { virtuals: true },
});

// ─── Pre-save: generate slug via slugService ──────────────────
feedbackPageSchema.pre('save', async function () {
  if (!this.slug) {
    // Lazy require to avoid circular dependency
    // (slugService queries FeedbackPage, so we can't require at top-level)
    const { generateUniqueSlug } = require('../services/slugService');
    this.slug = await generateUniqueSlug(this.businessName);
  }
 
});

// ─── Virtual: public URL ──────────────────────────────────────
feedbackPageSchema.virtual('publicUrl').get(function () {
  const base = process.env.APP_BASE_URL || 'http://localhost:3000';
  return `${base}/f/${this.slug}`;
});

const FeedbackPage = mongoose.model('FeedbackPage', feedbackPageSchema);
module.exports = FeedbackPage;