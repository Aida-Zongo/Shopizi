const { z } = require('zod');

const phoneRegex = /^\+?[0-9]{10,15}$/;

const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit avoir au moins 8 caractères'),
  full_name: z.string().min(2, 'Le nom doit avoir au moins 2 caractères').max(255),
  phone_number: z.string().regex(phoneRegex, 'Numéro de téléphone invalide'),
  role: z.enum(['merchant', 'driver', 'customer']).default('customer').optional(),
});

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token requis'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Email invalide'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token requis'),
  newPassword: z.string().min(8, 'Le mot de passe doit avoir au moins 8 caractères'),
});

const updateProfileSchema = z.object({
  full_name: z.string().min(2).max(255).optional(),
  phone_number: z.string().regex(phoneRegex, 'Numéro invalide').optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
  newPassword: z.string().min(8, 'Le nouveau mot de passe doit avoir au moins 8 caractères'),
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  changePasswordSchema,
};