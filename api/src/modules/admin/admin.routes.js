const { Router } = require('express');
const { z } = require('zod');
const { query } = require('../../db/pool');
const { authenticate } = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const asyncHandler = require('../../middleware/asyncHandler');
const { successResponse, paginationMeta } = require('../../utils/response');
const { parsePagination } = require('../../utils/pagination');
const { NotFoundError } = require('../../utils/errors');

const router = Router();
router.use(authenticate, authorize('admin'));

// Dashboard stats
router.get('/dashboard', asyncHandler(async (req, res) => {
  const [totalUsers, activeSubscriptions, mrr, recentSignups, platformCommissions] = await Promise.all([
    query("SELECT COUNT(*)::int AS c FROM users WHERE role = 'merchant'"),
    query("SELECT COUNT(*)::int AS c FROM subscriptions WHERE status IN ('trial','active','past_due')"),
    query("SELECT COALESCE(SUM(p.price_monthly_xof),0)::int AS total FROM subscriptions s JOIN plans p ON p.id = s.plan_id WHERE s.status IN ('active','past_due') AND p.price_monthly_xof > 0"),
    query("SELECT COUNT(*)::int AS c FROM users WHERE created_at > NOW() - INTERVAL '30 days'"),
    query("SELECT COALESCE(SUM(platform_fee_xof),0)::int AS total FROM order_financials"),
  ]);

  // Plan distribution
  const planDistribution = await query(
    `SELECT p.slug, COUNT(*)::int AS count FROM subscriptions s
     JOIN plans p ON p.id = s.plan_id WHERE s.status IN ('trial','active','past_due')
     GROUP BY p.slug`
  );

  return successResponse(res, {
    totalMerchants: totalUsers.rows[0].c,
    activeSubscriptions: activeSubscriptions.rows[0].c,
    mrrXof: mrr.rows[0].total,
    platformCommissionsXof: platformCommissions.rows[0].total,
    recentSignups: recentSignups.rows[0].c,
    planDistribution: planDistribution.rows,
  });
}));

// List merchants
router.get('/merchants', asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req.query);
  let where = ''; const params = []; let i = 1;
  if (req.query.search) { where = `WHERE u.email ILIKE $${i++} OR u.full_name ILIKE $${i++}`; params.push(`%${req.query.search}%`, `%${req.query.search}%`); }

  params.push(limit, offset);
  const [data, count] = await Promise.all([
    query(`SELECT u.id, u.email, u.full_name, u.phone_number, u.role, u.is_active, u.created_at,
            s.id AS shop_id, s.subdomain, s.name AS shop_name, s.is_published,
            p.slug AS plan_slug, sub.status AS subscription_status
     FROM users u
     LEFT JOIN shops s ON s.user_id = u.id
     LEFT JOIN subscriptions sub ON sub.user_id = u.id AND sub.status IN ('trial','active','past_due')
     LEFT JOIN plans p ON p.id = sub.plan_id
     ${where} ORDER BY u.created_at DESC LIMIT $${i++} OFFSET $${i}`, params),
    query(`SELECT COUNT(*)::int AS total FROM users u ${where}`, params.slice(0, i - 2)),
  ]);
  return successResponse(res, data.rows, paginationMeta(page, limit, count.rows[0].total));
}));

// Toggle merchant active status
router.patch('/merchants/:id', asyncHandler(async (req, res) => {
  const { is_active } = req.body;
  const r = await query('UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, email, is_active',
    [is_active, req.params.id]);
  if (r.rows.length === 0) throw new NotFoundError('Marchand introuvable');
  return successResponse(res, r.rows[0]);
}));

// All payments for reconciliation
router.get('/payments', asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req.query);
  const [data, count] = await Promise.all([
    query('SELECT p.*, u.email, u.full_name FROM payments p JOIN users u ON u.id = p.user_id ORDER BY p.created_at DESC LIMIT $1 OFFSET $2', [limit, offset]),
    query('SELECT COUNT(*)::int AS total FROM payments'),
  ]);
  return successResponse(res, data.rows, paginationMeta(page, limit, count.rows[0].total));
}));

// ─── Section 1: Vue d'ensemble ───────────────────────────────────────────
router.get('/overview', asyncHandler(async (req, res) => {
  const [shops, products, orders, monthlyCommission, monthlyAds] = await Promise.all([
    query("SELECT COUNT(*)::int AS c FROM shops WHERE is_published = true"),
    query('SELECT COUNT(*)::int AS c FROM products'),
    query('SELECT COUNT(*)::int AS c FROM orders'),
    query(`SELECT COALESCE(SUM(of.platform_fee_xof),0)::int AS total FROM order_financials of
           JOIN orders o ON o.id = of.order_id WHERE o.created_at >= date_trunc('month', NOW())`),
    query("SELECT COALESCE(SUM(budget_xof),0)::int AS total FROM ads WHERE created_at >= date_trunc('month', NOW())"),
  ]);

  const deliveryCommissions = monthlyCommission.rows[0].total;
  const adsRevenue = monthlyAds.rows[0].total;

  return successResponse(res, {
    activeShops: shops.rows[0].c,
    totalProducts: products.rows[0].c,
    totalOrders: orders.rows[0].c,
    monthlyRevenueXof: {
      deliveryCommissions,
      adsRevenue,
      total: deliveryCommissions + adsRevenue,
    },
  });
}));

