const crypto = require('crypto');

/**
 * Verify LemonSqueezy webhook signature
 * Must be used BEFORE express.json() on the webhook route
 * so we can access the raw body for HMAC verification
 */
const verifyLemonSqueezyWebhook = (req, res, next) => {
  const secret    = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  const signature = req.headers['x-signature'];

  if (!secret) {
    console.error('[Webhook] LEMONSQUEEZY_WEBHOOK_SECRET not set');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  if (!signature) {
    console.warn('[Webhook] Missing x-signature header');
    return res.status(401).json({ error: 'Missing signature' });
  }

  // Raw body must be captured before JSON parsing
  // Use express.raw() on this route
  const rawBody = req.body;
  if (!rawBody || !Buffer.isBuffer(rawBody)) {
    return res.status(400).json({ error: 'Raw body required for webhook verification' });
  }

  try {
    const hmac     = crypto.createHmac('sha256', secret);
    const digest   = hmac.update(rawBody).digest('hex');
    const trusted  = Buffer.from(digest, 'hex');
    const incoming = Buffer.from(signature, 'hex');

    // Timing-safe comparison to prevent timing attacks
    if (trusted.length !== incoming.length || !crypto.timingSafeEqual(trusted, incoming)) {
      console.warn('[Webhook] Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Parse body after verification
    req.body = JSON.parse(rawBody.toString('utf8'));
    next();
  } catch (err) {
    console.error('[Webhook] Signature verification error:', err.message);
    return res.status(401).json({ error: 'Signature verification failed' });
  }
};

module.exports = { verifyLemonSqueezyWebhook };