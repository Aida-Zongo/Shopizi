const { Router } = require('express');
const { z } = require('zod');
const { query } = require('../../db/pool');
const { authenticate } = require('../../middleware/authenticate');
const validate = require('../../middleware/validate');
const asyncHandler = require('../../middleware/asyncHandler');
const { successResponse } = require('../../utils/response');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../../utils/errors');
const eventBus = require('../../events');

const router = Router();

// List all active plans (public)
router.get('/plans', asyncHandler(async (req, res) => {
  const r = await query('SELECT * FROM plans WHERE is_active = true ORDER BY sort_order');
  return successResponse(res, r.rows);
}));

// Get current subscription
router.get('/my', authenticate, asyncHandler(async (req, res) => {
  const r = await query(
    `SELECT sub.*, p.name AS plan_name, p.slug AS plan_slug, p.price_monthly_xof,
            p.max_products, p.max_images_per_product, p.max_variants_per_product,
            p.max_categories, p.storage_mb, p.custom_domain, p.analytics,
            p.custom_colors, p.remove_branding, p.priority_support
     FROM subscriptions sub JOIN plans p ON p.id = sub.plan_id
     WHERE sub.user_id = $1 ORDER BY sub.created_at DESC LIMIT 1`, [req.user.userId]);
  if (r.rows.length === 0) throw new NotFoundError('Aucun abonnement trouvé');
  const payments = await query('SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20', [req.user.userId]);
  return successResponse(res, { subscription: r.rows[0], payments: payments.rows });
}));

// Subscribe / upgrade
router.post('/subscribe', authenticate, validate({ body: z.object({ plan_id: z.string().uuid() }) }), asyncHandler(async (req, res) => {
  const plan = await query('SELECT * FROM plans WHERE id = $1 AND is_active = true', [req.body.plan_id]);
  if (plan.rows.length === 0) throw new NotFoundError('Plan introuvable');

  // Get current subscription
  const current = await query(
    'SELECT sub.*, p.slug AS current_plan_slug FROM subscriptions sub JOIN plans p ON p.id = sub.plan_id WHERE sub.user_id = $1 ORDER BY sub.created_at DESC LIMIT 1',
    [req.user.userId]
  );

  const planData = plan.rows[0];
  if (planData.slug === 'free' && current.rows.length > 0 && current.rows[0].current_plan_slug === 'free') {
    throw new BadRequestError('Vous êtes déjà sur le plan Gratuit');
  }

  // If paying plan, return a pending payment instruction
  if (planData.price_monthly_xof > 0) {
    return successResponse(res, {
      message: 'Paiement requis',
      plan: { id: planData.id, name: planData.name, price: planData.price_monthly_xof, trial_days: planData.trial_days },
      next_step: 'POST /api/v1/payments/initiate',
    });
  }

  // Free plan: direct activation
  const now = new Date();
  const endsAt = new Date(now.getFullYear() + 100, 0, 1);
  if (current.rows.length > 0) {
    await query("UPDATE subscriptions SET status = 'cancelled' WHERE id = $1", [current.rows[0].id]);
  }
  const sub = await query(
    `INSERT INTO subscriptions (user_id, plan_id, status, starts_at, ends_at)
     VALUES ($1,$2,'active',$3,$4) RETURNING *`,
    [req.user.userId, planData.id, now, endsAt]
  );
  eventBus.emit('subscription:activated', { userId: req.user.userId, planSlug: planData.slug });
  return successResponse(res, sub.rows[0]);
}));

// Cancel subscription
router.post('/cancel', authenticate, asyncHandler(async (req, res) => {
  const r = await query(
    "SELECT * FROM subscriptions WHERE user_id = $1 AND status IN ('trial','active','past_due') ORDER BY created_at DESC LIMIT 1",
    [req.user.userId]
  );
  if (r.rows.length === 0) throw new NotFoundError('Aucun abonnement actif');
  await query("UPDATE subscriptions SET auto_renew = false, cancelled_at = NOW() WHERE id = $1", [r.rows[0].id]);
  eventBus.emit('subscription:cancelled', { userId: req.user.userId });
  return successResponse(res, { message: 'Abonnement annulé. Il reste actif jusqu\'à la fin de la période en cours.' });
}));

// Get usage vs limits
router.get('/usage', authenticate, asyncHandler(async (req, res) => {
  const r = await query(
    `SELECT p.max_products, p.max_images_per_product, p.max_variants_per_product, p.max_categories, p.storage_mb
     FROM subscriptions sub JOIN plans p ON p.id = sub.plan_id
     WHERE sub.user_id = $1 AND sub.status IN ('trial','active','past_due')`, [req.user.userId]
  );
  const plan = r.rows.length > 0 ? r.rows[0] : { max_products: 15, max_images_per_product: 3, max_categories: 5, storage_mb: 50 };

  const [products, categories, media] = await Promise.all([
    query('SELECT COUNT(*)::int AS c FROM products WHERE shop_id = $1', [req.user.shopId]),
    query('SELECT COUNT(*)::int AS c FROM categories WHERE shop_id = $1', [req.user.shopId]),
    query('SELECT COALESCE(SUM(size_bytes),0)::int AS total FROM media WHERE shop_id = $1', [req.user.shopId]),
  ]);
  return successResponse(res, {
    products: { used: products.rows[0].c, limit: plan.max_products },
    categories: { used: categories.rows[0].c, limit: plan.max_categories },
    storage: { used_mb: Math.round(media.rows[0].total / 1048576 * 100) / 100, limit_mb: plan.storage_mb },
  });
}));

module.exports = router;