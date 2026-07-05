const { verifyAccessToken } = require('../utils/jwt');
const { UnauthorizedError } = require('../utils/errors');

/**
 * JWT authentication middleware.
 * Extracts Bearer token from Authorization header, verifies it,
 * and attaches the decoded user payload to req.user.
 *
 * Attaches: { userId, role, shopId, planSlug }
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new UnauthorizedError('Token d\'authentification requis');
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    throw new UnauthorizedError('Format de token invalide. Utilisez : Bearer <token>');
  }

  const token = parts[1];

  try {
    const decoded = verifyAccessToken(token);
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      shopId: decoded.shopId || null,
      planSlug: decoded.planSlug || 'free',
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Token expiré, veuillez vous reconnecter');
    }
    throw new UnauthorizedError('Token invalide');
  }
}

/**
 * Optional authentication middleware.
 * If a valid token is present, attaches user to req.
 * If no token or invalid token, continues without error (req.user = null).
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    req.user = null;
    return next();
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    req.user = null;
    return next();
  }

  try {
    const decoded = verifyAccessToken(parts[1]);
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      shopId: decoded.shopId || null,
      planSlug: decoded.planSlug || 'free',
    };
  } catch {
    req.user = null;
  }

  next();
}

module.exports = { authenticate, optionalAuth };