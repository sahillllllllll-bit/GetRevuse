// services/emailService.js — Brevo (formerly Sendinblue) API
// Replaces SendGrid. Brevo free tier = 300 emails/day.

const axios = require('axios');
const EmailQuota = require('../models/EmailQuota');

// Init Brevo HTTP client (API key set per-request to ensure env is loaded)
const brevoAPI = axios.create({
  baseURL: 'https://api.brevo.com/v3',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to set API key dynamically
brevoAPI.interceptors.request.use((config) => {
  if (!process.env.BREVO_API_KEY) {
    throw new Error('BREVO_API_KEY environment variable is not set');
  }
  config.headers['api-key'] = process.env.BREVO_API_KEY;
  return config;
}, (error) => Promise.reject(error));

const BREVO_DAILY_LIMIT = parseInt(process.env.BREVO_DAILY_LIMIT || '300', 10);

/**
 * Replace {{tokens}} in template strings
 */
function resolveTokens(text, customer, campaign, feedbackPage) {
  const base    = process.env.APP_BASE_URL || 'http://localhost:3000';
  const apiBase = process.env.API_BASE_URL || 'http://localhost:5000';

  const trackingLink = `${apiBase}/api/track/click?cid=${customer.customerId}&camp=${campaign.campaignId}`;

  return (text || '')
    .replace(/\{\{customer_name\}\}/g,  customer.name         || 'Valued Customer')
    .replace(/\{\{business_name\}\}/g,  campaign.businessName || 'Our Business')
    .replace(/\{\{review_link\}\}/g,    trackingLink)
    .replace(/\{\{feedback_link\}\}/g,  `${base}/f/${feedbackPage.slug}?cid=${customer.customerId}`);
}

/**
 * Convert body text to HTML (same as before)
 */
function buildEmailHtml(body, subject, businessName, trackingPixelUrl, primaryColor = '#2563eb') {
  const lines = body.split('\n');
  let html = '';

  lines.forEach((line) => {
    const ctaMatch = line.trim().match(/^\[(.+)\]$/);
    if (ctaMatch) {
      html += `
        <div style="text-align:center;margin:24px 0;">
          <a href="{{REVIEW_LINK_PLACEHOLDER}}"
             style="display:inline-block;background:${primaryColor};color:#ffffff;
                    padding:14px 32px;border-radius:10px;font-size:15px;
                    font-weight:700;text-decoration:none;letter-spacing:0.3px;">
            ${ctaMatch[1]}
          </a>
        </div>`;
    } else if (line.trim() === '') {
      html += '<br/>';
    } else {
      html += `<p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.6;">${line}</p>`;
    }
  });

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:16px;
                  overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <div style="background:${primaryColor};padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${businessName}</h1>
        </div>
        <div style="padding:40px;">${html}</div>
        <div style="background:#f3f4f6;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">
            You received this because you interacted with ${businessName}.<br/>
            <a href="{{UNSUB_LINK}}" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a>
          </p>
        </div>
      </div>
      <img src="${trackingPixelUrl}" width="1" height="1" style="display:none" alt="">
    </body>
    </html>`;
}

/**
 * Send a single review request email via Brevo
 * Throws { code: 'QUOTA_EXCEEDED' } if daily limit is hit
 */
async function sendReviewRequestEmail(customer, campaign, feedbackPage) {
  // ── Quota gate ─────────────────────────────────────────────
  const quota = await EmailQuota.incrementAndCheck(BREVO_DAILY_LIMIT);
  if (!quota.allowed) {
    const err = new Error(`Brevo daily limit of ${BREVO_DAILY_LIMIT} emails reached.`);
    err.code  = 'QUOTA_EXCEEDED';
    throw err;
  }

  const apiBase  = process.env.API_BASE_URL || 'http://localhost:5000';
  const pixelUrl = `${apiBase}/api/track/open?cid=${customer.customerId}&camp=${campaign.campaignId}`;
  const unsubUrl = `${apiBase}/api/track/unsub?cid=${customer.customerId}&camp=${campaign.campaignId}`;
  const ratingUrl = `${process.env.APP_BASE_URL}/f/${feedbackPage.slug}?cid=${customer.customerId}`;

  const subject = resolveTokens(
    campaign.templates.email.subject,
    customer, campaign, feedbackPage
  );

  const bodyResolved = resolveTokens(
    campaign.templates.email.body,
    customer, campaign, feedbackPage
  );

  const html = buildEmailHtml(
    bodyResolved,
    subject,
    campaign.businessName,
    pixelUrl,
    feedbackPage.primaryColor
  )
    .replace(/\{\{REVIEW_LINK_PLACEHOLDER\}\}/g, ratingUrl)
    .replace(/\{\{UNSUB_LINK\}\}/g, unsubUrl);

  const text = bodyResolved.replace(/\[.+\]/g, ratingUrl);

  // ── Build Brevo send email object ──────────────────────────
  const emailPayload = {
    to: [{ email: customer.email, name: customer.name || 'Customer' }],
    sender: {
      email: process.env.BREVO_FROM_EMAIL || 'noreply@getrevuse.com',
      name:  campaign.launch.senderName   || campaign.businessName,
    },
    replyTo: {
      email: campaign.launch.senderEmail || process.env.BREVO_FROM_EMAIL,
    },
    subject: subject,
    htmlContent: html,
    textContent: text,
    tags: [campaign.campaignId, campaign.userId],
    headers: {
      'X-Campaign-Id': campaign.campaignId,
      'X-Customer-Id': customer.customerId,
    },
  };

  try {
    const response = await brevoAPI.post('/smtp/email', emailPayload);
    console.log(`[Brevo] ✓ Email sent to ${customer.email} (messageId: ${response.data.messageId})`);
    return {
      statusCode: 201,
      messageId:  response.data.messageId || null,
    };
  } catch (error) {
    const errorInfo = {
      status: error.response?.status,
      statusText: error.response?.statusText,
      errorData: error.response?.data,
      email: customer.email,
      apiKeyPresent: !!process.env.BREVO_API_KEY,
      apiKeyStart: process.env.BREVO_API_KEY?.substring(0, 20) + '...',
    };
    console.error(`[Brevo] ✗ Email failed to ${customer.email}:`, errorInfo);
    throw error;
  }
}

module.exports = { sendReviewRequestEmail };