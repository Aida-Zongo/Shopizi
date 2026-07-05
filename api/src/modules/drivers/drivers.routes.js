const { Router } = require('express');
const { z } = require('zod');
const { query } = require('../../db/pool');
const { authenticate } = require('../../middleware/authenticate');
const validate = require('../../middleware/validate');
const asyncHandler = require('../../middleware/asyncHandler');
const { successResponse } = require('../../utils/response');
const { NotFoundError, BadRequestError } = require('../../utils/errors');

const router = Router();

// =========================================================
// SPECIFIC ROUTES FIRST (before /:id to avoid conflicts)
// =========================================================

// Toggle the current driver's online/offline availability (users.is_online)
router.put('/status', authenticate, validate({ body: z.object({ is_online: z.boolean() }) }), asyncHandler(async (req, res) => {
  const r = await query(
    'UPDATE users SET is_online = $1 WHERE id = $2 RETURNING id, is_online',
    [req.body.is_online, req.user.userId]
  );
  if (r.rows.length === 0) throw new NotFoundError('Utilisateur introuvable');
  return successResponse(res, r.rows[0]);
}));

// Register as a driver (via auth, no authentication needed here)
router.post('/register', asyncHandler(async (req, res) => {
  const { full_name, phone_number, email, city_id, city_name, vehicle_type } = req.body;
  const r = await query(
    `INSERT INTO delivery_drivers (full_name, phone_number, email, city_id, city_name, vehicle_type, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING *`,
    [full_name, phone_number, email || null, city_id || null, city_name, vehicle_type || 'moto']
  );
  return successResponse(res, r.rows[0], null, 201);
}));

// Driver: get own stats for dashboard  ← MUST be before /:id
router.get('/me/stats', authenticate, asyncHandler(async (req, res) => {
  const driverRes = await query(
    'SELECT id, total_earnings_xof, total_deliveries, avg_rating, balance_xof FROM delivery_drivers WHERE user_id = $1',
    [req.user.userId]
  );
  if (driverRes.rows.length === 0) throw new NotFoundError('Profil livreur introuvable');
  const driver = driverRes.rows[0];

  const todayRes = await query(
    `SELECT 
       COALESCE(SUM(dp.amount_xof), 0) AS today_earnings,
       COUNT(dp.id) AS today_count,
       COALESCE(SUM(d.distance_km), 0) AS today_distance
     FROM driver_payments dp
     LEFT JOIN deliveries d ON dp.delivery_id = d.id
     WHERE dp.driver_id = $1 
       AND dp.type = 'earning'
       AND dp.status = 'completed'
       AND date(dp.created_at) = CURRENT_DATE`,
    [driver.id]
  );

  return successResponse(res, {
    total_earnings: Number(driver.total_earnings_xof) || 0,
    total_deliveries: Number(driver.total_deliveries) || 0,
    rating: Number(driver.avg_rating) || 0,
    balance: Number(driver.balance_xof) || 0,
    today: {
      earnings: Number(todayRes.rows[0].today_earnings) || 0,
      deliveries: Number(todayRes.rows[0].today_count) || 0,
      distance: Number(todayRes.rows[0].today_distance) || 0,
    }
  });
}));

