const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  plan: {
    type: String,
    enum: ['free', 'starter', 'pro', 'advanced'],
    default: 'free',
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'past_due', 'trialing'],
    default: 'active',
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly', null],
    default: null,
  },
  currentPeriodStart: { type: Date, default: null },
  currentPeriodEnd:   { type: Date, default: null },
  stripeCustomerId:   { type: String, default: null },
  stripeSubId:        { type: String, default: null },
}, { _id: false });

const creditLogSchema = new mongoose.Schema({
  type:        { type: String, enum: ['email', 'sms', 'topup', 'refund', 'bonus'], required: true },
  amount:      { type: Number, required: true },   // negative = deduction, positive = addition
  balanceAfter:{ type: Number, required: true },
  campaignId:  { type: String, default: null },
  customerId:  { type: String, default: null },
  note:        { type: String, default: null },
  createdAt:   { type: Date,   default: Date.now },
}, { _id: true });

const userSchema = new mongoose.Schema({
  // ── Firebase UID ─────────────────────────────────────────────
  uid: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },

  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },

  displayName: { type: String, default: null },
  photoURL:    { type: String, default: null },

  // ── Credits ──────────────────────────────────────────────────
  credits: {
    type: Number,
    default: parseInt(process.env.DEFAULT_FREE_CREDITS || '100', 10),
    min: 0,
  },

  creditsUsed: { type: Number, default: 0 },

  creditLog: {
    type: [creditLogSchema],
    default: [],
    // Keep only last 500 entries
  },

  // ── Subscription ─────────────────────────────────────────────
  subscription: {
    type: subscriptionSchema,
    default: () => ({}),
  },

  // ── Plan limits ───────────────────────────────────────────────
  planLimits: {
    campaignsPerMonth: { type: Number, default: 3 },
    customersPerCampaign: { type: Number, default: 500 },
    emailsPerDay: { type: Number, default: 100 },
    smsPerDay:    { type: Number, default: 50 },
  },

  // ── Onboarding ───────────────────────────────────────────────
  onboardingComplete: { type: Boolean, default: false },
  isDeleted:          { type: Boolean, default: false },
}, {
  timestamps: true,
  toJSON:    { virtuals: true },
  toObject:  { virtuals: true },
});

// ─── Virtuals ─────────────────────────────────────────────────
userSchema.virtual('hasCredits').get(function () {
  return this.credits > 0;
});

userSchema.virtual('planLabel').get(function () {
  const map = { free: 'Free', starter: 'Starter', pro: 'Pro', advanced: 'Advanced' };
  return map[this.subscription.plan] || 'Free';
});

// ─── Methods ──────────────────────────────────────────────────

// Deduct credits atomically and log it
userSchema.methods.deductCredit = async function (type, campaignId = null, customerId = null) {
  const cost = type === 'sms'
    ? parseInt(process.env.SMS_CREDIT_COST   || '2', 10)
    : parseInt(process.env.EMAIL_CREDIT_COST || '1', 10);

  if (this.credits < cost) {
    throw new Error(`Insufficient credits. Need ${cost}, have ${this.credits}.`);
  }

  this.credits     -= cost;
  this.creditsUsed += cost;

  // Keep credit log trimmed to last 500
  if (this.creditLog.length >= 500) this.creditLog.shift();

  this.creditLog.push({
    type,
    amount:       -cost,
    balanceAfter: this.credits,
    campaignId,
    customerId,
    note: `${type.toUpperCase()} sent`,
  });

  return this.save();
};

// Add credits (top-up / bonus)
userSchema.methods.addCredits = async function (amount, note = 'Top-up') {
  this.credits += amount;
  if (this.creditLog.length >= 500) this.creditLog.shift();
  this.creditLog.push({
    type:         'topup',
    amount:       +amount,
    balanceAfter: this.credits,
    note,
  });
  return this.save();
};

// ─── Statics ──────────────────────────────────────────────────

// Find or create user from Firebase token
userSchema.statics.findOrCreate = async function (firebaseUser) {
  let user = await this.findOne({ uid: firebaseUser.uid });
  if (!user) {
    user = await this.create({
      uid:         firebaseUser.uid,
      email:       firebaseUser.email,
      displayName: firebaseUser.name    || null,
      photoURL:    firebaseUser.picture || null,
    });
  } else {
    // Sync display name / photo if changed
    if (firebaseUser.name    && user.displayName !== firebaseUser.name)    user.displayName = firebaseUser.name;
    if (firebaseUser.picture && user.photoURL    !== firebaseUser.picture) user.photoURL    = firebaseUser.picture;
    await user.save();
  }
  return user;
};

// Atomic credit deduction (safer for concurrent requests)
userSchema.statics.deductCreditAtomic = async function (uid, type, campaignId, customerId) {
  const cost = type === 'sms'
    ? parseInt(process.env.SMS_CREDIT_COST   || '2', 10)
    : parseInt(process.env.EMAIL_CREDIT_COST || '1', 10);

  const logEntry = {
    type,
    amount:      -cost,
    balanceAfter: 0,  // will be set below
    campaignId:  campaignId || null,
    customerId:  customerId || null,
    note:        `${type.toUpperCase()} sent`,
    createdAt:   new Date(),
  };

  const updated = await this.findOneAndUpdate(
    { uid, credits: { $gte: cost } },
    {
      $inc: { credits: -cost, creditsUsed: cost },
      $push: {
        creditLog: {
          $each:  [logEntry],
          $slice: -500,
        },
      },
    },
    { new: true }
  );

  if (!updated) throw new Error('Insufficient credits');
  return updated;
};

const User = mongoose.model('User', userSchema);
module.exports = User;