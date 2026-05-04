const User = require('../models/User');

const EMAIL_COST = parseInt(process.env.EMAIL_CREDIT_COST || '1', 10);
const SMS_COST   = parseInt(process.env.SMS_CREDIT_COST   || '2', 10);

/**
 * Calculate total credits needed for a campaign
 */
function calculateCampaignCost(channel, customerCount) {
  let costPerCustomer = 0;
  if (channel === 'email') costPerCustomer = EMAIL_COST;
  if (channel === 'sms')   costPerCustomer = SMS_COST;
  if (channel === 'both')  costPerCustomer = EMAIL_COST + SMS_COST;
  return costPerCustomer * customerCount;
}

/**
 * Check if user has enough credits for a campaign
 */
async function checkCredits(userId, channel, customerCount) {
  const user  = await User.findOne({ uid: userId });
  if (!user)  throw new Error('User not found');

  const needed  = calculateCampaignCost(channel, customerCount);
  const balance = user.credits;

  return {
    sufficient:  balance >= needed,
    balance,
    needed,
    shortfall:   Math.max(0, needed - balance),
  };
}

/**
 * Deduct credits for a single send atomically
 * Returns updated user doc or throws if insufficient
 */
async function deductCredit(userId, type, campaignId, customerId) {
  try {
    return await User.deductCreditAtomic(userId, type, campaignId, customerId);
  } catch (err) {
    throw new Error(`Credit deduction failed for user ${userId}: ${err.message}`);
  }
}

/**
 * Get user credit balance
 */
async function getBalance(userId) {
  const user = await User.findOne({ uid: userId }).select('credits creditsUsed subscription');
  if (!user) throw new Error('User not found');
  return {
    credits:     user.credits,
    creditsUsed: user.creditsUsed,
    plan:        user.subscription?.plan || 'free',
  };
}

module.exports = { calculateCampaignCost, checkCredits, deductCredit, getBalance };