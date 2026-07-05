/**
 * Custom error classes for the Shopizi API.
 * Each error carries an HTTP status code for consistent error responses.
 */

class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Requête invalide', details = null) {
    super(message, 400, details);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Authentification requise', details = null) {
    super(message, 401, details);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Accès refusé', details = null) {
    super(message, 403, details);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Ressource introuvable', details = null) {
    super(message, 404, details);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflit', details = null) {
    super(message, 409, details);
  }
}

class UnprocessableEntityError extends AppError {
  constructor(message = 'Données invalides', details = null) {
    super(message, 422, details);
  }
}

class TooManyRequestsError extends AppError {
  constructor(message = 'Trop de requêtes, veuillez réessayer plus tard', details = null) {
    super(message, 429, details);
  }
}

class InternalServerError extends AppError {
  constructor(message = 'Erreur interne du serveur', details = null) {
    super(message, 500, details);
  }
}

class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporairement indisponible', details = null) {
    super(message, 503, details);
  }
}

class PaymentError extends AppError {
  constructor(message = 'Erreur de paiement', details = null) {
    super(message, 402, details);
  }
}

class SubscriptionLimitError extends ForbiddenError {
  constructor(feature, current, max) {
    super(
      `Limite du plan atteinte : ${feature} (${current}/${max}). Veuillez passer à un plan supérieur.`,
      { feature, current, max }
    );
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  UnprocessableEntityError,
  TooManyRequestsError,
  InternalServerError,
  ServiceUnavailableError,
  PaymentError,
  SubscriptionLimitError,
};