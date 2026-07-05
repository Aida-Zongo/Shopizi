const { ZodError } = require('zod');
const { UnprocessableEntityError } = require('../utils/errors');

/**
 * Request validation middleware factory using Zod schemas.
 *
 * Usage:
 *   router.post('/path', validate({ body: createUserSchema }), handler);
 *   router.get('/path', validate({ query: listSchema }), handler);
 *   router.get('/path/:id', validate({ params: idSchema }), handler);
 *   router.put('/path/:id', validate({ body: updateSchema, params: idSchema }), handler);
 *
 * @param {Object} schemas - { body?, query?, params? } Zod schemas
 * @returns {Function} Express middleware
 */
function validate(schemas) {
  return (req, res, next) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        throw new UnprocessableEntityError('Données invalides', details);
      }
      next(err);
    }
  };
}

module.exports = validate;