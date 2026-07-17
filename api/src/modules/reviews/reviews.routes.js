const { Router } = require('express');
const { query } = require('../../db/pool');
const { authenticate } = require('../../middleware/authenticate');
const asyncHandler = require('../../middleware/asyncHandler');
const { successResponse } = require('../../utils/response');
const { BadRequestError, NotFoundError } = require('../../utils/errors');

const router = Router({ mergeParams: true });

// List reviews for a product or shop (public with optional auth)
router.get('/', asyncHandler(async (req, res) => {
  const { product_id, shop_id } = req.query;
  let sql = `SELECT r.*, u.full_name AS reviewer_name, u.email AS reviewer_email
             FROM reviews r
             LEFT JOIN users u ON r.user_id = u.id
             WHERE 1=1`;
  const params = [];
  let i = 1;

  if (product_id) {
    sql += ` AND r.product_id = $${i++}`;
    params.push(product_id);
  }
  if (shop_id) {
    sql += ` AND r.shop_id = $${i++}`;
    params.push(shop_id);
  }

  sql += ` ORDER BY r.created_at DESC`;

  const r = await query(sql, params);
  return successResponse(res, r.rows);
}));

// Get average rating for a shop (public)
router.get('/shop/:shopId/stats', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS total_reviews, ROUND(AVG(rating)::numeric, 2) AS avg_rating
     FROM reviews WHERE shop_id = $1 AND status = 'approved'`,
    [req.params.shopId]
  );
  return successResponse(res, rows[0]);
}));

// Create a review (authenticated) - either for a product or for a shop overall
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { product_id, shop_id, order_id, rating, comment, anonymous_name } = req.body;
  if (!shop_id || !rating) {
    throw new BadRequestError('shop_id et rating sont requis');
  }
  if (rating < 1 || rating > 5) {
    throw new BadRequestError('La note doit être entre 1 et 5');
  }

  const r = await query(
    `INSERT INTO reviews (product_id, shop_id, order_id, user_id, anonymous_name, rating, comment, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'approved') RETURNING *`,
    [product_id || null, shop_id, order_id || null, req.user.userId || null, anonymous_name || null, rating, comment || null]
  );
  return successResponse(res, r.rows[0], null, 201);
}));

// Moderate (approve/reject) a review - shop owner or admin
router.patch('/:id/moderate', authenticate, asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    throw new BadRequestError('Statut invalide');
  }
  const r = await query(
    `UPDATE reviews SET status = $1 WHERE id = $2 RETURNING *`,
    [status, req.params.id]
  );
  if (r.rows.length === 0) throw new NotFoundError('Review introuvable');
  return successResponse(res, r.rows[0]);
}));

// Delete own review
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  await query('DELETE FROM reviews WHERE id = $1 AND user_id = $2', [req.params.id, req.user.userId]);
  return successResponse(res, { message: 'Review supprimée' });
}));

// --- Fil de discussion entre clients sous un avis ---

// List replies for a review (public)
router.get('/:reviewId/replies', asyncHandler(async (req, res) => {
  const r = await query(
    `SELECT rr.id, rr.review_id, rr.content, rr.anonymous_name, rr.user_id, rr.created_at,
            u.full_name AS author_name
     FROM review_replies rr
     LEFT JOIN users u ON rr.user_id = u.id
     WHERE rr.review_id = $1 AND rr.status = 'approved'
     ORDER BY rr.created_at ASC`,
    [req.params.reviewId]
  );
  return successResponse(res, r.rows);
}));

// Post a reply to a review (authenticated)
router.post('/:reviewId/replies', authenticate, asyncHandler(async (req, res) => {
  const content = (req.body.content || '').trim();
  if (!content) throw new BadRequestError('Le message est requis');

  const parent = await query('SELECT id FROM reviews WHERE id = $1', [req.params.reviewId]);
  if (parent.rows.length === 0) throw new NotFoundError('Avis introuvable');

  const r = await query(
    `INSERT INTO review_replies (review_id, user_id, content, status)
     VALUES ($1, $2, $3, 'approved') RETURNING *`,
    [req.params.reviewId, req.user.userId, content]
  );
  return successResponse(res, r.rows[0], null, 201);
}));

// Delete own reply
router.delete('/replies/:id', authenticate, asyncHandler(async (req, res) => {
  await query('DELETE FROM review_replies WHERE id = $1 AND user_id = $2', [req.params.id, req.user.userId]);
  return successResponse(res, { message: 'Réponse supprimée' });
}));

module.exports = router;
