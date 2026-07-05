const service = require('./shops.service');
const { successResponse } = require('../../utils/response');

async function create(req, res) {
  const shop = await service.createShop(req.user.userId, req.body);
  return successResponse(res, shop, null, 201);
}
async function getMy(req, res) {
  return successResponse(res, await service.getMyShop(req.user.userId));
}
async function updateFull(req, res) {
  return successResponse(res, await service.updateShop(req.user.userId, req.body, false));
}
async function updatePartial(req, res) {
  return successResponse(res, await service.updateShop(req.user.userId, req.body, true));
}
async function publish(req, res) {
  return successResponse(res, await service.publishShop(req.user.userId, req.body.is_published));
}
async function getPublic(req, res) {
  const shop = await service.getShopBySubdomain(req.params.subdomain);
  // Also get products and categories for the public site
  const { query } = require('../../db/pool');
  const [products, categories] = await Promise.all([
    query('SELECT p.*, pi.url AS image_url, pi.thumbnail_url FROM products p LEFT JOIN LATERAL (SELECT url, thumbnail_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, sort_order LIMIT 1) pi ON true WHERE p.shop_id = $1 AND p.is_published = true ORDER BY p.sort_order, p.created_at DESC', [shop.id]),
    query('SELECT * FROM categories WHERE shop_id = $1 ORDER BY sort_order', [shop.id]),
  ]);
  return successResponse(res, { shop, products: products.rows, categories: categories.rows });
}
async function stats(req, res) {
  return successResponse(res, await service.getShopStats(req.user.userId));
}
async function verifyDomain(req, res) {
  return successResponse(res, await service.verifyCustomDomain(req.user.userId, req.body.custom_domain));
}

module.exports = { create, getMy, updateFull, updatePartial, publish, getPublic, stats, verifyDomain };