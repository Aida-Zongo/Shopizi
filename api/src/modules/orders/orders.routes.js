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
const { calculateHaversineDistance, calculateShopDeliveryFee } = require('../delivery/delivery.service');
const { getIO } = require('../../realtime/socket');
const { broadcastNewOrder } = require('./order-broadcast');

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
  delivery_city_id: z.string().uuid().optional().nullable(),
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
    customer_name, customer_phone, delivery_address, delivery_city_id, client_latitude, client_longitude,
  } = body;

  const shopRes = await query('SELECT name, latitude, longitude, COALESCE(city_name, city) AS city_name FROM shops WHERE id = $1', [shop_id]);
  if (shopRes.rows.length === 0) throw new NotFoundError('Boutique introuvable');
  const shop = shopRes.rows[0];

  let deliveryFee = 0;
  let distanceKm = null;
  if (client_latitude != null && client_longitude != null) {
    const feeResult = await calculateShopDeliveryFee(shop, Number(client_latitude), Number(client_longitude));
    if (feeResult.same_city && feeResult.fee != null) {
      deliveryFee = feeResult.fee;
      distanceKm = feeResult.distance;
    }
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
      `INSERT INTO orders (shop_id, order_number, customer_name, customer_phone, delivery_address, delivery_city_id, delivery_fee_xof, client_latitude, client_longitude, source, status, total_amount_xof, customer_user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'website_form','new',$10,$11) RETURNING *`,
      [shop_id, orderNum, customer_name, customer_phone, delivery_address || null, delivery_city_id || null, deliveryFee, client_latitude || null, client_longitude || null, totalAmount, req.user?.role === 'customer' ? req.user.userId : null]
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

    // Auto-create a pending_driver delivery record so drivers see the job
    // via GET /delivery/available (HTTP polling) even if they missed the
    // real-time Socket.io broadcast.
    const shopFullRes = await client.query(
      'SELECT address, city_id, latitude, longitude FROM shops WHERE id = $1',
      [shop_id]
    );
    const shopFull = shopFullRes.rows[0] || {};
    const deliveryR = await client.query(
      `INSERT INTO deliveries
         (order_id, shop_id, city_id,
          pickup_address,   pickup_latitude,  pickup_longitude,
          delivery_address, delivery_latitude, delivery_longitude,
          delivery_fee_xof, distance_km, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending_driver')
       RETURNING id`,
      [
        order.id, shop_id,
        delivery_city_id || shopFull.city_id || null,
        shopFull.address || '',
        shopFull.latitude  != null ? Number(shopFull.latitude)  : null,
        shopFull.longitude != null ? Number(shopFull.longitude) : null,
        delivery_address || '',
        client_latitude  != null ? Number(client_latitude)  : null,
        client_longitude != null ? Number(client_longitude) : null,
        deliveryFee,
        distanceKm != null ? distanceKm : null,
      ]
    );
    // Link the delivery back to the order
    await client.query(
      'UPDATE orders SET delivery_id = $1 WHERE id = $2',
      [deliveryR.rows[0].id, order.id]
    );

    await client.query('COMMIT');

    eventBus.emit('order:created', { shopId: shop_id, orderId: order.id });
    await broadcastNewOrder(order, product_name);

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
  const [byStatus, revenue] = await Promise.all([
    query(`SELECT status, COUNT(*)::int AS count FROM orders WHERE shop_id = $1 GROUP BY status`, [req.user.shopId]),
    query(`SELECT COALESCE(SUM(total_amount_xof), 0)::int AS revenue_month_xof FROM orders
           WHERE shop_id = $1 AND payment_status = 'paid' AND created_at >= date_trunc('month', now())`, [req.user.shopId]),
  ]);
  const stats = { revenue_month_xof: revenue.rows[0].revenue_month_xof };
  byStatus.rows.forEach(row => { stats[row.status] = row.count; });
  return successResponse(res, stats);
}));

