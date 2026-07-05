const { Router } = require('express');
const ctrl = require('./products.controller');
const { authenticate } = require('../../middleware/authenticate');
const validate = require('../../middleware/validate');
const asyncHandler = require('../../middleware/asyncHandler');
const subscriptionGate = require('../../middleware/subscriptionGate');
const { productImageUpload } = require('../../middleware/upload');
const { createProductSchema, updateProductSchema, createVariantSchema, reorderSchema } = require('./products.validation');

const router = Router();

// Product CRUD
router.get('/', authenticate, asyncHandler(ctrl.list));
router.post('/', authenticate, subscriptionGate('product.create'), validate({ body: createProductSchema }), asyncHandler(ctrl.create));
router.get('/:id', authenticate, asyncHandler(ctrl.get));
router.put('/:id', authenticate, validate({ body: updateProductSchema }), asyncHandler(ctrl.update));
router.delete('/:id', authenticate, asyncHandler(ctrl.remove));

// Images
router.post('/:id/images', authenticate, subscriptionGate('product.image'), (req, res, next) => {
  productImageUpload(req, res, (err) => { if (err) return next(err); next(); });
}, asyncHandler(ctrl.uploadImages));
router.delete('/:id/images/:imageId', authenticate, asyncHandler(ctrl.deleteImage));
router.patch('/:id/images/:imageId/primary', authenticate, asyncHandler(ctrl.setPrimary));

// Variants
router.post('/:id/variants', authenticate, subscriptionGate('product.variant'), validate({ body: createVariantSchema }), asyncHandler(ctrl.createVariant));
router.put('/:id/variants/:variantId', authenticate, validate({ body: createVariantSchema }), asyncHandler(ctrl.updateVariant));
router.delete('/:id/variants/:variantId', authenticate, asyncHandler(ctrl.deleteVariant));

// Reorder
router.post('/reorder', authenticate, validate({ body: reorderSchema }), asyncHandler((req, res) => {
  const { query } = require('../../db/pool');
  for (const item of req.body.items) {
    query('UPDATE products SET sort_order = $1 WHERE id = $2 AND shop_id = $3', [item.sort_order, item.id, req.user.shopId]);
  }
  return require('../../utils/response').successResponse(res, { message: 'Ordre mis à jour' });
}));

module.exports = router;