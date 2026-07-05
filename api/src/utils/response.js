/**
 * Standardized API response builder.
 * All API responses follow the envelope: { success, data, meta, error }
 */

/**
 * Build a success response
 * @param {Object} res - Express response object
 * @param {*} data - Response payload
 * @param {Object} meta - Metadata (pagination, etc.)
 * @param {number} statusCode - HTTP status code (default 200)
 */
function successResponse(res, data = null, meta = null, statusCode = 200) {
  const body = {
    success: true,
    data: data !== null ? data : undefined,
    error: null,
  };

  if (meta) {
    body.meta = meta;
  }

  return res.status(statusCode).json(body);
}

/**
 * Build an error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {*} details - Optional error details
 */
function errorResponse(res, message, statusCode = 500, details = null) {
  const body = {
    success: false,
    data: null,
    error: {
      message,
      statusCode,
    },
  };

  if (details) {
    body.error.details = details;
  }

  return res.status(statusCode).json(body);
}

/**
 * Build pagination metadata
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @returns {Object} Pagination metadata
 */
function paginationMeta(page, limit, total) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasNextPage: page * limit < total,
    hasPrevPage: page > 1,
  };
}

module.exports = { successResponse, errorResponse, paginationMeta };