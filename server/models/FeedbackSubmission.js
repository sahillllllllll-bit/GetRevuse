const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const feedbackSubmissionSchema = new mongoose.Schema({
  submissionId: {
    type: String,
    default: () => `fb_${uuidv4().replace(/-/g, '').slice(0, 16)}`,
    unique: true,
    index: true,
  },

  campaignId:  { type: String, required: true, index: true },
  customerId:  { type: String, default: null,  index: true },
  userId:      { type: String, required: true, index: true },
  slug:        { type: String, required: true, index: true },

  // Star rating given
  starRating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },

  // Routing outcome
  routingOutcome: {
    type: String,
    enum: ['positive', 'negative'],
    required: true,
  },

  // Feedback form fields (only for negative routing)
  fields: {
    name:    { type: String, default: null },
    email:   { type: String, default: null },
    phone:   { type: String, default: null },
    message: { type: String, default: null },
    order:   { type: String, default: null },
  },

  // Status: new = unread, read = seen by owner, resolved = actioned
  status: {
    type: String,
    enum: ['new', 'read', 'resolved'],
    default: 'new',
    index: true,
  },

  // Request metadata
  ipAddress: { type: String, default: null },
  userAgent: { type: String, default: null },

  // Owner notes
  ownerNote: { type: String, default: null },
  resolvedAt:{ type: Date,   default: null },
}, {
  timestamps: true,
  toJSON:    { virtuals: true },
  toObject:  { virtuals: true },
});

feedbackSubmissionSchema.index({ userId: 1, createdAt: -1 });
feedbackSubmissionSchema.index({ campaignId: 1, createdAt: -1 });
feedbackSubmissionSchema.index({ userId: 1, status: 1 });

// ─── Statics ──────────────────────────────────────────────────

// Aggregate counts for dashboard
feedbackSubmissionSchema.statics.getDashboardStats = async function (userId) {
  return this.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id:      null,
        total:    { $sum: 1 },
        newCount: { $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] } },
        avgRating:{ $avg: '$starRating' },
        negative: { $sum: { $cond: [{ $eq: ['$routingOutcome', 'negative'] }, 1, 0] } },
        positive: { $sum: { $cond: [{ $eq: ['$routingOutcome', 'positive'] }, 1, 0] } },
      },
    },
  ]);
};

const FeedbackSubmission = mongoose.model('FeedbackSubmission', feedbackSubmissionSchema);
module.exports = FeedbackSubmission;