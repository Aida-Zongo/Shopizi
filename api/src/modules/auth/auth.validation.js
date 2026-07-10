const { z } = require('zod');

const phoneRegex = /^\+?[0-9]{10,15}$/;

const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit avoir au moins 8 caractères'),
  full_name: z.string().min(2, 'Le nom doit avoir au moins 2 caractères').max(255),
  phone_number: z.string().regex(phoneRegex, 'Numéro de téléphone invalide'),
  role: z.enum(['merchant', 'driver', 'customer']).default('customer').optional(),
  // Champs livreur (obligatoires quand role === 'driver', cf. superRefine)
  vehicle_type: z.enum(['moto', 'velo', 'voiture', 'tricycle']).optional(),
  license_plate: z.string().min(2, "Plaque d'immatriculation invalide").max(20).optional(),
  city_id: z.string().uuid('Ville invalide').optional(),
}).superRefine((data, ctx) => {
  if (data.role === 'driver') {
    if (!data.vehicle_type) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['vehicle_type'], message: 'Le type de véhicule est requis pour un livreur' });
    if (!data.license_plate) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['license_plate'], message: "La plaque d'immatriculation est requise pour un livreur" });
    if (!data.city_id) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['city_id'], message: 'La ville de service est requise pour un livreur' });
  }
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