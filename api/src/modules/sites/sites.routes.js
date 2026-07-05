const { Router } = require('express');
const { query } = require('../../db/pool');
const { authenticate } = require('../../middleware/authenticate');
const asyncHandler = require('../../middleware/asyncHandler');
const { successResponse } = require('../../utils/response');
const { NotFoundError } = require('../../utils/errors');
const eventBus = require('../../events');

const router = Router();

// Trigger manual generation
router.post('/generate', authenticate, asyncHandler(async (req, res) => {
  // Get shop
  const shop = await query('SELECT id, subdomain FROM shops WHERE user_id = $1', [req.user.userId]);
  if (shop.rows.length === 0) throw new NotFoundError('Boutique introuvable');

  // Create log entry
  const log = await query(
    `INSERT INTO site_generation_logs (shop_id, trigger, status)
     VALUES ($1, 'manual', 'queued') RETURNING *`,
    [shop.rows[0].id]
  );

  // Emit generation event
  eventBus.emit('site:generate', { shopId: shop.rows[0].id, trigger: 'manual' });

  return successResponse(res, { log_id: log.rows[0].id, status: 'queued', message: 'Génération du site en cours...' });
}));

// Get generation status/history
router.get('/status', authenticate, asyncHandler(async (req, res) => {
  const shop = await query('SELECT id FROM shops WHERE user_id = $1', [req.user.userId]);
  if (shop.rows.length === 0) throw new NotFoundError('Boutique introuvable');

  const logs = await query(
    'SELECT * FROM site_generation_logs WHERE shop_id = $1 ORDER BY created_at DESC LIMIT 10',
    [shop.rows[0].id]
  );
  return successResponse(res, logs.rows);
}));

module.exports = router;