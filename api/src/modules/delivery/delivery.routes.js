const { Router } = require('express');
const { query, getClient } = require('../../db/pool');
const { authenticate } = require('../../middleware/authenticate');
const asyncHandler = require('../../middleware/asyncHandler');
const { successResponse } = require('../../utils/response');
const { NotFoundError, BadRequestError } = require('../../utils/errors');
const { calculateDeliveryFee } = require('./delivery.service');

const router = Router();

// Request a delivery for an order (client)
router.post('/request', authenticate, asyncHandler(async (req, res) => {
  const { order_id, delivery_address, client_latitude, client_longitude } = req.body;
  const order = await query('SELECT * FROM orders WHERE id = $1 AND shop_id = $2', [order_id, req.user.shopId]);
  if (order.rows.length === 0) throw new NotFoundError('Commande introuvable');
  const del = await query(
    `INSERT INTO deliveries (order_id, shop_id, city_id, pickup_address, delivery_address, client_latitude, client_longitude, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending_driver') RETURNING *`,
    [order_id, order.rows[0].shop_id, req.user.cityId || null, delivery_address, delivery_address, client_latitude || null, client_longitude || null]
  );
  await query('UPDATE orders SET delivery_id = $1 WHERE id = $2', [del.rows[0].id, order_id]);
  return successResponse(res, del.rows[0], null, 201);
}));

// Calculate delivery fee
router.post('/calculate-fee', asyncHandler(async (req, res) => {
  const { shop_id, client_latitude, client_longitude } = req.body;
  if (!shop_id || !client_latitude || !client_longitude) {
    throw new BadRequestError('shop_id, client_latitude, and client_longitude are required');
  }

  const shopRes = await query('SELECT latitude, longitude FROM shops WHERE id = $1', [shop_id]);
  if (shopRes.rows.length === 0) throw new NotFoundError('Shop introuvable');
  const shop = shopRes.rows[0];

  if (!shop.latitude || !shop.longitude) {
    throw new BadRequestError('La boutique n\'a pas configuré sa position géographique');
  }

  const result = await calculateDeliveryFee(
    Number(shop.latitude), Number(shop.longitude), 
    Number(client_latitude), Number(client_longitude)
  );

  return successResponse(res, result);
}));

// Calculate delivery fee (GET variant with query params, used by the customer order modal)
router.get('/calculate-fee', asyncHandler(async (req, res) => {
  const { shop_id, lat, lng } = req.query;
  if (!shop_id || !lat || !lng) {
    throw new BadRequestError('shop_id, lat, and lng are required');
  }

  const shopRes = await query('SELECT latitude, longitude FROM shops WHERE id = $1', [shop_id]);
  if (shopRes.rows.length === 0) throw new NotFoundError('Shop introuvable');
  const shop = shopRes.rows[0];

  if (!shop.latitude || !shop.longitude) {
    throw new BadRequestError('La boutique n\'a pas configuré sa position géographique');
  }

  const result = await calculateDeliveryFee(
    Number(shop.latitude), Number(shop.longitude),
    Number(lat), Number(lng)
  );

  return successResponse(res, result);
}));

// List available delivery jobs (for drivers)
router.get('/available', authenticate, asyncHandler(async (req, res) => {
  const cityId = req.query.city_id;
  let sql = `SELECT d.id, d.order_id, d.status, d.pickup_address, d.delivery_address, d.delivery_fee_xof, d.distance_km, d.created_at, o.customer_name, o.customer_phone, o.total_amount_xof, s.name AS shop_name, s.address AS shop_address, s.phone_number AS shop_phone FROM deliveries d JOIN orders o ON o.id = d.order_id JOIN shops s ON s.id = d.shop_id WHERE d.status = 'pending_driver' AND d.driver_id IS NULL`;
  const params = [];
  if (cityId) { sql += ' AND d.city_id = $1'; params.push(cityId); }
  const r = await query(sql + ' ORDER BY d.created_at DESC', params);
  return successResponse(res, r.rows);
}));

// Driver claims a delivery
router.post('/:id/claim', authenticate, asyncHandler(async (req, res) => {
  const { driver_id } = req.body;
  const r = await query(
    `UPDATE deliveries SET driver_id = $1, status = 'driver_assigned', assigned_at = NOW() WHERE id = $2 AND driver_id IS NULL RETURNING *`,
    [driver_id, req.params.id]
  );
  if (r.rows.length === 0) throw new BadRequestError('Livraison deja prise ou introuvable');
  return successResponse(res, r.rows[0]);
}));

