const { ForbiddenError } = require('../utils/errors');

/**
 * Role-based authorization middleware factory.
 *
 * Usage:
 *   router.get('/admin/dashboard', authenticate, authorize('admin'), handler);
 *   router.get('/path', authenticate, authorize('merchant', 'admin'), handler);
 *
 * @param  {...string} roles - Allowed roles
 * @returns {Function} Express middleware
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      throw new ForbiddenError('Authentification requise');
    }

    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError('Vous n\'avez pas les droits pour accéder à cette ressource');
    }

    next();
  };
}

module.exports = authorize;