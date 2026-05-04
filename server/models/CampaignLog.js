const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const campaignLogSchema = new mongoose.Schema(
  {
    logId: {
      type: String,
      default: () => `log_${uuidv4().replace(/-/g, '').slice(0, 16)}`,
      unique: true,
      index: true,
    },

    // Relations
    campaignId: {
      type: String,
      required: [true, 'Campaign ID is required'],
      index: true,
    },

    customerId: {
      type: String,
      required: [true, 'Customer ID is required'],
      index: true,
    },

    userId: {
      type: String,
      required: [true, 'User ID is required'],
      index: true,
    },

    // Event type
    eventType: {
      type: String,
      enum: ['queued', 'sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked', 'feedback_submitted', 'routed'],
      required: true,
      index: true,
    },

    // Channel
    channel: {
      type: String,
      enum: ['email', 'sms', 'system'],
      default: 'system',
    },

    // Metadata
    metadata: {
      messageId: String,
      provider: String,         // 'sendgrid', 'twilio', 'system'
      feedbackText: String,
      starRating: Number,
      routingOutcome: String,   // 'positive' or 'negative'
    },

    // Error details (if failed)
    errorCode: String,
    errorMessage: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
campaignLogSchema.index({ campaignId: 1, createdAt: -1 });
campaignLogSchema.index({ customerId: 1, eventType: 1 });
campaignLogSchema.index({ userId: 1, campaignId: 1 });

// Static method to record an event
campaignLogSchema.statics.record = async function (data) {
  return this.create({
    logId: `log_${uuidv4().replace(/-/g, '').slice(0, 16)}`,
    ...data,
  });
};

const CampaignLog = mongoose.model('CampaignLog', campaignLogSchema);
module.exports = CampaignLog;