// Driver: list own in-progress orders (MUST be before /:id).
// No 'accepted' status exists in DB: accepting only sets driver_id,
// so "active" = assigned to this driver and not yet delivered/completed/cancelled.
router.get('/driver/active', authenticate, asyncHandler(async (req, res) => {
  const driverRes = await query('SELECT id FROM delivery_drivers WHERE user_id = $1', [req.user.userId]);
  if (driverRes.rows.length === 0) throw new NotFoundError('Profil livreur introuvable');
  const driverId = driverRes.rows[0].id;

  const r = await query(
    `SELECT o.id AS order_id, o.status, o.customer_name, o.customer_phone, o.customer_user_id,
            o.delivery_address, o.client_latitude, o.client_longitude, o.delivery_fee_xof,
            s.name AS shop_name, COALESCE(s.city_name, s.city) AS shop_city, s.address AS shop_address,
            s.latitude AS shop_latitude, s.longitude AS shop_longitude,
            c.name AS customer_city,
            f.driver_amount_xof,
            (SELECT oi.product_name FROM order_items oi WHERE oi.order_id = o.id ORDER BY oi.created_at LIMIT 1) AS product_name
     FROM orders o
     JOIN shops s ON s.id = o.shop_id
     LEFT JOIN cities c ON c.id = o.delivery_city_id
     LEFT JOIN order_financials f ON f.order_id = o.id
     WHERE o.driver_id = $1 AND o.status NOT IN ('delivered', 'completed', 'cancelled')
     ORDER BY o.created_at DESC`,
    [driverId]
  );

  const orders = r.rows.map(row => {
    let distanceKm = null;
    if (row.client_latitude != null && row.client_longitude != null && row.shop_latitude != null && row.shop_longitude != null) {
      distanceKm = calculateHaversineDistance(
        Number(row.shop_latitude), Number(row.shop_longitude),
        Number(row.client_latitude), Number(row.client_longitude)
      );
    }
    return {
      ...row,
      customer_city: row.customer_city || 'Non précisée',
      driver_amount: Number(row.driver_amount_xof) || 0,
      delivery_fee: Number(row.delivery_fee_xof) || 0,
      distance_km: distanceKm,
      estimated_minutes: distanceKm != null ? Math.round(distanceKm * 3) : null,
    };
  });

  return successResponse(res, orders);
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

// Driver: generate the delivery confirmation QR code for an assigned order.
// The QR encodes a one-time token URL that the customer scans to confirm.
router.get('/:id/qrcode', authenticate, asyncHandler(async (req, res) => {
  const QRCode = require('qrcode');
  const crypto = require('crypto');
  const config = require('../../config/index');

  const driverRes = await query('SELECT id FROM delivery_drivers WHERE user_id = $1', [req.user.userId]);
  if (driverRes.rows.length === 0) throw new NotFoundError('Profil livreur introuvable');
  const driverId = driverRes.rows[0].id;

  const orderRes = await query('SELECT id, driver_id, status FROM orders WHERE id = $1 AND driver_id = $2', [req.params.id, driverId]);
  if (orderRes.rows.length === 0) throw new NotFoundError('Commande introuvable');

  const confirmToken = crypto.randomBytes(32).toString('hex');
  await query('UPDATE orders SET delivery_confirm_token = $1 WHERE id = $2', [confirmToken, req.params.id]);

  const confirmUrl = `${config.frontend.url}/confirm-delivery/${req.params.id}?token=${confirmToken}`;
  const qrDataUrl = await QRCode.toDataURL(confirmUrl, {
    width: 300,
    margin: 2,
    color: { dark: '#0A504A', light: '#FFFFFF' },
  });

  return successResponse(res, { qr_code: qrDataUrl, confirm_url: confirmUrl });
}));

// Customer scans the QR code (public, secured by the one-time token):
// marks the order delivered, credits the driver, notifies everyone.
router.post('/:id/confirm-delivery', validate({ body: z.object({ token: z.string().min(10) }) }), asyncHandler(async (req, res) => {
  const orderRes = await query(
    `SELECT * FROM orders WHERE id = $1 AND delivery_confirm_token = $2 AND status = 'picked_up'`,
    [req.params.id, req.body.token]
  );
  if (orderRes.rows.length === 0) throw new BadRequestError('Lien invalide ou commande déjà confirmée');
  const order = orderRes.rows[0];

  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE orders SET status = 'delivered', payment_status = 'paid', delivered_at = NOW(), delivery_confirm_token = NULL WHERE id = $1`,
      [req.params.id]
    );

    // Same crediting flow as the manual 'delivered' status update
    if (order.driver_id) {
      const finRes = await client.query('SELECT driver_amount_xof FROM order_financials WHERE order_id = $1', [req.params.id]);
      const driverAmount = finRes.rows[0]?.driver_amount_xof || 0;

      await client.query(
        `INSERT INTO driver_payments (driver_id, amount_xof, type, status) VALUES ($1, $2, 'earning', 'completed')`,
        [order.driver_id, driverAmount]
      );
      await client.query(
        `UPDATE delivery_drivers SET balance_xof = balance_xof + $1, total_earnings_xof = total_earnings_xof + $1, total_deliveries = total_deliveries + 1 WHERE id = $2`,
        [driverAmount, order.driver_id]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const io = getIO();
  io.to('customer:' + order.customer_phone).emit('order:update', {
    order_id: order.id,
    status: 'delivered',
    message: 'Votre commande a été livrée ! ✅',
  });
  if (order.driver_id) {
    io.to('driver:' + order.driver_id).emit('delivery:confirmed', {
      order_id: order.id,
      message: 'Livraison confirmée ! Vos gains ont été crédités.',
    });
  }
  eventBus.emit('order:status_changed', { shopId: order.shop_id, orderId: order.id, oldStatus: 'picked_up', newStatus: 'delivered' });

  return successResponse(res, { confirmed: true, order_id: order.id });
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
