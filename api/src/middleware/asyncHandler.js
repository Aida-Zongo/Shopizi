/**
 * Wraps an async route handler to catch errors and forward them to
 * the Express error handler via next(err).
 *
 * Usage:
 *   router.get('/path', asyncHandler(async (req, res) => { ... }));
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;