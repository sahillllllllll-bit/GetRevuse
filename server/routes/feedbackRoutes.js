const express = require('express');
const router  = express.Router();
const { auth } = require('../middlewares/auth');
const {
  getPublicFeedbackPage,
  submitRating,
  submitFeedback,
  getFeedbackList,
  updateFeedbackStatus,
} = require('../controllers/feedbackController');

// ── Public routes (no auth) ───────────────────────────────────
router.get('/:slug',          getPublicFeedbackPage);
router.post('/:slug/rate',    submitRating);
router.post('/:slug/submit',  submitFeedback);

// ── Dashboard routes (auth required) ─────────────────────────
router.get('/',               auth, getFeedbackList);
router.patch('/:id/status',   auth, updateFeedbackStatus);

module.exports = router;