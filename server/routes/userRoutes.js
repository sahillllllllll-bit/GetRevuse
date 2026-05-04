// ════════════════════════════════════════════════════════════════
// routes/userRoutes.js
// ════════════════════════════════════════════════════════════════
const express = require('express');
const router  = express.Router();
const { auth } = require('../middlewares/auth');
const { getProfile, getCredits } = require('../controllers/userController');

router.get('/profile', auth, getProfile);
router.get('/credits', auth, getCredits);

module.exports = router;