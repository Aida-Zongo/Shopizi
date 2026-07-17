const { Router } = require('express');
const { query } = require('../../db/pool');
const { authenticate } = require('../../middleware/authenticate');
const asyncHandler = require('../../middleware/asyncHandler');
const { successResponse } = require('../../utils/response');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../../utils/errors');

const router = Router();

const VALID_TYPES = ['promo', 'price', 'arrival'];

// Lit le plan reel du marchand en base (source de verite a chaque instant,
// contrairement au planSlug du JWT qui peut etre perime apres un upgrade).
async function getCurrentPlanSlug(userId) {
  const r = await query(
    `SELECT p.slug
     FROM subscriptions sub JOIN plans p ON p.id = sub.plan_id
     WHERE sub.user_id = $1 AND sub.status IN ('trial','active','past_due')
     ORDER BY sub.created_at DESC LIMIT 1`,
    [userId]
  );
  return r.rows.length ? r.rows[0].slug : 'free';
}

// Annonces actives d'une boutique (public) - utilise par le bandeau de la boutique
router.get('/shop/:shopId', asyncHandler(async (req, res) => {
  const r = await query(
    `SELECT id, shop_id, type, title, message, created_at
     FROM announcements
     WHERE shop_id = $1 AND is_active = true
     ORDER BY created_at DESC`,
    [req.params.shopId]
  );
  return successResponse(res, r.rows);
}));

// Annonces du marchand connecte (toutes, actives et inactives)
router.get('/my', authenticate, asyncHandler(async (req, res) => {
  if (req.user.role !== 'merchant' || !req.user.shopId) {
    throw new ForbiddenError('Acces reserve aux commercants');
  }
  const r = await query(
    `SELECT id, shop_id, type, title, message, is_active, created_at
     FROM announcements
     WHERE shop_id = $1
     ORDER BY created_at DESC`,
    [req.user.shopId]
  );
  return successResponse(res, r.rows);
}));

// Creer une annonce (reserve au plan Business)
router.post('/', authenticate, asyncHandler(async (req, res) => {
  if (req.user.role !== 'merchant' || !req.user.shopId) {
    throw new ForbiddenError('Acces reserve aux commercants');
  }
  const planSlug = await getCurrentPlanSlug(req.user.userId);
  if (planSlug !== 'business') {
    throw new ForbiddenError('Les annonces sont reservees au plan Business');
  }

  const type = req.body.type || 'promo';
  const title = (req.body.title || '').trim();
  const message = (req.body.message || '').trim();
  if (!VALID_TYPES.includes(type)) throw new BadRequestError('Type d\'annonce invalide');
  if (!title) throw new BadRequestError('Le titre est requis');
  if (!message) throw new BadRequestError('Le message est requis');

  const r = await query(
    `INSERT INTO announcements (shop_id, type, title, message)
     VALUES ($1, $2, $3, $4) RETURNING id, shop_id, type, title, message, is_active, created_at`,
    [req.user.shopId, type, title.slice(0, 150), message]
  );
  return successResponse(res, r.rows[0], null, 201);
}));

// Activer / desactiver une annonce
router.patch('/:id', authenticate, asyncHandler(async (req, res) => {
  if (req.user.role !== 'merchant' || !req.user.shopId) {
    throw new ForbiddenError('Acces reserve aux commercants');
  }
  if (typeof req.body.is_active !== 'boolean') {
    throw new BadRequestError('Le champ is_active est requis');
  }
  const r = await query(
    `UPDATE announcements SET is_active = $1
     WHERE id = $2 AND shop_id = $3
     RETURNING id, shop_id, type, title, message, is_active, created_at`,
    [req.body.is_active, req.params.id, req.user.shopId]
  );
  if (r.rows.length === 0) throw new NotFoundError('Annonce introuvable');
  return successResponse(res, r.rows[0]);
}));

// Supprimer une annonce
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  if (req.user.role !== 'merchant' || !req.user.shopId) {
    throw new ForbiddenError('Acces reserve aux commercants');
  }
  const r = await query(
    'DELETE FROM announcements WHERE id = $1 AND shop_id = $2 RETURNING id',
    [req.params.id, req.user.shopId]
  );
  if (r.rows.length === 0) throw new NotFoundError('Annonce introuvable');
  return successResponse(res, { message: 'Annonce supprimee' });
}));

module.exports = router;
