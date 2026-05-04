// models/EmailQuota.js
// Tracks daily Brevo email send count (resets at midnight UTC)

const mongoose = require('mongoose');

const emailQuotaSchema = new mongoose.Schema({
  date: {
    type: String, // "YYYY-MM-DD" UTC
    required: true,
    unique: true,
    index: true,
  },
  sentCount: {
    type: Number,
    default: 0,
  },
  limitHit: {
    type: Boolean,
    default: false,
  },
  limitHitAt: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

// Get today's quota doc (creates if missing)
emailQuotaSchema.statics.getTodayDoc = async function () {
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  let doc = await this.findOne({ date: today });
  if (!doc) {
    doc = await this.create({ date: today, sentCount: 0 });
  }
  return doc;
};

// Increment sent count and check against limit
// Returns { allowed, remaining, limitHit }
emailQuotaSchema.statics.incrementAndCheck = async function (DAILY_LIMIT = 300) {
  const today = new Date().toISOString().slice(0, 10);

  const doc = await this.findOneAndUpdate(
    { date: today },
    { $inc: { sentCount: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const remaining = DAILY_LIMIT - doc.sentCount;
  const limitHit  = doc.sentCount >= DAILY_LIMIT;

  if (limitHit && !doc.limitHit) {
    await this.findOneAndUpdate({ date: today }, {
      $set: { limitHit: true, limitHitAt: new Date() }
    });
  }

  return { allowed: !limitHit, remaining: Math.max(0, remaining), sentCount: doc.sentCount };
};

// Check without incrementing (for pre-launch checks)
emailQuotaSchema.statics.checkAvailable = async function (needed = 1, DAILY_LIMIT = 300) {
  const today = new Date().toISOString().slice(0, 10);
  const doc   = await this.findOne({ date: today });
  const sent  = doc?.sentCount || 0;
  const remaining = DAILY_LIMIT - sent;
  return {
    sufficient: remaining >= needed,
    remaining:  Math.max(0, remaining),
    sentCount:  sent,
    needed,
  };
};

module.exports = mongoose.model('EmailQuota', emailQuotaSchema);