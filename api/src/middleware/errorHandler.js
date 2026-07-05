const logger = require('../config/logger');
const { errorResponse } = require('../utils/response');
const { AppError } = require('../utils/errors');

/**
 * Centralized error handler middleware.
 * Maps known error types to appropriate HTTP responses.
 *
 * Must be registered LAST in the middleware chain (after all routes).
 */
function errorHandler(err, req, res, _next) {
  // Log the error
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.userId,
    requestId: req.id,
  });

  // Zod validation error
  if (err.name === 'ZodError') {
    const details = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return errorResponse(res, 'Données invalides', 422, details);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return errorResponse(res, 'Token invalide', 401);
  }
  if (err.name === 'TokenExpiredError') {
    return errorResponse(res, 'Token expiré', 401);
  }

  // Multer file errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return errorResponse(res, 'Fichier trop volumineux', 413);
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return errorResponse(res, 'Trop de fichiers', 413);
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return errorResponse(res, 'Champ de fichier inattendu', 400);
  }

  // PostgreSQL errors
  if (err.code === '23505') {
    // Unique violation
    return errorResponse(res, 'Cette ressource existe déjà', 409);
  }
  if (err.code === '23503') {
    // Foreign key violation
    return errorResponse(res, 'Référence invalide', 400);
  }

  // Known operational errors
  if (err instanceof AppError) {
    return errorResponse(res, err.message, err.statusCode, err.details);
  }

  // Unknown errors — don't leak details in production
  const isProduction = process.env.NODE_ENV === 'production';
  const message = isProduction ? 'Erreur interne du serveur' : err.message;

  return errorResponse(res, message, 500);
}

module.exports = errorHandler;