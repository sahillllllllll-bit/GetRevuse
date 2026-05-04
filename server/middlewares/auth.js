const admin = require('firebase-admin');
const User  = require('../models/User');

/**
 * Middleware: Verify Firebase ID token from Authorization header.
 *
 * Expects: Authorization: Bearer <firebase_id_token>
 *
 * On success: attaches req.user = { uid, email, name, picture }
 *             + auto-creates/syncs user in MongoDB (background, non-blocking)
 * On failure: returns 401
 */
const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token is required',
        code:    'NO_TOKEN',
      });
    }

    const idToken = authHeader.split('Bearer ')[1].trim();

    if (!idToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authorization format',
        code:    'INVALID_TOKEN_FORMAT',
      });
    }

    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Attach user info to request
    req.user = {
      uid:     decodedToken.uid,
      email:   decodedToken.email   || null,
      name:    decodedToken.name    || null,
      picture: decodedToken.picture || null,
    };

    // ── Auto-create / sync user in MongoDB ────────────────────
    // Runs in background — does NOT block the request
    // First login = creates user doc with 100 free credits
    // Subsequent logins = syncs name/photo if changed
    User.findOrCreate(req.user).catch((err) =>
      console.error('[auth] MongoDB user sync error:', err.message)
    );

    next();
  } catch (error) {
    // Handle specific Firebase auth errors
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please sign in again.',
        code:    'TOKEN_EXPIRED',
      });
    }

    if (error.code === 'auth/id-token-revoked') {
      return res.status(401).json({
        success: false,
        message: 'Token has been revoked. Please sign in again.',
        code:    'TOKEN_REVOKED',
      });
    }

    if (error.code === 'auth/argument-error') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format.',
        code:    'INVALID_TOKEN',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Authentication failed.',
      code:    'AUTH_FAILED',
    });
  }
};

/**
 * Optional auth — attaches req.user if token present, but doesn't block.
 * Use for public endpoints that behave differently for logged-in users.
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const idToken = authHeader.split('Bearer ')[1].trim();
      const decoded = await admin.auth().verifyIdToken(idToken);
      req.user = {
        uid:     decoded.uid,
        email:   decoded.email   || null,
        name:    decoded.name    || null,
        picture: decoded.picture || null,
      };

      // Also sync user in background for optional auth
      User.findOrCreate(req.user).catch((err) =>
        console.error('[optionalAuth] MongoDB user sync error:', err.message)
      );
    }
  } catch (_) {
    // Silently ignore — optional auth
  }
  next();
};

module.exports = { auth, optionalAuth };