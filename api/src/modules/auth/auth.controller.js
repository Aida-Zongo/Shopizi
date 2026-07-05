const authService = require('./auth.service');
const { successResponse } = require('../../utils/response');

async function register(req, res) {
  const result = await authService.register(req.body);
  return successResponse(res, result, null, 201);
}

async function login(req, res) {
  const result = await authService.login(req.body);
  return successResponse(res, result);
}

async function refreshTokens(req, res) {
  const result = await authService.refreshTokens(req.body.refreshToken);
  return successResponse(res, result);
}

async function logout(req, res) {
  const result = await authService.logout(req.user.userId);
  return successResponse(res, result);
}

async function forgotPassword(req, res) {
  const result = await authService.forgotPassword(req.body.email);
  return successResponse(res, result);
}

async function resetPassword(req, res) {
  const result = await authService.resetPassword(req.body.token, req.body.newPassword);
  return successResponse(res, result);
}

async function getMe(req, res) {
  const result = await authService.getMe(req.user.userId);
  return successResponse(res, result);
}

async function updateProfile(req, res) {
  const result = await authService.updateProfile(req.user.userId, req.body);
  return successResponse(res, result);
}

async function changePassword(req, res) {
  const result = await authService.changePassword(
    req.user.userId,
    req.body.currentPassword,
    req.body.newPassword
  );
  return successResponse(res, result);
}

module.exports = {
  register,
  login,
  refreshTokens,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
  updateProfile,
  changePassword,
};