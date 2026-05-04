const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

const emailTemplateSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      trim: true,
      maxlength: [200, 'Email subject cannot exceed 200 characters'],
    },
    body: {
      type: String,
      maxlength: [10000, 'Email body cannot exceed 10,000 characters'],
    },
  },
  { _id: false }
);

const smsTemplateSchema = new mongoose.Schema(
  {
    body: {
      type: String,
      maxlength: [320, 'SMS body cannot exceed 320 characters'],
    },
  },
  { _id: false }
);

const routingSchema = new mongoose.Schema(
  {
    // Star rating threshold: below → feedback form, at/above → review link
    threshold: {
      type: Number,
      min: [1, 'Threshold must be at least 1'],
      max: [5, 'Threshold cannot exceed 5'],
      default: 4,
    },

    feedbackFormEnabled: {
      type: Boolean,
      default: true,
    },

    // Which fields to collect on the feedback form
    feedbackFields: {
      type: [String],
      enum: ['name', 'email', 'phone', 'message', 'rating', 'order'],
      default: ['name', 'email', 'message'],
    },

    // Intro message shown on the feedback form
    feedbackNote: {
      type: String,
      trim: true,
      maxlength: [500, 'Feedback note cannot exceed 500 characters'],
      default: "We're sorry your experience wasn't perfect. Please share what happened so we can improve.",
    },

    // Notify owner when a negative feedback form is submitted
    notifyOnNegative: {
      type: Boolean,
      default: true,
    },

    notifyEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
      validate: {
        validator: (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        message: 'Invalid notification email address',
      },
    },
  },
  { _id: false }
);

