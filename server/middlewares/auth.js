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
      console.error('[auth] No authorization header');
      return res.status(401).json({
        success: false,
        message: 'Authorization token is required',
        code:    'NO_TOKEN',
      });
    }

    const idToken = authHeader.split('Bearer ')[1].trim();

    if (!idToken) {
      console.error('[auth] Empty token after Bearer split');
      return res.status(401).json({
        success: false,
        message: 'Invalid authorization format',
        code:    'INVALID_TOKEN_FORMAT',
      });
    }

    // ✅ Check if Firebase Admin is initialized
    if (!admin.apps.length) {
      console.error('[auth] Firebase Admin NOT initialized!');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error. Firebase not initialized.',
        code:    'FIREBASE_NOT_INIT',
      });
    }

    // Verify the Firebase ID token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (verifyErr) {
      // ✅ Log specific token verification errors
      console.error('[auth] Token verification failed:', {
        code: verifyErr.code,
        message: verifyErr.message,
        tokenLength: idToken.length,
      });
      
      if (verifyErr.code === 'auth/id-token-expired') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired. Please sign in again.',
          code:    'TOKEN_EXPIRED',
        });
      }

      if (verifyErr.code === 'auth/id-token-revoked') {
        return res.status(401).json({
          success: false,
          message: 'Token has been revoked. Please sign in again.',
          code:    'TOKEN_REVOKED',
        });
      }

      if (verifyErr.code === 'auth/argument-error') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token format.',
          code:    'INVALID_TOKEN',
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Token verification failed.',
        code:    'VERIFY_FAILED',
      });
    }

    // ✅ Check if decoded token has required fields
    if (!decodedToken.uid) {
      console.error('[auth] Decoded token missing uid');
      return res.status(401).json({
        success: false,
        message: 'Invalid token payload.',
        code:    'INVALID_PAYLOAD',
      });
    }

    // Attach user info to request
    req.user = {
      uid:     decodedToken.uid,
      email:   decodedToken.email   || null,
      name:    decodedToken.name    || null,
      picture: decodedToken.picture || null,
    };

    console.log('[auth] ✅ Token verified for user:', req.user.uid);

    // ── Auto-create / sync user in MongoDB ────────────────────
    // Runs in background — does NOT block the request
    // First login = creates user doc with 100 free credits
    // Subsequent logins = syncs name/photo if changed
    User.findOrCreate(req.user).catch((err) =>
      console.error('[auth] MongoDB user sync error:', err.message)
    );

    next();
  } catch (error) {
    // ✅ Catch-all error handler with logging
    console.error('[auth] Unexpected error:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });

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
      
      // ✅ Check if Firebase Admin is initialized
      if (!admin.apps.length) {
        console.warn('[optionalAuth] Firebase Admin not initialized, skipping token verification');
        return next();
      }

      try {
        const decoded = await admin.auth().verifyIdToken(idToken);
        req.user = {
          uid:     decoded.uid,
          email:   decoded.email   || null,
          name:    decoded.name    || null,
          picture: decoded.picture || null,
        };

        console.log('[optionalAuth] ✅ Token verified for user:', req.user.uid);

        // Also sync user in background for optional auth
        User.findOrCreate(req.user).catch((err) =>
          console.error('[optionalAuth] MongoDB user sync error:', err.message)
        );
      } catch (verifyErr) {
        // ✅ Log token verification errors but don't block
        console.warn('[optionalAuth] Token verification failed (non-blocking):', verifyErr.code);
        // Continue without user — this is optional auth
      }
    }
  } catch (err) {
    console.warn('[optionalAuth] Unexpected error (non-blocking):', err.message);
  }
  next();
};

module.exports = { auth, optionalAuth };