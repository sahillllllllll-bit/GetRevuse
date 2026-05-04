/**
 * validate.js
 * Request body validation middleware.
 * Returns 400 with field-level errors on failure.
 * No external library needed — pure JS validators.
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isValidURL = (str) => {
  try {
    const url = new URL(str);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
};

const isValidEmail = (str) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);

const VALID_PLATFORMS = [
  'google', 'yelp', 'trustpilot', 'tripadvisor', 'facebook',
  'g2', 'capterra', 'booking', 'glassdoor', 'amazon',
  'houzz', 'healthgrades', 'custom',
];

const VALID_CHANNELS  = ['email', 'sms', 'both'];
const VALID_SCHEDULES = ['now', '1h', '3h', 'tomorrow', 'custom'];
const VALID_FEEDBACK_FIELDS = ['name', 'email', 'phone', 'message', 'rating', 'order'];

// ─── Campaign validator ───────────────────────────────────────────────────────

const validateCampaign = (req, res, next) => {
  const body   = req.body || {};
  const errors = {};

  // ── Step 1: Basics ──────────────────────────────────────────
  if (!body.businessName || typeof body.businessName !== 'string' || !body.businessName.trim()) {
    errors.businessName = 'Business name is required';
  } else if (body.businessName.trim().length < 2) {
    errors.businessName = 'Business name must be at least 2 characters';
  } else if (body.businessName.trim().length > 100) {
    errors.businessName = 'Business name cannot exceed 100 characters';
  }

  if (!body.platform) {
    errors.platform = 'Review platform is required';
  } else if (!VALID_PLATFORMS.includes(body.platform)) {
    errors.platform = `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(', ')}`;
  }

  if (!body.reviewLink || !body.reviewLink.trim()) {
    errors.reviewLink = 'Review link is required';
  } else if (!isValidURL(body.reviewLink)) {
    errors.reviewLink = 'Review link must be a valid URL starting with http:// or https://';
  }

  if (!body.channel) {
    errors.channel = 'Messaging channel is required';
  } else if (!VALID_CHANNELS.includes(body.channel)) {
    errors.channel = `Invalid channel. Must be one of: ${VALID_CHANNELS.join(', ')}`;
  }

  // Customers array
  if (!Array.isArray(body.customers) || body.customers.length === 0) {
    errors.customers = 'At least one customer is required';
  } else if (body.customers.length > 10000) {
    errors.customers = 'Cannot exceed 10,000 customers per campaign';
  } else {
    // Validate first few customers for format
    const sampleErrors = [];
    body.customers.slice(0, 5).forEach((c, i) => {
      if (!c.name || !c.name.trim())
        sampleErrors.push(`Customer ${i + 1}: name is required`);
      if (!c.email && !c.phone)
        sampleErrors.push(`Customer ${i + 1}: email or phone is required`);
      if (c.email && !isValidEmail(c.email))
        sampleErrors.push(`Customer ${i + 1}: invalid email "${c.email}"`);
    });
    if (sampleErrors.length) errors.customers = sampleErrors.join('; ');
  }

  // ── Step 2: Templates ───────────────────────────────────────
  const channel   = body.channel;
  const templates = body.templates || {};

  if (['email', 'both'].includes(channel)) {
    const email = templates.email || {};
    if (!email.subject || !email.subject.trim())
      errors.emailSubject = 'Email subject is required';
    else if (email.subject.length > 200)
      errors.emailSubject = 'Email subject cannot exceed 200 characters';

    if (!email.body || !email.body.trim())
      errors.emailBody = 'Email body is required';
    else if (email.body.length > 10000)
      errors.emailBody = 'Email body cannot exceed 10,000 characters';
  }

  if (['sms', 'both'].includes(channel)) {
    const sms = templates.sms || {};
    if (!sms.body || !sms.body.trim())
      errors.smsBody = 'SMS message is required';
    else {
      const smsLen = sms.body.replace(/\{\{[^}]+\}\}/g, 'XXXXXXXXXX').length;
      if (smsLen > 320)
        errors.smsBody = `SMS message cannot exceed 320 characters (currently ${smsLen})`;
    }
  }

  // ── Step 3: Routing ─────────────────────────────────────────
  const routing = body.routing || {};

  if (routing.threshold !== undefined) {
    const t = Number(routing.threshold);
    if (isNaN(t) || t < 1 || t > 5)
      errors.threshold = 'Threshold must be a number between 1 and 5';
  }

  if (routing.notifyOnNegative && routing.notifyEmail) {
    if (!isValidEmail(routing.notifyEmail))
      errors.notifyEmail = 'Invalid notification email address';
  }

  if (routing.feedbackFields) {
    if (!Array.isArray(routing.feedbackFields))
      errors.feedbackFields = 'Feedback fields must be an array';
    else {
      const invalid = routing.feedbackFields.filter(
        (f) => !VALID_FEEDBACK_FIELDS.includes(f)
      );
      if (invalid.length)
        errors.feedbackFields = `Invalid feedback fields: ${invalid.join(', ')}`;
    }
  }

  // ── Step 4: Launch ──────────────────────────────────────────
  const launch = body.launch || {};

  if (!body.launch?.campaignName || !body.launch.campaignName.trim()) {
    errors.campaignName = 'Campaign name is required';
  } else if (body.launch.campaignName.length > 100) {
    errors.campaignName = 'Campaign name cannot exceed 100 characters';
  }

  if (!launch.senderName || !launch.senderName.trim())
    errors.senderName = 'Sender name is required';

  // Sender email is optional but must be valid if provided
  if (launch.senderEmail && launch.senderEmail.trim()) {
    if (!isValidEmail(launch.senderEmail))
      errors.senderEmail = 'Invalid sender email address';
  }

  // Sender phone is optional - no validation required if not provided

  if (launch.schedule && !VALID_SCHEDULES.includes(launch.schedule)) {
    errors.schedule = `Invalid schedule. Must be one of: ${VALID_SCHEDULES.join(', ')}`;
  }

  if (launch.schedule === 'custom') {
    if (!launch.customDateTime)
      errors.customDateTime = 'Custom date/time is required when schedule is "custom"';
    else {
      const dt = new Date(launch.customDateTime);
      if (isNaN(dt.getTime()))
        errors.customDateTime = 'Invalid date/time format';
      else if (dt <= new Date())
        errors.customDateTime = 'Scheduled time must be in the future';
    }
  }

  // ── Return errors if any ────────────────────────────────────
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  next();
};

// ─── Partial update validator (for PUT /campaigns/:id) ────────────────────────
const validateCampaignUpdate = (req, res, next) => {
  const body   = req.body || {};
  const errors = {};

  // Only validate fields that are present in the update
  if (body.reviewLink !== undefined && !isValidURL(body.reviewLink))
    errors.reviewLink = 'Review link must be a valid URL';

  if (body.platform !== undefined && !VALID_PLATFORMS.includes(body.platform))
    errors.platform = `Invalid platform`;

  if (body.channel !== undefined && !VALID_CHANNELS.includes(body.channel))
    errors.channel = `Invalid channel`;

  if ('routing' in body && body.routing?.notifyEmail) {
    if (!isValidEmail(body.routing.notifyEmail))
      errors.notifyEmail = 'Invalid notification email';
  }

  if ('launch' in body && body.launch?.senderEmail) {
    if (!isValidEmail(body.launch.senderEmail))
      errors.senderEmail = 'Invalid sender email';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  next();
};

module.exports = { validateCampaign, validateCampaignUpdate };