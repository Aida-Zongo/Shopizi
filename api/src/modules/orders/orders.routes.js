const { Router } = require('express');
const { z } = require('zod');
const { query, getClient } = require('../../db/pool');
const { authenticate, optionalAuth } = require('../../middleware/authenticate');
const validate = require('../../middleware/validate');
const asyncHandler = require('../../middleware/asyncHandler');
const { successResponse, paginationMeta } = require('../../utils/response');
const { parsePagination } = require('../../utils/pagination');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../../utils/errors');
const { ORDER_TRANSITIONS } = require('../../constants/enums');
const eventBus = require('../../events');
const { calculateHaversineDistance, calculateDeliveryFee } = require('../delivery/delivery.service');
const { getIO } = require('../../realtime/socket');

const router = Router();

const merchantOrderSchema = z.object({
  customer_name: z.string().min(2),
  customer_email: z.string().email().optional().nullable(),
  customer_phone: z.string(),
  delivery_address: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    product_id: z.string(),
    quantity: z.number().int().min(1),
    price_xof: z.number().int().min(0),
  })).min(1),
});

// Create order (manual from dashboard)
async function merchantCreateOrder(req, res) {
  const { customer_name, customer_phone, customer_email, delivery_address, notes, items } = req.body;
  const orderNum = `ORD-${Date.now().toString(36).toUpperCase()}`;
  const client = await getClient();
  try {
    await client.query('BEGIN');
    let total = 0;
    const orderR = await client.query(
      `INSERT INTO orders (shop_id, order_number, customer_name, customer_phone, customer_message, delivery_address, merchant_notes, status, source, total_amount_xof)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'new','manual',$8) RETURNING *`,
      [req.user.shopId, orderNum, customer_name, customer_phone, customer_email || null, delivery_address || null, notes || null, 0]
    );
    for (const item of items) {
      const lineTotal = item.quantity * item.price_xof;
      total += lineTotal;
      const prod = await client.query('SELECT name FROM products WHERE id = $1 AND shop_id = $2', [item.product_id, req.user.shopId]);
      await client.query(
        'INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price_xof, line_total_xof) VALUES ($1,$2,$3,$4,$5,$6)',
        [orderR.rows[0].id, item.product_id, (prod.rows[0]?.name || 'Produit'), item.quantity, item.price_xof, lineTotal]
      );
    }
    const updatedOrder = await client.query('UPDATE orders SET total_amount_xof = $1 WHERE id = $2 RETURNING *', [total, orderR.rows[0].id]);
    await client.query('COMMIT');
    eventBus.emit('order:created', { shopId: req.user.shopId, orderId: orderR.rows[0].id });
    return successResponse(res, updatedOrder.rows[0], null, 201);
  } catch (err) { await client.query('ROLLBACK'); throw err; } finally { client.release(); }
}

const customerOrderSchema = z.object({
  shop_id: z.string(),
  product_id: z.string(),
  product_name: z.string(),
  price_xof: z.number().min(0),
  quantity: z.number().int().min(1).optional().default(1),
  customer_name: z.string().min(2),
  customer_phone: z.string().min(6),
  delivery_address: z.string().optional().nullable(),
  client_latitude: z.number().optional().nullable(),
  client_longitude: z.number().optional().nullable(),
});

