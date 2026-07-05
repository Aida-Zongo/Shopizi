const { Router } = require('express');
const { z } = require('zod');
const { query } = require('../../db/pool');
const { authenticate } = require('../../middleware/authenticate');
const validate = require('../../middleware/validate');
const asyncHandler = require('../../middleware/asyncHandler');
const { successResponse } = require('../../utils/response');
const { NotFoundError, BadRequestError, UnauthorizedError } = require('../../utils/errors');

const router = Router();

// Middleware to check if shop is Pro/Business
async function requireProOrBusiness(req, res, next) {
  const subRes = await query(
    `SELECT p.slug FROM subscriptions s 
     JOIN plans p ON p.id = s.plan_id 
     WHERE s.user_id = $1 AND s.status IN ('trial', 'active', 'past_due')`,
    [req.user.userId]
  );
  const slug = subRes.rows[0]?.slug;
  if (slug !== 'pro' && slug !== 'business') {
    throw new UnauthorizedError('Accès réservé aux plans Pro et Business');
  }
  next();
}

// List all ads for the current shop
router.get('/', authenticate, requireProOrBusiness, asyncHandler(async (req, res) => {
  const ads = await query(
    `SELECT a.*, p.name as product_name, p.price_xof as product_price,
       (SELECT url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC LIMIT 1) as image_url
     FROM ads a
     JOIN products p ON p.id = a.product_id
     WHERE a.shop_id = $1
     ORDER BY a.created_at DESC`,
    [req.user.shopId]
  );
  return successResponse(res, ads.rows);
}));

// Create an ad
router.post('/', authenticate, requireProOrBusiness, validate({ body: z.object({
  product_id: z.string().uuid(),
  budget_xof: z.number().min(1000),
})}), asyncHandler(async (req, res) => {
  const { product_id, budget_xof } = req.body;

  // Check if product belongs to shop
  const prodCheck = await query('SELECT id FROM products WHERE id = $1 AND shop_id = $2', [product_id, req.user.shopId]);
  if (prodCheck.rows.length === 0) throw new NotFoundError('Produit introuvable');

  const ad = await query(
    `INSERT INTO ads (shop_id, product_id, budget_xof, status)
     VALUES ($1, $2, $3, 'active') RETURNING *`,
    [req.user.shopId, product_id, budget_xof]
  );
  return successResponse(res, ad.rows[0], null, 201);
}));

// Stop an ad
router.patch('/:id/stop', authenticate, requireProOrBusiness, asyncHandler(async (req, res) => {
  const ad = await query(
    `UPDATE ads SET status = 'completed' WHERE id = $1 AND shop_id = $2 RETURNING *`,
    [req.params.id, req.user.shopId]
  );
  if (ad.rows.length === 0) throw new NotFoundError('Publicité introuvable');
  return successResponse(res, ad.rows[0]);
}));

module.exports = router;