// ─── Section 2: Gestion des boutiques ────────────────────────────────────
router.get('/shops', asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req.query);
  const [data, count] = await Promise.all([
    query(
      `SELECT s.id, s.name, s.city, s.is_published, s.subdomain, s.category, u.email AS owner_email,
              p.slug AS plan_slug, p.name AS plan_name
       FROM shops s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN subscriptions sub ON sub.user_id = u.id AND sub.status IN ('trial','active','past_due')
       LEFT JOIN plans p ON p.id = sub.plan_id
       ORDER BY s.created_at DESC LIMIT $1 OFFSET $2`, [limit, offset]),
    query('SELECT COUNT(*)::int AS total FROM shops'),
  ]);
  return successResponse(res, data.rows, paginationMeta(page, limit, count.rows[0].total));
}));

router.patch('/shops/:id/status', asyncHandler(async (req, res) => {
  const { is_published } = req.body;
  const r = await query('UPDATE shops SET is_published = $1 WHERE id = $2 RETURNING id, name, is_published',
    [is_published, req.params.id]);
  if (r.rows.length === 0) throw new NotFoundError('Boutique introuvable');
  return successResponse(res, r.rows[0]);
}));

router.patch('/shops/:id/plan', asyncHandler(async (req, res) => {
  const { plan_slug } = req.body;
  const plan = await query('SELECT id FROM plans WHERE slug = $1', [plan_slug]);
  if (plan.rows.length === 0) throw new NotFoundError('Plan introuvable');

  const shop = await query('SELECT user_id FROM shops WHERE id = $1', [req.params.id]);
  if (shop.rows.length === 0) throw new NotFoundError('Boutique introuvable');
  const userId = shop.rows[0].user_id;

  const existing = await query(
    `SELECT id FROM subscriptions WHERE user_id = $1 AND status IN ('trial','active','past_due')
     ORDER BY created_at DESC LIMIT 1`, [userId]
  );

  const result = existing.rows.length > 0
    ? await query(`UPDATE subscriptions SET plan_id = $1, status = 'active' WHERE id = $2
                   RETURNING id, plan_id, status`, [plan.rows[0].id, existing.rows[0].id])
    : await query(`INSERT INTO subscriptions (user_id, plan_id, status, starts_at, ends_at)
                   VALUES ($1, $2, 'active', NOW(), NOW() + INTERVAL '30 days')
                   RETURNING id, plan_id, status`, [userId, plan.rows[0].id]);

  return successResponse(res, result.rows[0]);
}));

// ─── Section 3: Gestion des utilisateurs ─────────────────────────────────
router.get('/users', asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req.query);
  const role = req.query.role;
  let where = ''; const params = []; let i = 1;
  if (role) { where = `WHERE u.role = $${i++}`; params.push(role); }
  params.push(limit, offset);

  const [data, count] = await Promise.all([
    query(`SELECT u.id, u.email, u.full_name, u.phone_number, u.role, u.is_active, u.email_verified, u.created_at
           FROM users u ${where} ORDER BY u.created_at DESC LIMIT $${i++} OFFSET $${i}`, params),
    query(`SELECT COUNT(*)::int AS total FROM users u ${where}`, params.slice(0, i - 2)),
  ]);
  return successResponse(res, data.rows, paginationMeta(page, limit, count.rows[0].total));
}));

router.get('/users/:id', asyncHandler(async (req, res) => {
  const r = await query(
    `SELECT u.id, u.email, u.full_name, u.phone_number, u.role, u.is_active, u.email_verified,
            u.created_at, u.last_login_at,
            s.id AS shop_id, s.name AS shop_name, s.subdomain,
            d.id AS driver_id, d.status AS driver_status, d.total_deliveries, d.total_earnings_xof, d.balance_xof
     FROM users u
     LEFT JOIN shops s ON s.user_id = u.id
     LEFT JOIN delivery_drivers d ON d.user_id = u.id
     WHERE u.id = $1`, [req.params.id]
  );
  if (r.rows.length === 0) throw new NotFoundError('Utilisateur introuvable');
  return successResponse(res, r.rows[0]);
}));

// ─── Section 4: Gestion des commandes ────────────────────────────────────
router.get('/orders', asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req.query);
  const status = req.query.status;
  let where = ''; const params = []; let i = 1;
  if (status) { where = `WHERE o.status = $${i++}`; params.push(status); }
  params.push(limit, offset);

  const [data, count] = await Promise.all([
    query(`SELECT o.id, o.order_number, o.customer_name, o.customer_phone, o.status,
                  o.total_amount_xof, o.delivery_fee_xof, o.created_at, s.name AS shop_name
           FROM orders o JOIN shops s ON s.id = o.shop_id
           ${where} ORDER BY o.created_at DESC LIMIT $${i++} OFFSET $${i}`, params),
    query(`SELECT COUNT(*)::int AS total FROM orders o ${where}`, params.slice(0, i - 2)),
  ]);
  return successResponse(res, data.rows, paginationMeta(page, limit, count.rows[0].total));
}));

// ─── Section 5: Finances ─────────────────────────────────────────────────
router.get('/finances', asyncHandler(async (req, res) => {
  const [deliveryCommission, adsRevenue] = await Promise.all([
    query('SELECT COALESCE(SUM(platform_fee_xof),0)::int AS total FROM order_financials'),
    query('SELECT COALESCE(SUM(budget_xof),0)::int AS total FROM ads'),
  ]);

  const deliveryCommissionsXof = deliveryCommission.rows[0].total;
  const adsRevenueXof = adsRevenue.rows[0].total;

  return successResponse(res, {
    deliveryCommissionsXof,
    adsRevenueXof,
    totalXof: deliveryCommissionsXof + adsRevenueXof,
  });
}));

module.exports = router;