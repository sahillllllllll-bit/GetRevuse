// ════════════════════════════════════════════════════════════════
// controllers/userController.js
// ════════════════════════════════════════════════════════════════
const User = require('../models/User');
const { asyncHandler } = require('../middlewares/asyncHandler');

const success = (res, data, code = 200) =>
  res.status(code).json({ success: true, ...data });

const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findOrCreate(req.user);
  return success(res, {
    user: {
      uid:          user.uid,
      email:        user.email,
      displayName:  user.displayName,
      photoURL:     user.photoURL,
      credits:      user.credits,
      creditsUsed:  user.creditsUsed,
      subscription: user.subscription,
      planLimits:   user.planLimits,
      planLabel:    user.planLabel,
    },
  });
});

const getCredits = asyncHandler(async (req, res) => {
  const user = await User.findOne({ uid: req.user.uid })
    .select('credits creditsUsed creditLog subscription');
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  return success(res, {
    credits:     user.credits,
    creditsUsed: user.creditsUsed,
    plan:        user.subscription?.plan || 'free',
    recentLog:   (user.creditLog || []).slice(-20).reverse(),
  });
});

module.exports = { getProfile, getCredits };