// Create order (public, from the customer shop page)
// Recomputes the delivery fee server-side (Haversine) instead of trusting the client,
// and derives the platform/merchant/driver financial split.
async function customerCreateOrder(req, res) {
  const body = customerOrderSchema.parse(req.body);
  const {
    shop_id, product_id, product_name, price_xof, quantity,
    customer_name, customer_phone, delivery_address, client_latitude, client_longitude,
  } = body;

  const shopRes = await query('SELECT name, latitude, longitude FROM shops WHERE id = $1', [shop_id]);
  if (shopRes.rows.length === 0) throw new NotFoundError('Boutique introuvable');
  const shop = shopRes.rows[0];

  let deliveryFee = 0;
  let distanceKm = null;
  if (client_latitude != null && client_longitude != null && shop.latitude && shop.longitude) {
    const feeResult = await calculateDeliveryFee(
      Number(shop.latitude), Number(shop.longitude),
      Number(client_latitude), Number(client_longitude)
    );
    deliveryFee = feeResult.fee || 0;
    distanceKm = feeResult.distance;
  }

  const productAmount = price_xof * quantity;
  const merchant_amount = productAmount;
  const shopizi_commission = Math.round(deliveryFee * 0.05);
  const driver_amount = Math.round(deliveryFee * 0.95);
  const totalAmount = productAmount + deliveryFee;

  const orderNum = `ORD-${Date.now().toString(36).toUpperCase()}`;
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const orderR = await client.query(
      `INSERT INTO orders (shop_id, order_number, customer_name, customer_phone, delivery_address, delivery_fee_xof, client_latitude, client_longitude, source, status, total_amount_xof, customer_user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'website_form','new',$9,$10) RETURNING *`,
      [shop_id, orderNum, customer_name, customer_phone, delivery_address || null, deliveryFee, client_latitude || null, client_longitude || null, totalAmount, req.user?.role === 'customer' ? req.user.userId : null]
    );
    const order = orderR.rows[0];

    await client.query(
      `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price_xof, line_total_xof)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [order.id, product_id, product_name, quantity, price_xof, productAmount]
    );

    await client.query(
      `INSERT INTO order_financials (order_id, shop_id, platform_fee_xof, merchant_earnings_xof, driver_amount_xof, status)
       VALUES ($1,$2,$3,$4,$5,'pending_payout')`,
      [order.id, shop_id, shopizi_commission, merchant_amount, driver_amount]
    );

    await client.query('COMMIT');

    eventBus.emit('order:created', { shopId: shop_id, orderId: order.id });
    getIO().emit('new:order', {
      order_id: order.id,
      product_name,
      shop_name: shop.name,
      delivery_address: delivery_address || null,
      driver_amount,
      distance_km: distanceKm,
    });

    return successResponse(res, {
      ...order,
      distance_km: distanceKm,
      shopizi_commission_xof: shopizi_commission,
      merchant_amount_xof: merchant_amount,
      driver_amount_xof: driver_amount,
    }, null, 201);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// POST /api/v1/orders
// Dual-purpose: authenticated merchants create manual multi-item orders from
// the dashboard; everyone else (anonymous, or a logged-in customer/driver
// browsing the public shop page) creates a single-product order. Dispatched
// on req.user.role rather than mere presence of req.user, so a customer or
// driver who happens to be logged in while placing a guest order is not
// misrouted into the merchant-only path.
router.post('/', optionalAuth, asyncHandler(async (req, res) => {
  if (req.user && req.user.role === 'merchant') {
    return validate({ body: merchantOrderSchema })(req, res, () => merchantCreateOrder(req, res));
  }
  return customerCreateOrder(req, res);
}));

// List orders
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req.query);
  let where = 'shop_id = $1'; const params = [req.user.shopId]; let i = 2;
  if (req.query.status) { where += ` AND status = $${i++}`; params.push(req.query.status); }
  if (req.query.search) { where += ` AND (customer_name ILIKE $${i} OR customer_phone ILIKE $${i})`; params.push(`%${req.query.search}%`); i++; }
  params.push(limit, offset);
  const [data, count] = await Promise.all([
    query(`SELECT * FROM orders WHERE ${where} ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i}`, params),
    query(`SELECT COUNT(*)::int AS total FROM orders WHERE ${where}`, params.slice(0, i - 2)),
  ]);
  return successResponse(res, data.rows, paginationMeta(page, limit, count.rows[0].total));
}));

// Stats (MUST be before /:id to avoid 'stats' being captured as an order ID)
router.get('/stats', authenticate, asyncHandler(async (req, res) => {
  const r = await query(`SELECT status, COUNT(*)::int AS count FROM orders WHERE shop_id = $1 GROUP BY status`, [req.user.shopId]);
  const stats = {}; r.rows.forEach(row => { stats[row.status] = row.count; });
  return successResponse(res, stats);
}));

// Get order
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const r = await query('SELECT * FROM orders WHERE id = $1 AND shop_id = $2', [req.params.id, req.user.shopId]);
  if (r.rows.length === 0) throw new NotFoundError('Commande introuvable');
  const items = await query('SELECT * FROM order_items WHERE order_id = $1', [req.params.id]);
  return successResponse(res, { ...r.rows[0], items: items.rows });
}));

// Update status (merchant dashboard)
router.patch('/:id/status', authenticate, validate({ body: z.object({ status: z.enum(['new','confirmed','processing','ready','delivered','completed','cancelled']) }) }), asyncHandler(async (req, res) => {
  const r = await query('SELECT status, total_amount_xof FROM orders WHERE id = $1 AND shop_id = $2', [req.params.id, req.user.shopId]);
  if (r.rows.length === 0) throw new NotFoundError('Commande introuvable');
  const oldStatus = r.rows[0].status;
  const totalAmount = r.rows[0].total_amount_xof;
  const allowed = ORDER_TRANSITIONS[oldStatus] || [];
  if (!allowed.includes(req.body.status)) throw new BadRequestError(`Transition ${oldStatus} → ${req.body.status} non autorisée`);

  const client = await getClient();
  let updated;
  try {
    await client.query('BEGIN');
    updated = await client.query('UPDATE orders SET status = $1 WHERE id = $2 RETURNING *', [req.body.status, req.params.id]);

    // Financial flow
    if (req.body.status === 'delivered') {
      const platformFee = 0;
      const merchantEarnings = totalAmount;

      await client.query(
        `INSERT INTO order_financials (order_id, shop_id, platform_fee_xof, merchant_earnings_xof, status)
         VALUES ($1, $2, $3, $4, 'pending_payout') ON CONFLICT (order_id) DO NOTHING`,
        [req.params.id, req.user.shopId, platformFee, merchantEarnings]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  eventBus.emit('order:status_changed', { shopId: req.user.shopId, orderId: req.params.id, oldStatus, newStatus: req.body.status });
  return successResponse(res, updated.rows[0]);
}));

// Driver accepts a customer order (assigns driver_id)
router.put('/:id/accept', authenticate, asyncHandler(async (req, res) => {
  const driverRes = await query('SELECT id FROM delivery_drivers WHERE user_id = $1', [req.user.userId]);
  if (driverRes.rows.length === 0) throw new NotFoundError('Profil livreur introuvable');
  const driverId = driverRes.rows[0].id;

  const r = await query(
    `UPDATE orders SET driver_id = $1 WHERE id = $2 AND driver_id IS NULL RETURNING *`,
    [driverId, req.params.id]
  );
  if (r.rows.length === 0) throw new BadRequestError('Commande déjà prise en charge ou introuvable');
  return successResponse(res, r.rows[0]);
}));

// Driver sequential status updates: pickup -> picked_up -> delivered
const DRIVER_STATUS_MESSAGES = {
  pickup: 'Le livreur est en route vers la boutique 🛵',
  picked_up: 'Le livreur a récupéré votre commande 📦',
  delivered: 'Votre commande est livrée ! ✅',
};

router.put('/:id/status', authenticate, validate({ body: z.object({ status: z.enum(['pickup', 'picked_up', 'delivered']) }) }), asyncHandler(async (req, res) => {
  const driverRes = await query('SELECT id FROM delivery_drivers WHERE user_id = $1', [req.user.userId]);
  if (driverRes.rows.length === 0) throw new NotFoundError('Profil livreur introuvable');
  const driverId = driverRes.rows[0].id;

  const orderRes = await query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
  if (orderRes.rows.length === 0) throw new NotFoundError('Commande introuvable');
  const order = orderRes.rows[0];
  if (order.driver_id !== driverId) throw new ForbiddenError('Cette commande ne vous est pas assignée');

  const { status } = req.body;
  if (status === 'picked_up' && order.status !== 'pickup') throw new BadRequestError('La commande doit être en route vers la boutique avant ce statut');
  if (status === 'delivered' && order.status !== 'picked_up') throw new BadRequestError('Le produit doit être récupéré avant de marquer la livraison');

  const client = await getClient();
  let updated;
  try {
    await client.query('BEGIN');
    updated = await client.query('UPDATE orders SET status = $1 WHERE id = $2 RETURNING *', [status, req.params.id]);

    if (status === 'delivered') {
      const finRes = await client.query('SELECT driver_amount_xof FROM order_financials WHERE order_id = $1', [req.params.id]);
      const driverAmount = finRes.rows[0]?.driver_amount_xof || 0;

      await client.query(
        `INSERT INTO driver_payments (driver_id, amount_xof, type, status) VALUES ($1, $2, 'earning', 'completed')`,
        [driverId, driverAmount]
      );
      await client.query(
        `UPDATE delivery_drivers SET balance_xof = balance_xof + $1, total_earnings_xof = total_earnings_xof + $1, total_deliveries = total_deliveries + 1 WHERE id = $2`,
        [driverAmount, driverId]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  getIO().to('customer:' + order.customer_phone).emit('order:update', {
    order_id: order.id,
    status,
    message: DRIVER_STATUS_MESSAGES[status],
  });

  return successResponse(res, updated.rows[0]);
}));

// Orders webhook (no auth)
router.post('/webhook', asyncHandler(async (req, res) => {
  // Validate with internal API key
  const apiKey = req.headers['x-webhook-secret'];
  const config2 = require('../../config/index');
  if (apiKey !== config2.internalApiKey) throw new (require('../../utils/errors').UnauthorizedError)('Clé API invalide');

  const { shop_id, customer_name, customer_phone, customer_message, delivery_address, delivery_fee_xof, client_latitude, client_longitude, items, source } = req.body;
  const orderNum = `SHOP-${Date.now().toString(36).toUpperCase()}`;

  const client = await getClient();
  try {
    await client.query('BEGIN');
    let total = 0;
    const orderR = await client.query(
      `INSERT INTO orders (shop_id, order_number, customer_name, customer_phone, customer_message, delivery_address, delivery_fee_xof, client_latitude, client_longitude, source, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'new') RETURNING *`,
      [shop_id, orderNum, customer_name, customer_phone, customer_message, delivery_address || null, delivery_fee_xof || null, client_latitude || null, client_longitude || null, source || 'website_form']
    );
    if (items && items.length) {
      for (const item of items) {
        total += item.quantity * item.unit_price_xof;
        await client.query(
          `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price_xof, line_total_xof)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [orderR.rows[0].id, item.product_id, item.product_name, item.quantity, item.unit_price_xof, item.quantity * item.unit_price_xof]
        );
      }
      await client.query('UPDATE orders SET total_amount_xof = $1 WHERE id = $2', [total, orderR.rows[0].id]);
    }
    await client.query('COMMIT');
    eventBus.emit('order:created', { shopId: shop_id, orderId: orderR.rows[0].id });
    return successResponse(res, orderR.rows[0], null, 201);
  } catch (err) { await client.query('ROLLBACK'); throw err; } finally { client.release(); }
}));

module.exports = router;
