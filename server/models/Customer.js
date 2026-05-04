const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const customerSchema = new mongoose.Schema(
  {
    // ── IDENTITY ─────────────────────────────────────────────────
    customerId: {
      type: String,
      default: () => `cust_${uuidv4().replace(/-/g, '').slice(0, 16)}`,
      unique: true,
      index: true,
    },

    // ── RELATIONS ────────────────────────────────────────────────
    campaignId: {
      type: String,   // references Campaign.campaignId
      required: [true, 'Campaign ID is required'],
      index: true,
    },

    userId: {
      type: String,   // Firebase UID — for direct queries without join
      required: [true, 'User ID is required'],
      index: true,
    },

    // ── CONTACT INFO ─────────────────────────────────────────────
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
      validate: {
        validator: (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        message: 'Invalid email address',
      },
    },

    phone: {
      type: String,
      trim: true,
      default: null,
    },

    // ── SEND STATUS ──────────────────────────────────────────────
    status: {
      type: String,
      enum: ['pending', 'queued', 'sent', 'delivered', 'failed', 'bounced', 'unsubscribed'],
      default: 'pending',
      index: true,
    },

    // Specific channel statuses when campaign uses "both"
    emailStatus: {
      type: String,
      enum: ['pending', 'queued', 'sent', 'delivered', 'failed', 'bounced', null],
      default: null,
    },

    smsStatus: {
      type: String,
      enum: ['pending', 'queued', 'sent', 'delivered', 'failed', 'bounced', null],
      default: null,
    },

    // ── ENGAGEMENT TRACKING ──────────────────────────────────────
    emailOpened: {
      type: Boolean,
      default: false,
    },
    emailOpenedAt: {
      type: Date,
      default: null,
    },
    emailOpenCount: {
      type: Number,
      default: 0,
    },

    linkClicked: {
      type: Boolean,
      default: false,
    },
    linkClickedAt: {
      type: Date,
      default: null,
    },
    linkClickCount: {
      type: Number,
      default: 0,
    },

    // ── ROUTING OUTCOME ──────────────────────────────────────────
    // Which route was taken: positive (review link) or negative (feedback form)
    routingOutcome: {
      type: String,
      enum: ['positive', 'negative', null],
      default: null,
    },

    // Star rating the customer clicked (1–5)
    starRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },

    // ── FEEDBACK FORM ────────────────────────────────────────────
    feedbackSubmitted: {
      type: Boolean,
      default: false,
    },
    feedbackSubmittedAt: {
      type: Date,
      default: null,
    },
    feedbackText: {
      type: String,
      maxlength: [2000, 'Feedback text cannot exceed 2000 characters'],
      default: null,
    },

    // ── SEND TIMING ──────────────────────────────────────────────
    sentAt:      { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    failedAt:    { type: Date, default: null },

    // Error reason if failed
    failReason: {
      type: String,
      default: null,
    },

    // External message IDs (from email/SMS provider)
    externalIds: {
      emailMessageId: { type: String, default: null },
      smsMessageId:   { type: String, default: null },
    },

    // ── SOFT DELETE ──────────────────────────────────────────────
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON:    { virtuals: true },
    toObject:  { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
customerSchema.index({ campaignId: 1, status: 1 });
customerSchema.index({ campaignId: 1, createdAt: -1 });
customerSchema.index({ userId: 1, campaignId: 1 });
customerSchema.index({ email: 1, campaignId: 1 });
customerSchema.index({ customerId: 1 });

// ─── Virtuals ─────────────────────────────────────────────────────────────────

// Was this customer successfully engaged?
customerSchema.virtual('isEngaged').get(function () {
  return this.emailOpened || this.linkClicked || this.feedbackSubmitted;
});

// Human-readable routing label
customerSchema.virtual('routingLabel').get(function () {
  if (!this.routingOutcome) return 'Not rated yet';
  return this.routingOutcome === 'positive' ? 'Sent to Review' : 'Sent to Feedback';
});

// ─── Instance Methods ─────────────────────────────────────────────────────────

// Mark email as opened
customerSchema.methods.markEmailOpened = function () {
  if (!this.emailOpened) {
    this.emailOpened   = true;
    this.emailOpenedAt = new Date();
  }
  this.emailOpenCount += 1;
  return this.save();
};

// Mark review link as clicked
customerSchema.methods.markLinkClicked = function () {
  if (!this.linkClicked) {
    this.linkClicked   = true;
    this.linkClickedAt = new Date();
  }
  this.linkClickCount += 1;
  return this.save();
};

// Mark feedback as submitted
customerSchema.methods.markFeedbackSubmitted = function (feedbackText = null) {
  this.feedbackSubmitted   = true;
  this.feedbackSubmittedAt = new Date();
  if (feedbackText) this.feedbackText = feedbackText;
  return this.save();
};

// Record star rating and resolve routing outcome
customerSchema.methods.recordRating = function (stars, threshold) {
  this.starRating     = stars;
  this.routingOutcome = stars >= threshold ? 'positive' : 'negative';
  return this.save();
};

// ─── Static Methods ───────────────────────────────────────────────────────────

// Bulk insert customers for a campaign
customerSchema.statics.bulkInsertForCampaign = async function (campaignId, userId, customers) {
  const docs = customers.map((c) => ({
    customerId: `cust_${uuidv4().replace(/-/g, '').slice(0, 16)}`,
    campaignId,
    userId,
    name:  c.name,
    email: c.email  || null,
    phone: c.phone  || null,
    status: 'pending',
  }));
  return this.insertMany(docs, { ordered: false });
};

// Get aggregate stats for a campaign
customerSchema.statics.getStatsForCampaign = async function (campaignId) {
  const result = await this.aggregate([
    { $match: { campaignId, isDeleted: false } },
    {
      $group: {
        _id: null,
        total:           { $sum: 1 },
        pending:         { $sum: { $cond: [{ $eq: ['$status', 'pending'] },   1, 0] } },
        sent:            { $sum: { $cond: [{ $eq: ['$status', 'sent'] },      1, 0] } },
        delivered:       { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
        failed:          { $sum: { $cond: [{ $eq: ['$status', 'failed'] },    1, 0] } },
        bounced:         { $sum: { $cond: [{ $eq: ['$status', 'bounced'] },   1, 0] } },
        opened:          { $sum: { $cond: ['$emailOpened',      1, 0] } },
        clicked:         { $sum: { $cond: ['$linkClicked',      1, 0] } },
        feedbackCount:   { $sum: { $cond: ['$feedbackSubmitted', 1, 0] } },
        positiveRouted:  { $sum: { $cond: [{ $eq: ['$routingOutcome', 'positive'] }, 1, 0] } },
        negativeRouted:  { $sum: { $cond: [{ $eq: ['$routingOutcome', 'negative'] }, 1, 0] } },
        avgRating:       { $avg: '$starRating' },
      },
    },
  ]);
  return result[0] || {
    total: 0, pending: 0, sent: 0, delivered: 0, failed: 0,
    bounced: 0, opened: 0, clicked: 0, feedbackCount: 0,
    positiveRouted: 0, negativeRouted: 0, avgRating: null,
  };
};

const Customer = mongoose.model('Customer', customerSchema);
module.exports = Customer;