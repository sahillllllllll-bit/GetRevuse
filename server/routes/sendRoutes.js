// ════════════════════════════════════════════════════════════════
// routes/sendRoutes.js
// ════════════════════════════════════════════════════════════════
const express = require('express');
const router  = express.Router();
const { auth } = require('../middlewares/auth');
const { launchCampaign, getCampaignSendStatus } = require('../controllers/sendController');

router.post('/campaign/:id',        auth, launchCampaign);
router.get('/campaign/:id/status',  auth, getCampaignSendStatus);

module.exports = router;