// Driver: get own earnings summary (aggregated by period)  ← MUST be before /:id
router.get('/earnings', authenticate, asyncHandler(async (req, res) => {
  const driverRes = await query(
    'SELECT id, avg_rating FROM delivery_drivers WHERE user_id = $1',
    [req.user.userId]
  );
  if (driverRes.rows.length === 0) throw new NotFoundError('Profil livreur introuvable');
  const driver = driverRes.rows[0];
  const driverId = driver.id;

  const period = req.query.period || 'monthly';
  let dateClause = '';
  if (period === 'weekly') dateClause = `AND dp.created_at >= CURRENT_DATE - INTERVAL '7 days'`;
  else if (period === 'yearly') dateClause = `AND dp.created_at >= CURRENT_DATE - INTERVAL '1 year'`;
  else dateClause = `AND dp.created_at >= CURRENT_DATE - INTERVAL '30 days'`;

  const stats = await query(
    `SELECT
       COALESCE(SUM(dp.amount_xof), 0) AS earnings_xof,
       COALESCE(SUM(d.distance_km), 0) AS distance_km,
       COUNT(dp.id) AS deliveries,
       COALESCE(AVG(dp.amount_xof), 0)::float AS avg_xof
     FROM driver_payments dp
     LEFT JOIN deliveries d ON dp.delivery_id = d.id
     WHERE dp.driver_id = $1 AND dp.status = 'completed' AND dp.type = 'earning' ${dateClause}`,
    [driverId]
  );

  const now = new Date();
  let dateFrom, dateTo;
  if (period === 'weekly') {
    dateFrom = new Date(now); dateFrom.setDate(dateFrom.getDate() - 7); dateTo = now;
  } else if (period === 'yearly') {
    dateFrom = new Date(now); dateFrom.setFullYear(dateFrom.getFullYear() - 1); dateTo = now;
  } else {
    dateFrom = new Date(now); dateFrom.setDate(dateFrom.getDate() - 30); dateTo = now;
  }

  const totalEarnings = Number(stats.rows[0].earnings_xof);
  const rating = Number(driver.avg_rating || 0);
  const bonus = (rating >= 4.5 && Number(stats.rows[0].deliveries) > 0)
    ? Math.round(totalEarnings * 0.05)
    : 0;

  return successResponse(res, {
    period,
    date_from: dateFrom.toLocaleDateString('fr-FR'),
    date_to: dateTo.toLocaleDateString('fr-FR'),
    total_deliveries: Number(stats.rows[0].deliveries),
    total_earnings_xof: totalEarnings,
    distance_km: Number(stats.rows[0].distance_km) || 0,
    average_per_delivery_xof: Math.round(Number(stats.rows[0].avg_xof) || 0),
    bonus_xof: bonus,
    rating,
  });
}));

// List all approved drivers (public)
router.get('/', asyncHandler(async (req, res) => {
  const cityId = req.query.city_id;
  let sql = `SELECT id, full_name, phone_number, city_name, vehicle_type, avg_rating, total_reviews, total_deliveries, status 
             FROM delivery_drivers WHERE status = 'approved'`;
  const params = [];
  if (cityId) { sql += ' AND city_id = $1'; params.push(cityId); }
  const r = await query(sql + ' ORDER BY avg_rating DESC', params);
  return successResponse(res, r.rows);
}));

// =========================================================
// PARAMETERIZED ROUTES  ← always last
// =========================================================

// Get driver profile by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const r = await query('SELECT * FROM delivery_drivers WHERE id = $1', [req.params.id]);
  if (r.rows.length === 0) throw new NotFoundError('Livreur introuvable');
  return successResponse(res, r.rows[0]);
}));

// Update driver status (driver toggles online/offline/busy)
router.patch('/:id/status', authenticate, asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['offline', 'approved', 'busy'].includes(status)) {
    throw new BadRequestError('Statut invalide');
  }
  const r = await query(
    'UPDATE delivery_drivers SET status = $1 WHERE id = $2 RETURNING *',
    [status, req.params.id]
  );
  if (r.rows.length === 0) throw new NotFoundError('Livreur introuvable');
  return successResponse(res, r.rows[0]);
}));

// Admin: approve/reject driver
router.patch('/:id/approve', authenticate, asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['approved', 'rejected', 'suspended'].includes(status)) throw new BadRequestError('Statut invalide');
  const r = await query(
    `UPDATE delivery_drivers 
     SET status = $1, approved_at = CASE WHEN $1 = 'approved' THEN NOW() ELSE approved_at END 
     WHERE id = $2 RETURNING *`,
    [status, req.params.id]
  );
  if (r.rows.length === 0) throw new NotFoundError('Livreur introuvable');
  return successResponse(res, r.rows[0]);
}));

// List driver payments history by driver ID
router.get('/:id/earnings', authenticate, asyncHandler(async (req, res) => {
  const r = await query(
    'SELECT * FROM driver_payments WHERE driver_id = $1 ORDER BY created_at DESC',
    [req.params.id]
  );
  return successResponse(res, r.rows);
}));

module.exports = router;