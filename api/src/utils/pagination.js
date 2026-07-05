/**
 * Parse and normalize pagination query parameters.
 *
 * @param {Object} query - Express req.query object
 * @param {Object} defaults - Default values { page, limit, maxLimit }
 * @returns {Object} { page, limit, offset }
 */
function parsePagination(query, defaults = {}) {
  const defaultPage = defaults.page || 1;
  const defaultLimit = defaults.limit || 20;
  const maxLimit = defaults.maxLimit || 100;

  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);

  if (isNaN(page) || page < 1) page = defaultPage;
  if (isNaN(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;

  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

module.exports = { parsePagination };