const launchSchema = new mongoose.Schema(
  {
    senderName: {
      type: String,
      trim: true,
      maxlength: [100, 'Sender name cannot exceed 100 characters'],
    },

    senderEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
      validate: {
        validator: (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        message: 'Invalid sender email address',
      },
    },

    senderPhone: {
      type: String,
      trim: true,
      default: null,
    },

    // When to send
    schedule: {
      type: String,
      enum: ['now', '1h', '3h', 'tomorrow', 'custom'],
      default: 'now',
    },

    // Only used when schedule = 'custom'
    customDateTime: {
      type: Date,
      default: null,
    },

    // Resolved send time (computed on create)
    scheduledAt: {
      type: Date,
      default: null,
    },

    // Actual time messages started sending
    startedAt: {
      type: Date,
      default: null,
    },

    // Time campaign finished (all messages sent)
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const statsSchema = new mongoose.Schema(
  {
    totalCustomers:      { type: Number, default: 0 },
    totalSent:           { type: Number, default: 0 },
    totalDelivered:      { type: Number, default: 0 },
    totalFailed:         { type: Number, default: 0 },
    totalBounced:        { type: Number, default: 0 },
    totalOpened:         { type: Number, default: 0 },   // email opens
    totalClicked:        { type: Number, default: 0 },   // review link clicks
    totalFeedback:       { type: Number, default: 0 },   // feedback form submissions
    totalPositiveRouted: { type: Number, default: 0 },   // sent to review link
    totalNegativeRouted: { type: Number, default: 0 },   // sent to feedback form
    lastActivityAt:      { type: Date,   default: null },
  },
  { _id: false }
);

// ─── Main Campaign Schema ─────────────────────────────────────────────────────

const campaignSchema = new mongoose.Schema(
  {
    // ── IDENTITY ─────────────────────────────────────────────────
    campaignId: {
      type: String,
      default: () => `camp_${uuidv4().replace(/-/g, '').slice(0, 16)}`,
      unique: true,
      index: true,
    },

    userId: {
      type: String, // Firebase UID
      required: [true, 'User ID is required'],
      index: true,
    },

    // ── BASICS ───────────────────────────────────────────────────
    campaignName: {
      type: String,
      required: [true, 'Campaign name is required'],
      trim: true,
      minlength: [2, 'Campaign name must be at least 2 characters'],
      maxlength: [100, 'Campaign name cannot exceed 100 characters'],
    },

    businessName: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
      minlength: [2, 'Business name must be at least 2 characters'],
      maxlength: [100, 'Business name cannot exceed 100 characters'],
    },

    // ── REVIEW PLATFORM ──────────────────────────────────────────
    platform: {
      type: String,
      enum: [
        'google', 'yelp', 'trustpilot', 'tripadvisor', 'facebook',
        'g2', 'capterra', 'booking', 'glassdoor', 'amazon',
        'houzz', 'healthgrades', 'custom',
      ],
      required: [true, 'Review platform is required'],
      default: 'google',
    },

    reviewLink: {
      type: String,
      required: [true, 'Review link is required'],
      trim: true,
      validate: {
        validator: (v) => /^https?:\/\/.+/.test(v),
        message: 'Review link must be a valid URL starting with http:// or https://',
      },
    },

    // ── MESSAGING CHANNEL ────────────────────────────────────────
    channel: {
      type: String,
      enum: ['email', 'sms', 'both'],
      required: [true, 'Messaging channel is required'],
      default: 'email',
    },

    // ── TEMPLATES ────────────────────────────────────────────────
    templates: {
      email: { type: emailTemplateSchema, default: null },
      sms:   { type: smsTemplateSchema,   default: null },
    },

    // ── ROUTING CONFIG ───────────────────────────────────────────
    routing: {
      type: routingSchema,
      default: () => ({}),
    },

    // ── LAUNCH CONFIG ────────────────────────────────────────────
    launch: {
      type: launchSchema,
      default: () => ({}),
    },

    // ── STATS (updated by event logger) ─────────────────────────
    stats: {
      type: statsSchema,
      default: () => ({}),
    },

    // ── STATUS ───────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled'],
      default: 'draft',
      index: true,
    },

    // ── SOFT DELETE ──────────────────────────────────────────────
    isDeleted:  { type: Boolean, default: false },
    deletedAt:  { type: Date,    default: null  },

    // ── DUPLICATE TRACKING ───────────────────────────────────────
    duplicatedFrom: {
      type: String,   // campaignId of original
      default: null,
    },
  },
  {
    timestamps: true,   // createdAt, updatedAt
    toJSON:    { virtuals: true },
    toObject:  { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
campaignSchema.index({ userId: 1, createdAt: -1 });
campaignSchema.index({ userId: 1, status: 1 });
campaignSchema.index({ campaignId: 1 });
campaignSchema.index({ isDeleted: 1, status: 1 });

// ─── Virtuals ─────────────────────────────────────────────────────────────────

// Delivery rate %
campaignSchema.virtual('deliveryRate').get(function () {
  if (!this.stats.totalSent) return 0;
  return Math.round((this.stats.totalDelivered / this.stats.totalSent) * 100);
});

// Open rate % (email only)
campaignSchema.virtual('openRate').get(function () {
  if (!this.stats.totalDelivered) return 0;
  return Math.round((this.stats.totalOpened / this.stats.totalDelivered) * 100);
});

// Click-through rate %
campaignSchema.virtual('clickRate').get(function () {
  if (!this.stats.totalDelivered) return 0;
  return Math.round((this.stats.totalClicked / this.stats.totalDelivered) * 100);
});

// Feedback rate %
campaignSchema.virtual('feedbackRate').get(function () {
  if (!this.stats.totalNegativeRouted) return 0;
  return Math.round((this.stats.totalFeedback / this.stats.totalNegativeRouted) * 100);
});

// Is the campaign currently active (running or scheduled)?
campaignSchema.virtual('isActive').get(function () {
  return ['running', 'scheduled'].includes(this.status);
});

// ─── Instance Methods ─────────────────────────────────────────────────────────

// Resolve and set scheduledAt from schedule option
campaignSchema.methods.resolveScheduledAt = function () {
  const now = new Date();
  const map = {
    now:      now,
    '1h':     new Date(now.getTime() + 1  * 60 * 60 * 1000),
    '3h':     new Date(now.getTime() + 3  * 60 * 60 * 1000),
    tomorrow: (() => {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      return d;
    })(),
    custom: this.launch.customDateTime || now,
  };
  this.launch.scheduledAt = map[this.launch.schedule] || now;
  return this.launch.scheduledAt;
};

// Get human-readable status label
campaignSchema.methods.getStatusLabel = function () {
  const map = {
    draft:      'Draft',
    scheduled:  'Scheduled',
    running:    'Running',
    paused:     'Paused',
    completed:  'Completed',
    cancelled:  'Cancelled',
  };
  return map[this.status] || 'Unknown';
};

// Soft delete
campaignSchema.methods.softDelete = function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.status    = 'cancelled';
  return this.save();
};

// ─── Static Methods ───────────────────────────────────────────────────────────

// Find all active campaigns for a user (not deleted)
campaignSchema.statics.findByUser = function (userId, filters = {}) {
  return this.find({ userId, isDeleted: false, ...filters }).sort({ createdAt: -1 });
};

// Increment a stat counter atomically
campaignSchema.statics.incrementStat = function (campaignId, field, amount = 1) {
  return this.findOneAndUpdate(
    { campaignId },
    {
      $inc: { [`stats.${field}`]: amount },
      $set: { 'stats.lastActivityAt': new Date() },
    },
    { new: true }
  );
};

// ─── Pre-save hook ────────────────────────────────────────────────────────────
campaignSchema.pre('save', function () {
  // Auto-set status based on schedule when creating
  if (this.isNew && this.status === 'draft') {
    if (this.launch?.schedule === 'now') {
      this.status = 'running';
    } else if (this.launch?.schedule) {
      this.status = 'scheduled';
    }
  }
  
});

const Campaign = mongoose.model('Campaign', campaignSchema);
module.exports = Campaign;