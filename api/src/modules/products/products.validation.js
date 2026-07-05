const { z } = require('zod');

const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  price_xof: z.number().int().min(0),
  sale_price_xof: z.number().int().min(0).optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  stock_status: z.enum(['in_stock','low_stock','out_of_stock','on_order','discontinued']).optional(),
  stock_quantity: z.number().int().min(0).optional(),
  unit: z.string().max(50).optional(),
  sku: z.string().max(100).optional(),
  is_featured: z.boolean().optional(),
  is_published: z.boolean().optional(),
  has_variants: z.boolean().optional(),
});

const updateProductSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional().nullable(),
  price_xof: z.number().int().min(0).optional(),
  sale_price_xof: z.number().int().min(0).optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  stock_status: z.enum(['in_stock','low_stock','out_of_stock','on_order','discontinued']).optional(),
  stock_quantity: z.number().int().min(0).optional(),
  unit: z.string().max(50).optional().nullable(),
  sku: z.string().max(100).optional().nullable(),
  is_featured: z.boolean().optional(),
  is_published: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

const createVariantSchema = z.object({
  type: z.string().max(50),
  name: z.string().max(100),
  price_adjustment_xof: z.number().int().optional(),
  stock_quantity: z.number().int().min(0).optional(),
  sku: z.string().max(100).optional(),
});

const reorderSchema = z.object({
  items: z.array(z.object({ id: z.string().uuid(), sort_order: z.number().int() })),
});

module.exports = { createProductSchema, updateProductSchema, createVariantSchema, reorderSchema };