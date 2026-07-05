const jwt = require('jsonwebtoken');
const config = require('../config/index');

/**
 * Sign an access token
 * @param {Object} payload - Token payload { userId, role, shopId, planSlug }
 * @returns {string} Signed JWT access token
 */
function signAccessToken(payload) {
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn,
  });
}

/**
 * Sign a refresh token
 * @param {Object} payload - Token payload { userId, tokenVersion }
 * @returns {string} Signed JWT refresh token
 */
function signRefreshToken(payload) {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
}

/**
 * Verify an access token
 * @param {string} token - JWT access token
 * @returns {Object} Decoded payload
 * @throws {jwt.JsonWebTokenError} If token is invalid
 */
function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.accessSecret);
}

/**
 * Verify a refresh token
 * @param {string} token - JWT refresh token
 * @returns {Object} Decoded payload
 * @throws {jwt.JsonWebTokenError} If token is invalid
 */
function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwt.refreshSecret);
}

/**
 * Decode a token without verification (for extracting payload)
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded payload or null
 */
function decodeToken(token) {
  return jwt.decode(token);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
};