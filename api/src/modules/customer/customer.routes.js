const { Router } = require('express');
const { query } = require('../../db/pool');
const { successResponse } = require('../../utils/response');
const asyncHandler = require('../../middleware/asyncHandler');
const { cacheGet, cacheSet } = require('../../services/redis.service');
const { authenticate } = require('../../middleware/authenticate');
const { NotFoundError } = require('../../utils/errors');

const router = Router();

// GET /api/v1/customer/orders - the logged-in customer's own order history
router.get('/orders', authenticate, asyncHandler(async (req, res) => {
  const result = await query(`
    SELECT o.*, s.name AS shop_name, s.subdomain AS shop_subdomain, s.logo_url AS shop_logo_url
    FROM orders o
    JOIN shops s ON o.shop_id = s.id
    WHERE o.customer_user_id = $1
    ORDER BY o.created_at DESC
  `, [req.user.userId]);
  return successResponse(res, result.rows);
}));

// GET /api/v1/customer/orders/:id - detail of one of the customer's own orders
router.get('/orders/:id', authenticate, asyncHandler(async (req, res) => {
  const orderRes = await query(`
    SELECT o.*, s.name AS shop_name, s.subdomain AS shop_subdomain
    FROM orders o
    JOIN shops s ON o.shop_id = s.id
    WHERE o.id = $1 AND o.customer_user_id = $2
  `, [req.params.id, req.user.userId]);
  if (orderRes.rows.length === 0) throw new NotFoundError('Commande introuvable');
  const items = await query('SELECT * FROM order_items WHERE order_id = $1', [req.params.id]);
  return successResponse(res, { ...orderRes.rows[0], items: items.rows });
}));

