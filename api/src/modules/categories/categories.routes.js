const { Router } = require('express');
const { z } = require('zod');
const { query } = require('../../db/pool');
const { slugify } = require('../../utils/slug');
const { authenticate } = require('../../middleware/authenticate');
const validate = require('../../middleware/validate');
const asyncHandler = require('../../middleware/asyncHandler');
const subscriptionGate = require('../../middleware/subscriptionGate');
const { successResponse } = require('../../utils/response');
const { NotFoundError } = require('../../utils/errors');

const router = Router();

const createSchema = z.object({ name: z.string().min(1).max(100), description: z.string().optional(), parent_id: z.string().uuid().optional().nullable() });
const updateSchema = z.object({ name: z.string().min(1).max(100).optional(), description: z.string().optional().nullable(), parent_id: z.string().uuid().optional().nullable() });

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const result = await query('SELECT c.*, (SELECT COUNT(*)::int FROM products WHERE category_id = c.id) AS product_count FROM categories c WHERE c.shop_id = $1 ORDER BY c.sort_order, c.name', [req.user.shopId]);
  return successResponse(res, result.rows);
}));

router.post('/', authenticate, subscriptionGate('category.create'), validate({ body: createSchema }), asyncHandler(async (req, res) => {
  const slug = slugify(req.body.name);
  const r = await query('INSERT INTO categories (shop_id, name, slug, description, parent_id) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [req.user.shopId, req.body.name, slug, req.body.description || null, req.body.parent_id || null]);
  return successResponse(res, r.rows[0], null, 201);
}));

router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const r = await query('SELECT c.*, (SELECT COUNT(*)::int FROM products WHERE category_id = c.id) AS product_count FROM categories c WHERE c.id = $1 AND c.shop_id = $2', [req.params.id, req.user.shopId]);
  if (r.rows.length === 0) throw new NotFoundError('Catégorie introuvable');
  return successResponse(res, r.rows[0]);
}));

router.put('/:id', authenticate, validate({ body: updateSchema }), asyncHandler(async (req, res) => {
  const d = req.body; const params = []; let i = 1; const sets = [];
  if (d.name) { sets.push(`name = $${i++}`); params.push(d.name); sets.push(`slug = $${i++}`); params.push(slugify(d.name)); }
  if (d.description !== undefined) { sets.push(`description = $${i++}`); params.push(d.description); }
  if (d.parent_id !== undefined) { sets.push(`parent_id = $${i++}`); params.push(d.parent_id); }
  if (!sets.length) return successResponse(res, { message: 'Aucune modification' });
  params.push(req.params.id, req.user.shopId);
  const r = await query(`UPDATE categories SET ${sets.join(', ')} WHERE id = $${i++} AND shop_id = $${i} RETURNING *`, params);
  return successResponse(res, r.rows[0]);
}));

router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  await query('UPDATE products SET category_id = NULL WHERE category_id = $1', [req.params.id]);
  await query('DELETE FROM categories WHERE id = $1 AND shop_id = $2', [req.params.id, req.user.shopId]);
  return successResponse(res, { message: 'Catégorie supprimée' });
}));

module.exports = router;