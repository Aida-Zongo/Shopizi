const rateLimit = require('express-rate-limit');
const config = require('../config/index');
const { TooManyRequestsError } = require('../utils/errors');

/**
 * Global rate limiter — applies to all routes.
 * 100 requests per minute by default.
 */
const globalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    throw new TooManyRequestsError(
      'Trop de requêtes. Veuillez réessayer dans une minute.'
    );
  },
  skip: () => config.env === 'test',
});

/**
 * Strict rate limiter for authentication routes.
 * 5 login attempts per minute per IP.
 */
const authLimiter = rateLimit({
  windowMs: 60000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    error: {
      message: 'Trop de tentatives de connexion. Veuillez réessayer dans une minute.',
      statusCode: 429,
    },
  },
  skip: () => config.env === 'test',
});

/**
 * Password reset limiter.
 * 3 requests per hour per IP.
 */
const passwordResetLimiter = rateLimit({
  windowMs: 3600000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    error: {
      message: 'Trop de demandes de réinitialisation. Veuillez réessayer dans une heure.',
      statusCode: 429,
    },
  },
  skip: () => config.env === 'test',
});

module.exports = { globalLimiter, authLimiter, passwordResetLimiter };