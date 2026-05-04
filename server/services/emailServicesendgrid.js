// const sgMail  = require('@sendgrid/mail');
const Campaign = require('../models/Campaign');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Replace {{tokens}} in template strings
 */
function resolveTokens(text, customer, campaign, feedbackPage) {
  const base    = process.env.APP_BASE_URL || 'http://localhost:3000';
  const apiBase = process.env.API_BASE_URL || 'http://localhost:5000';

  // Tracking redirect link (goes through our API to record the click)
  const trackingLink = `${apiBase}/api/track/click?cid=${customer.customerId}&camp=${campaign.campaignId}`;

  return (text || '')
    .replace(/\{\{customer_name\}\}/g,  customer.name         || 'Valued Customer')
    .replace(/\{\{business_name\}\}/g,  campaign.businessName || 'Our Business')
    .replace(/\{\{review_link\}\}/g,    trackingLink)
    .replace(/\{\{feedback_link\}\}/g,  `${base}/f/${feedbackPage.slug}?cid=${customer.customerId}`);
}

/**
 * Convert body text to HTML
 * - Wraps paragraphs in <p>
 * - Converts [Button Text] to styled CTA buttons
 * - Injects tracking pixel
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

        <!-- Header -->
        <div style="background:${primaryColor};padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${businessName}</h1>
        </div>

        <!-- Body -->
        <div style="padding:40px;">
          ${html}
        </div>

        <!-- Footer -->
        <div style="background:#f3f4f6;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">
            You received this because you interacted with ${businessName}.<br/>
            <a href="{{UNSUB_LINK}}" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a>
          </p>
        </div>
      </div>

      <!-- Tracking pixel -->
      <img src="${trackingPixelUrl}" width="1" height="1" style="display:none" alt="">
    </body>
    </html>`;
}

/**
 * Send a single review request email via SendGrid
 */
async function sendReviewRequestEmail(customer, campaign, feedbackPage) {
  const apiBase   = process.env.API_BASE_URL || 'http://localhost:5000';
  const pixelUrl  = `${apiBase}/api/track/open?cid=${customer.customerId}&camp=${campaign.campaignId}`;
  const unsubUrl  = `${apiBase}/api/track/unsub?cid=${customer.customerId}&camp=${campaign.campaignId}`;
  const ratingUrl = `${process.env.APP_BASE_URL}/f/${feedbackPage.slug}?cid=${customer.customerId}`;

  const subject = resolveTokens(
    campaign.templates.email.subject,
    customer, campaign, feedbackPage
  );

  let bodyResolved = resolveTokens(
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

  // Plain text fallback
  const text = bodyResolved.replace(/\[.+\]/g, ratingUrl);

  const msg = {
    to:   customer.email,
    from: {
      email: process.env.SENDGRID_FROM_EMAIL || 'noreply@getrevuse.com',
      name:  campaign.launch.senderName      || campaign.businessName,
    },
    replyTo: campaign.launch.senderEmail || process.env.SENDGRID_FROM_EMAIL,
    subject,
    text,
    html,
    // SendGrid custom args for webhook correlation
    customArgs: {
      campaignId: campaign.campaignId,
      customerId: customer.customerId,
      userId:     campaign.userId,
    },
    // Tracking settings
    trackingSettings: {
      clickTracking:    { enable: false }, // we do our own
      openTracking:     { enable: false }, // we do our own via pixel
      subscriptionTracking: { enable: false },
    },
  };

  const [response] = await sgMail.send(msg);
  return {
    statusCode: response.statusCode,
    messageId:  response.headers['x-message-id'] || null,
  };
}

module.exports = { sendReviewRequestEmail };