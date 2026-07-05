const { Router } = require('express');
const { query } = require('../../db/pool');
const asyncHandler = require('../../middleware/asyncHandler');
const { successResponse } = require('../../utils/response');
const router = Router();

// List all active cities (public)
router.get('/', asyncHandler(async (req, res) => {
  const r = await query(
    `SELECT id, name, slug, region, country, latitude, longitude
     FROM cities
     WHERE is_active = true
     ORDER BY name`
  );
  return successResponse(res, r.rows);
}));

// Get single city by slug (public)
router.get('/:slug', asyncHandler(async (req, res) => {
  const r = await query(
    `SELECT id, name, slug, region, country, latitude, longitude
     FROM cities
     WHERE slug = $1 AND is_active = true`,
    [req.params.slug]
  );
  if (r.rows.length === 0) {
    return res.status(404).json({ success: false, error: { message: 'Ville introuvable', statusCode: 404 } });
  }
  return successResponse(res, r.rows[0]);
}));

module.exports = router;
