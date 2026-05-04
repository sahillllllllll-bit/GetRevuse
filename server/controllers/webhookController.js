const Customer    = require('../models/Customer');
const Campaign    = require('../models/Campaign');
const CampaignLog = require('../models/CampaignLog');
const { asyncHandler } = require('../middlewares/asyncHandler');

// ═══════════════════════════════════════════════════════════════
// POST /api/webhooks/sendgrid
// SendGrid event webhook — handles delivery, open, bounce events
// ═══════════════════════════════════════════════════════════════
const handleSendGridWebhook = asyncHandler(async (req, res) => {
  const events = Array.isArray(req.body) ? req.body : [req.body];

  for (const event of events) {
    const { event: eventType, sg_message_id, campaignId, customerId, userId } = event;

    // We embed campaignId/customerId in SendGrid custom args
    if (!campaignId || !customerId) continue;

    try {
      switch (eventType) {
        case 'delivered': {
          await Customer.findOneAndUpdate(
            { customerId },
            { $set: { emailStatus: 'delivered', deliveredAt: new Date() } }
          );
          await Campaign.incrementStat(campaignId, 'totalDelivered');
          await CampaignLog.record({
            campaignId, customerId, userId: userId || 'system',
            eventType: 'delivered', channel: 'email',
            metadata: { messageId: sg_message_id, provider: 'sendgrid' },
          });
          break;
        }

        case 'open': {
          const customer = await Customer.findOne({ customerId });
          if (customer && !customer.emailOpened) {
            customer.emailOpened   = true;
            customer.emailOpenedAt = new Date();
            customer.emailOpenCount += 1;
            await customer.save();
            await Campaign.incrementStat(campaignId, 'totalOpened');
            await CampaignLog.record({
              campaignId, customerId, userId: userId || 'system',
              eventType: 'email_opened', channel: 'email',
              metadata:  { messageId: sg_message_id },
            });
          }
          break;
        }

        case 'bounce':
        case 'blocked': {
          await Customer.findOneAndUpdate(
            { customerId },
            { $set: { emailStatus: 'bounced', status: 'bounced', failedAt: new Date() } }
          );
          await Campaign.incrementStat(campaignId, 'totalBounced');
          await CampaignLog.record({
            campaignId, customerId, userId: userId || 'system',
            eventType: 'bounced', channel: 'email',
            metadata:  { messageId: sg_message_id, bounceType: eventType === 'bounce' ? 'hard' : 'soft' },
          });
          break;
        }

        case 'unsubscribe':
        case 'spamreport': {
          await Customer.findOneAndUpdate(
            { customerId },
            { $set: { status: 'unsubscribed' } }
          );
          await CampaignLog.record({
            campaignId, customerId, userId: userId || 'system',
            eventType: 'unsubscribed', channel: 'email', metadata: {},
          });
          break;
        }
      }
    } catch (err) {
      console.error(`[Webhook] SendGrid event error for ${customerId}:`, err.message);
    }
  }

  // Always return 200 to SendGrid
  res.status(200).json({ received: true });
});

// ═══════════════════════════════════════════════════════════════
// POST /api/webhooks/twilio/status
// Twilio message status callback
// ═══════════════════════════════════════════════════════════════
const handleTwilioWebhook = asyncHandler(async (req, res) => {
  const { MessageSid, MessageStatus, To } = req.body;

  if (!MessageSid) return res.status(200).send('OK');

  try {
    // Find customer by SMS message ID
    const customer = await Customer.findOne({
      'externalIds.smsMessageId': MessageSid,
    });

    if (!customer) {
      return res.status(200).send('OK');
    }

    const statusMap = {
      delivered: 'delivered',
      failed:    'failed',
      undelivered: 'bounced',
    };

    const newStatus = statusMap[MessageStatus];
    if (newStatus) {
      customer.smsStatus = newStatus;
      if (newStatus === 'delivered') {
        customer.deliveredAt = new Date();
        await Campaign.incrementStat(customer.campaignId, 'totalDelivered');
      }
      if (newStatus === 'failed' || newStatus === 'bounced') {
        customer.failedAt = new Date();
        await Campaign.incrementStat(customer.campaignId, 'totalFailed');
      }
      await customer.save();

      await CampaignLog.record({
        campaignId: customer.campaignId,
        customerId: customer.customerId,
        userId:     customer.userId,
        eventType:  newStatus === 'delivered' ? 'delivered' : 'failed',
        channel:    'sms',
        metadata:   { messageId: MessageSid, provider: 'twilio' },
      });
    }
  } catch (err) {
    console.error('[Webhook] Twilio error:', err.message);
  }

  res.status(200).send('OK');
});

// ═══════════════════════════════════════════════════════════════
// GET /api/track/open  — Email open tracking pixel
// ═══════════════════════════════════════════════════════════════
const trackEmailOpen = asyncHandler(async (req, res) => {
  const { cid, camp } = req.query;

  if (cid && camp) {
    try {
      const customer = await Customer.findOne({ customerId: cid });
      if (customer && !customer.emailOpened) {
        customer.emailOpened    = true;
        customer.emailOpenedAt  = new Date();
        customer.emailOpenCount += 1;
        await customer.save();
        await Campaign.incrementStat(camp, 'totalOpened');
        await CampaignLog.record({
          campaignId: camp, customerId: cid,
          userId: customer.userId, eventType: 'email_opened', channel: 'email',
          metadata: { ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress },
        });
      }
    } catch (_) {}
  }

  // Return 1x1 transparent GIF
  const pixel = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'
  );
  res.set({ 'Content-Type': 'image/gif', 'Cache-Control': 'no-cache, no-store' });
  res.send(pixel);
});

// ═══════════════════════════════════════════════════════════════
// GET /api/track/unsub  — Unsubscribe handler
// ═══════════════════════════════════════════════════════════════
const handleUnsub = asyncHandler(async (req, res) => {
  const { cid, camp } = req.query;
  if (cid) {
    try {
      await Customer.findOneAndUpdate(
        { customerId: cid },
        { $set: { status: 'unsubscribed' } }
      );
    } catch (_) {}
  }
  const base = process.env.APP_BASE_URL || 'http://localhost:3000';
  res.redirect(`${base}/unsubscribed`);
});

module.exports = {
  handleSendGridWebhook,
  handleTwilioWebhook,
  trackEmailOpen,
  handleUnsub,
};