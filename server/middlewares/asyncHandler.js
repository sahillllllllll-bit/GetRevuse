/**
 * asyncHandler
 * Wraps async route handlers so errors are forwarded to Express error middleware
 * instead of crashing or hanging the request.
 *
 * Usage:
 *   router.get('/route', asyncHandler(async (req, res) => { ... }))
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * notFound
 * Catch-all for unmatched routes — must be registered AFTER all routes.
 */
const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

/**
 * globalErrorHandler
 * Central error handler — must be the LAST middleware registered in app.js.
 *
 * Usage in app.js:
 *   const { notFound, globalErrorHandler } = require('./middleware/asyncHandler');
 *   app.use(notFound);
 *   app.use(globalErrorHandler);
 */
const globalErrorHandler = (err, req, res, _next) => {
  // Default to 500 if no status code set
  let statusCode = err.statusCode || err.status || 500;
  let message    = err.message    || 'Internal server error';
  let errors     = err.errors     || null;   // field-level validation errors

  // ── Mongoose validation error ───────────────────────────────
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message    = 'Validation failed';
    errors     = Object.values(err.errors).reduce((acc, e) => {
      acc[e.path] = e.message;
      return acc;
    }, {});
  }

  // ── Mongoose duplicate key ──────────────────────────────────
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message    = `Duplicate value for ${field}`;
    errors     = { [field]: `This ${field} already exists` };
  }

  // ── Mongoose cast error (bad ObjectId / type) ───────────────
  if (err.name === 'CastError') {
    statusCode = 400;
    message    = `Invalid value for field: ${err.path}`;
  }

  // ── JWT / Firebase errors already handled in auth middleware ─

  // Log unexpected 5xx errors
  if (statusCode >= 500) {
    console.error(`[ERROR] ${req.method} ${req.originalUrl}`, {
      message: err.message,
      // stack:   process.env.NODE_ENV === 'development' ? err.stack : undefined,
      stack: err.stack,
    });
  }

  const response = {
    success: false,
    message,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === 'development' && statusCode >= 500 && {
      stack: err.stack,
    }),
  };

  res.status(statusCode).json(response);
};

module.exports = { asyncHandler, notFound, globalErrorHandler };