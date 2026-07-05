const { Router } = require('express');
const ctrl = require('./shops.controller');
const { authenticate } = require('../../middleware/authenticate');
const validate = require('../../middleware/validate');
const asyncHandler = require('../../middleware/asyncHandler');
const { createShopSchema, updateShopSchema, publishSchema, domainSchema } = require('./shops.validation');
const subscriptionGate = require('../../middleware/subscriptionGate');

const router = Router();

router.post('/', authenticate, validate({ body: createShopSchema }), asyncHandler(ctrl.create));
router.get('/my', authenticate, asyncHandler(ctrl.getMy));
router.put('/my', authenticate, validate({ body: updateShopSchema }), asyncHandler(ctrl.updateFull));
router.patch('/my', authenticate, validate({ body: updateShopSchema }), asyncHandler(ctrl.updatePartial));
router.patch('/my/publish', authenticate, validate({ body: publishSchema }), asyncHandler(ctrl.publish));
router.post('/my/verify-domain', authenticate, subscriptionGate('custom.domain'), validate({ body: domainSchema }), asyncHandler(ctrl.verifyDomain));
router.get('/my/stats', authenticate, asyncHandler(ctrl.stats));
router.get('/:subdomain/public', asyncHandler(ctrl.getPublic));

module.exports = router;