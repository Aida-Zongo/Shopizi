const service = require('./products.service');
const { successResponse, paginationMeta } = require('../../utils/response');

async function list(req, res) {
  const { products, total, page, limit } = await service.listProducts(req.user.shopId, req.query);
  return successResponse(res, products, paginationMeta(page, limit, total));
}
async function get(req, res) {
  return successResponse(res, await service.getProduct(req.user.shopId, req.params.id));
}
async function create(req, res) {
  return successResponse(res, await service.createProduct(req.user.shopId, req.body), null, 201);
}
async function update(req, res) {
  return successResponse(res, await service.updateProduct(req.user.shopId, req.params.id, req.body));
}
async function remove(req, res) {
  return successResponse(res, await service.deleteProduct(req.user.shopId, req.params.id));
}
async function uploadImages(req, res) {
  if (!req.files || req.files.length === 0) throw new (require('../../utils/errors').BadRequestError)('Aucune image fournie');
  const images = await service.uploadProductImages(req.user.shopId, req.params.id, req.files);
  return successResponse(res, images, null, 201);
}
async function deleteImage(req, res) {
  return successResponse(res, await service.deleteProductImage(req.user.shopId, req.params.id, req.params.imageId));
}
async function setPrimary(req, res) {
  return successResponse(res, await service.setPrimaryImage(req.user.shopId, req.params.id, req.params.imageId));
}
async function createVariant(req, res) {
  return successResponse(res, await service.createVariant(req.user.shopId, req.params.id, req.body), null, 201);
}
async function updateVariant(req, res) {
  return successResponse(res, await service.updateVariant(req.user.shopId, req.params.id, req.params.variantId, req.body));
}
async function deleteVariant(req, res) {
  return successResponse(res, await service.deleteVariant(req.user.shopId, req.params.id, req.params.variantId));
}

module.exports = { list, get, create, update, remove, uploadImages, deleteImage, setPrimary, createVariant, updateVariant, deleteVariant };