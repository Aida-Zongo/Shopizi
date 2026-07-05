const { Router } = require('express');
const controller = require('./auth.controller');
const { authenticate } = require('../../middleware/authenticate');
const validate = require('../../middleware/validate');
const asyncHandler = require('../../middleware/asyncHandler');
const { authLimiter, passwordResetLimiter } = require('../../middleware/rateLimiter');
const {
  registerSchema, loginSchema, refreshSchema, forgotPasswordSchema,
  resetPasswordSchema, updateProfileSchema, changePasswordSchema,
} = require('./auth.validation');

const router = Router();

router.post('/register', validate({ body: registerSchema }), asyncHandler(controller.register));
router.post('/login', authLimiter, validate({ body: loginSchema }), asyncHandler(controller.login));
router.post('/refresh', validate({ body: refreshSchema }), asyncHandler(controller.refreshTokens));
router.post('/logout', authenticate, asyncHandler(controller.logout));
router.post('/forgot-password', passwordResetLimiter, validate({ body: forgotPasswordSchema }), asyncHandler(controller.forgotPassword));
router.post('/reset-password', passwordResetLimiter, validate({ body: resetPasswordSchema }), asyncHandler(controller.resetPassword));
router.get('/me', authenticate, asyncHandler(controller.getMe));
router.put('/me', authenticate, validate({ body: updateProfileSchema }), asyncHandler(controller.updateProfile));
router.put('/me/password', authenticate, validate({ body: changePasswordSchema }), asyncHandler(controller.changePassword));

module.exports = router;