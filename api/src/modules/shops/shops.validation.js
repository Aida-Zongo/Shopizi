const { z } = require('zod');

const shopCategories = ['shop','restaurant','pharmacy','artisan','service','other'];
const phoneRegex = /^\+?[0-9]{8,15}$/;
const subdomainRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

const createShopSchema = z.object({
  subdomain: z.string().min(3).max(63).regex(subdomainRegex, 'Sous-domaine invalide'),
  name: z.string().min(2).max(255),
  category: z.enum(shopCategories),
  description: z.string().max(5000).optional(),
  whatsapp_number: z.string().regex(phoneRegex, 'Numéro WhatsApp invalide'),
  phone_number: z.string().regex(phoneRegex).optional(),
  email: z.string().email().optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  neighborhood: z.string().max(100).optional(),
  opening_hours: z.record(z.object({ open: z.string(), close: z.string() })).optional(),
});

const updateShopSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  category: z.enum(shopCategories).optional(),
  description: z.string().max(5000).optional().nullable(),
  whatsapp_number: z.string().regex(phoneRegex).optional(),
  phone_number: z.string().regex(phoneRegex).optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  city_id: z.string().uuid('Ville invalide').optional().nullable(),
  neighborhood: z.string().max(100).optional().nullable(),
  primary_color: z.string().regex(hexColorRegex).optional(),
  secondary_color: z.string().regex(hexColorRegex).optional(),
  opening_hours: z.record(z.object({ open: z.string(), close: z.string() })).optional(),
  social_links: z.record(z.string()).optional(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
});

const publishSchema = z.object({ is_published: z.boolean() });

const domainSchema = z.object({ custom_domain: z.string().min(4).max(255) });

module.exports = { createShopSchema, updateShopSchema, publishSchema, domainSchema };