// GET /api/v1/customer/shops - list published shops with optional filters
router.get('/shops', asyncHandler(async (req, res) => {
  const { category, city_name, q, limit = 20, offset = 0 } = req.query;

  let sql = `
    SELECT s.id, s.name, s.subdomain, s.category, s.description,
           s.city_name, s.logo_url, s.banner_url,
           s.allows_delivery, s.delivery_fee_xof, s.whatsapp_number,
           s.address, s.neighborhood,
           COUNT(DISTINCT p.id) AS product_count,
           ROUND(AVG(r.rating)::numeric, 1) AS avg_rating,
           COUNT(DISTINCT r.id) AS total_reviews
    FROM shops s
    LEFT JOIN products p ON p.shop_id = s.id AND p.is_published = true
    LEFT JOIN reviews r ON r.shop_id = s.id AND r.status = 'approved'
    WHERE s.is_published = true
  `;
  const params = [];
  let idx = 1;

  if (category) {
    sql += ` AND s.category = $${idx++}`;
    params.push(category);
  }
  if (city_name) {
    sql += ` AND s.city_name ILIKE $${idx++}`;
    params.push(`%${city_name}%`);
  }
  if (q) {
    sql += ` AND (s.name ILIKE $${idx} OR s.description ILIKE $${idx})`;
    params.push(`%${q}%`);
    idx++;
  }

  sql += ` GROUP BY s.id ORDER BY s.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
  params.push(Number(limit), Number(offset));

  const result = await query(sql, params);

  // Cache result for 60 seconds when no query filters are active
  return successResponse(res, result.rows);
}));

// GET /api/v1/customer/products/featured - featured/recent products across all shops
// Sponsored products (active ads) are surfaced first
router.get('/products/featured', asyncHandler(async (req, res) => {
  const CACHE_KEY = 'featured_products';
  const cached = await cacheGet(CACHE_KEY);
  if (cached) return successResponse(res, cached);

  // Get sponsored products first
  const sponsoredResult = await query(`
    SELECT p.id, p.name, p.price_xof, p.sale_price_xof,
           s.name AS shop_name, s.subdomain AS shop_subdomain, s.slug AS shop_slug, s.city_name, s.category,
           pi.url AS image_url, true AS is_sponsored
    FROM ads a
    JOIN products p ON p.id = a.product_id
    JOIN shops s ON p.shop_id = s.id
    LEFT JOIN LATERAL (
      SELECT url FROM product_images WHERE product_id = p.id
      ORDER BY is_primary DESC, sort_order LIMIT 1
    ) pi ON true
    WHERE a.status = 'active' AND p.is_published = true AND s.is_published = true
    ORDER BY a.created_at DESC
    LIMIT 6
  `);

  const sponsoredIds = sponsoredResult.rows.map(r => r.id);

  const result = await query(`
    SELECT p.id, p.name, p.price_xof, p.sale_price_xof,
           s.name AS shop_name, s.subdomain AS shop_subdomain, s.slug AS shop_slug, s.city_name, s.category,
           pi.url AS image_url, false AS is_sponsored
    FROM products p
    JOIN shops s ON p.shop_id = s.id
    LEFT JOIN LATERAL (
      SELECT url FROM product_images WHERE product_id = p.id
      ORDER BY is_primary DESC, sort_order LIMIT 1
    ) pi ON true
    WHERE p.is_published = true AND s.is_published = true AND p.is_featured = true
      ${sponsoredIds.length > 0 ? `AND p.id NOT IN (${sponsoredIds.map((_, i) => `$${i + 1}`).join(',')})` : ''}
    ORDER BY p.created_at DESC
    LIMIT 20
  `, sponsoredIds);

  // Merge: sponsored first
  let allProducts = [...sponsoredResult.rows, ...result.rows];

  // If not enough, fill with recent
  if (allProducts.length < 10) {
    const allIds = allProducts.map(r => r.id);
    const extra = await query(`
      SELECT p.id, p.name, p.price_xof, p.sale_price_xof,
             s.name AS shop_name, s.subdomain AS shop_subdomain, s.slug AS shop_slug, s.city_name, s.category,
             pi.url AS image_url, false AS is_sponsored
      FROM products p
      JOIN shops s ON p.shop_id = s.id
      LEFT JOIN LATERAL (
        SELECT url FROM product_images WHERE product_id = p.id
        ORDER BY is_primary DESC, sort_order LIMIT 1
      ) pi ON true
      WHERE p.is_published = true AND s.is_published = true
        ${allIds.length > 0 ? `AND p.id NOT IN (${allIds.map((_, i) => `$${i + 1}`).join(',')})` : ''}
      ORDER BY p.created_at DESC
      LIMIT $${allIds.length + 1}
    `, [...allIds, 20 - allProducts.length]);
    allProducts = [...allProducts, ...extra.rows];
  }

  await cacheSet(CACHE_KEY, allProducts, 120); // Cache 2 minutes
  return successResponse(res, allProducts);
}));

// GET /api/v1/customer/search - search products + shops
router.get('/search', asyncHandler(async (req, res) => {
  const { q, city_name } = req.query;
  if (!q) return successResponse(res, { shops: [], products: [] });

  const pattern = `%${q}%`;

  const [shopsRes, productsRes] = await Promise.all([
    query(`
      SELECT id, name, subdomain, category, logo_url, city_name, allows_delivery
      FROM shops
      WHERE is_published = true AND (name ILIKE $1 OR description ILIKE $1 OR category ILIKE $1)
      LIMIT 5
    `, [pattern]),
    query(`
      SELECT p.id, p.name, p.price_xof, p.sale_price_xof,
             s.name AS shop_name, s.subdomain AS shop_subdomain,
             pi.url AS image_url
      FROM products p
      JOIN shops s ON p.shop_id = s.id
      LEFT JOIN LATERAL (
        SELECT url FROM product_images WHERE product_id = p.id
        ORDER BY is_primary DESC, sort_order LIMIT 1
      ) pi ON true
      WHERE p.is_published = true AND s.is_published = true
        AND (p.name ILIKE $1 OR p.description ILIKE $1)
      ORDER BY p.created_at DESC
      LIMIT 20
    `, [pattern]),
  ]);

  return successResponse(res, {
    shops: shopsRes.rows,
    products: productsRes.rows,
  });
}));

// GET /api/v1/customer/stats - public counts for the homepage hero
router.get('/stats', asyncHandler(async (req, res) => {
  const result = await query(`
    SELECT
      (SELECT COUNT(*)::int FROM shops WHERE is_published = true) AS shops,
      (SELECT COUNT(*)::int FROM products p
       JOIN shops s ON p.shop_id = s.id
       WHERE p.is_published = true AND s.is_published = true) AS products
  `);
  return successResponse(res, result.rows[0]);
}));

module.exports = router;
