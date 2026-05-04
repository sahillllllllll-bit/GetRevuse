const express = require('express');
const router  = express.Router();
const {
  handleSendGridWebhook,
  handleTwilioWebhook,
  trackEmailOpen,
  handleUnsub,
} = require('../controllers/webhookController');

// SendGrid event webhook
router.post('/sendgrid', express.json(), handleSendGridWebhook);

// Twilio status callback (urlencoded from Twilio)
router.post('/twilio/status', express.urlencoded({ extended: false }), handleTwilioWebhook);

module.exports = router;