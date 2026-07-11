const { query } = require('../../db/pool');
const { getIO } = require('../../realtime/socket');
const { calculateHaversineDistance } = require('../delivery/delivery.service');

/**
 * Broadcast a 'new:order' event to delivery drivers with the full route info
 * (shop + customer locations, distance, earnings), targeted to online drivers
 * of the shop's or customer's city. Falls back to a global broadcast with a
 * 'long distance' note when no local driver is online. Never throws: a
 * broadcast failure must not break order creation or payment.
 */
async function broadcastNewOrder(order, productName) {
  try {
    const shopRes = await query(
      'SELECT name, city_id, COALESCE(city_name, city) AS city, address, latitude, longitude FROM shops WHERE id = $1',
      [order.shop_id]
    );
    const shop = shopRes.rows[0] || {};

    const finRes = await query('SELECT driver_amount_xof FROM order_financials WHERE order_id = $1', [order.id]);
    const driverAmount = Number(finRes.rows[0]?.driver_amount_xof) || 0;

    let customerCity = null;
    if (order.delivery_city_id) {
      const cityRes = await query('SELECT name FROM cities WHERE id = $1', [order.delivery_city_id]);
      customerCity = cityRes.rows[0]?.name || null;
    }

    let distanceKm = null;
    if (order.client_latitude != null && order.client_longitude != null && shop.latitude != null && shop.longitude != null) {
      distanceKm = calculateHaversineDistance(
        Number(shop.latitude), Number(shop.longitude),
        Number(order.client_latitude), Number(order.client_longitude)
      );
    }

    const payload = {
      order_id: order.id,
      product_name: productName || null,
      shop_name: shop.name || null,
      shop_city: shop.city || null,
      shop_address: shop.address || null,
      shop_latitude: shop.latitude != null ? Number(shop.latitude) : null,
      shop_longitude: shop.longitude != null ? Number(shop.longitude) : null,
      customer_name: order.customer_name || null,
      customer_city: customerCity || 'Non précisée',
      customer_address: order.delivery_address || null,
      customer_latitude: order.client_latitude != null ? Number(order.client_latitude) : null,
      customer_longitude: order.client_longitude != null ? Number(order.client_longitude) : null,
      distance_km: distanceKm,
      estimated_minutes: distanceKm != null ? Math.round(distanceKm * 3) : null,
      driver_amount: driverAmount,
      delivery_fee: Number(order.delivery_fee_xof) || 0,
      delivery_address: order.delivery_address || null,
    };

    const io = getIO();
    const cityIds = [shop.city_id, order.delivery_city_id].filter(Boolean);
    const cityNames = [shop.city, customerCity].filter(Boolean);
    let drivers = [];
    if (cityIds.length > 0 || cityNames.length > 0) {
      const driversRes = await query(
        `SELECT dd.id FROM delivery_drivers dd
         JOIN users u ON u.id = dd.user_id
         WHERE u.is_online = true
           AND (dd.city_id = ANY($1::uuid[]) OR dd.city_name ILIKE ANY($2::text[]))`,
        [cityIds, cityNames]
      );
      drivers = driversRes.rows;
    }

    if (drivers.length > 0) {
      for (const d of drivers) {
        io.to('driver:' + d.id).emit('new:order', payload);
      }
    } else {
      io.emit('new:order', { ...payload, note: 'Aucun livreur local — course longue distance' });
    }
  } catch (err) {
    console.error('broadcastNewOrder failed:', err.message);
  }
}

module.exports = { broadcastNewOrder };
