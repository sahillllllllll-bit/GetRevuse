const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * Replace {{tokens}} in SMS template
 */
function resolveTokens(text, customer, campaign, feedbackPage) {
  const base    = process.env.APP_BASE_URL || 'http://localhost:3000';
  const ratingUrl = `${base}/f/${feedbackPage.slug}?cid=${customer.customerId}`;

  return (text || '')
    .replace(/\{\{customer_name\}\}/g,  customer.name         || 'Hi')
    .replace(/\{\{business_name\}\}/g,  campaign.businessName || 'Our Business')
    .replace(/\{\{review_link\}\}/g,    ratingUrl)
    .replace(/\{\{feedback_link\}\}/g,  ratingUrl);
}

/**
 * Send a single review request SMS via Twilio
 */
async function sendReviewRequestSMS(customer, campaign, feedbackPage) {
  if (!customer.phone) {
    throw new Error(`Customer ${customer.customerId} has no phone number`);
  }

  const body = resolveTokens(
    campaign.templates.sms.body,
    customer,
    campaign,
    feedbackPage
  );

  const apiBase    = process.env.API_BASE_URL || 'http://localhost:5000';
  const statusCbUrl = `${apiBase}/api/webhooks/twilio/status`;

  const messageOptions = {
    body,
    to:         customer.phone,
    statusCallback: statusCbUrl,
    // Store metadata for webhook correlation
    // (Twilio passes these back in status callbacks)
  };

  // Use Messaging Service SID if configured (recommended)
  if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
    messageOptions.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  } else {
    messageOptions.from = process.env.TWILIO_FROM_NUMBER;
  }

  const message = await client.messages.create(messageOptions);

  return {
    messageSid: message.sid,
    status:     message.status,
  };
}

module.exports = { sendReviewRequestSMS };