// Update delivery status
router.patch('/:id/status', authenticate, asyncHandler(async (req, res) => {
  const { status } = req.body;
  const deliveryId = req.params.id;

  const deliveryRes = await query('SELECT * FROM deliveries WHERE id = $1', [deliveryId]);
  if (deliveryRes.rows.length === 0) throw new NotFoundError('Livraison introuvable');
  const delivery = deliveryRes.rows[0];

  if (status === 'delivered' && delivery.status !== 'delivered') {
    if (!delivery.driver_id) {
      throw new BadRequestError('Aucun livreur assigné à cette livraison');
    }

    const driverRes = await query('SELECT id, commission_rate FROM delivery_drivers WHERE id = $1', [delivery.driver_id]);
    if (driverRes.rows.length === 0) throw new NotFoundError('Livreur introuvable');
    const driver = driverRes.rows[0];

    const commissionRate = driver.commission_rate || 95;
    const commissionXof = Math.round((delivery.delivery_fee_xof || 0) * (commissionRate / 100));

    const client = await getClient();
    try {
      await client.query('BEGIN');
      
      // Update delivery status
      const updatedDelivery = await client.query(
        `UPDATE deliveries 
         SET status = 'delivered', driver_earnings_xof = $1, delivered_at = NOW() 
         WHERE id = $2 
         RETURNING *`,
        [commissionXof, deliveryId]
      );

      // Insert driver payment
      await client.query(
        `INSERT INTO driver_payments (driver_id, amount_xof, type, delivery_id, status) 
         VALUES ($1, $2, 'earning', $3, 'completed')`,
        [delivery.driver_id, commissionXof, deliveryId]
      );

      // Update driver balance & earnings
      await client.query(
        `UPDATE delivery_drivers 
         SET balance_xof = balance_xof + $1, total_earnings_xof = total_earnings_xof + $1, total_deliveries = total_deliveries + 1 
         WHERE id = $2`,
        [commissionXof, delivery.driver_id]
      );

      await client.query('COMMIT');
      return successResponse(res, updatedDelivery.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } else {
    const r = await query('UPDATE deliveries SET status = $1 WHERE id = $2 RETURNING *', [status, deliveryId]);
    return successResponse(res, r.rows[0]);
  }
}));

// Driver: get active deliveries
router.get('/my', authenticate, asyncHandler(async (req, res) => {
  const driverRes = await query('SELECT id FROM delivery_drivers WHERE user_id = $1', [req.user.userId]);
  if (driverRes.rows.length === 0) throw new NotFoundError('Profil livreur introuvable');
  const driverId = driverRes.rows[0].id;
  const r = await query(
    `SELECT d.id, d.status, d.pickup_address, d.delivery_address, d.delivery_fee_xof, d.distance_km, d.driver_notes, o.order_number, o.customer_name, o.customer_phone, o.total_amount_xof, s.name AS shop_name, s.address AS shop_address, s.phone_number AS shop_phone FROM deliveries d JOIN orders o ON o.id = d.order_id JOIN shops s ON s.id = d.shop_id WHERE d.driver_id = $1 AND d.status NOT IN ('delivered','cancelled_by_client','cancelled_by_driver','cancelled_by_system') ORDER BY d.created_at DESC`,
    [driverId]
  );
  return successResponse(res, r.rows);
}));

// Driver: get history
router.get('/my/history', authenticate, asyncHandler(async (req, res) => {
  const driverRes = await query('SELECT id FROM delivery_drivers WHERE user_id = $1', [req.user.userId]);
  if (driverRes.rows.length === 0) throw new NotFoundError('Profil livreur introuvable');
  const driverId = driverRes.rows[0].id;
  const r = await query(
    `SELECT d.id, d.status, d.delivery_address, d.created_at, d.driver_earnings_xof, d.distance_km, o.order_number, o.customer_name FROM deliveries d JOIN orders o ON o.id = d.order_id WHERE d.driver_id = $1 AND d.status IN ('delivered','cancelled_by_client','cancelled_by_driver','cancelled_by_system') ORDER BY d.created_at DESC`,
    [driverId]
  );
  return successResponse(res, r.rows);
}));

// Public tracking
router.get('/track/:code', asyncHandler(async (req, res) => {
  const r = await query(`SELECT d.*, o.customer_name, o.status AS order_status FROM deliveries d JOIN orders o ON o.id = d.order_id WHERE d.tracking_code = $1`, [req.params.code]);
  if (r.rows.length === 0) throw new NotFoundError('Code de suivi invalide');
  return successResponse(res, r.rows[0]);
}));

module.exports = router;