const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../../db/pool');
const { authenticate } = require('../../middleware/authenticate');
const asyncHandler = require('../../middleware/asyncHandler');
const { singleUpload } = require('../../middleware/upload');
const { successResponse } = require('../../utils/response');
const { NotFoundError } = require('../../utils/errors');
const { isCloudinaryEnabled, uploadBuffer, deleteAsset } = require('../../services/cloudinary.service');

const router = Router();

// Upload media
router.post('/upload', authenticate, asyncHandler(async (req, res) => {
  singleUpload(req, res, async (err) => {
    if (err) throw err;
    if (!req.file) throw new NotFoundError('Aucun fichier reçu');

    let fileUrl;
    let cloudinaryPublicId = null;

    if (isCloudinaryEnabled()) {
      // ✅ Upload to Cloudinary
      const folder = `shopizi/${req.user.shopId}/media`;
      const result = await uploadBuffer(req.file.buffer, { folder });
      fileUrl = result.secure_url;
      cloudinaryPublicId = result.public_id;
    } else {
      // 🔄 Fallback: local disk storage (dev only)
      const fs = require('fs').promises;
      const path = require('path');
      const config = require('../../config/index');
      const uploadDir = path.join(config.upload.dir, req.user.shopId, 'media');
      await fs.mkdir(uploadDir, { recursive: true });
      const filename = `${uuidv4()}${path.extname(req.file.originalname)}`;
      const destPath = path.join(uploadDir, filename);
      await fs.writeFile(destPath, req.file.buffer);
      fileUrl = `/uploads/${req.user.shopId}/media/${filename}`;
    }

    const r = await query(
      `INSERT INTO media (user_id, shop_id, filename, original_name, mime_type, size_bytes, path, cloudinary_public_id, entity_type, entity_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        req.user.userId, req.user.shopId,
        req.file.originalname, req.file.originalname,
        req.file.mimetype, req.file.size,
        fileUrl, cloudinaryPublicId,
        req.body.entity_type || 'product_image',
        req.body.entity_id || null,
      ]
    );
    return successResponse(res, { ...r.rows[0], url: fileUrl }, null, 201);
  });
}));

// List media
router.get('/', authenticate, asyncHandler(async (req, res) => {
  let q = 'SELECT * FROM media WHERE shop_id = $1';
  const params = [req.user.shopId];
  if (req.query.entity_type) { q += ' AND entity_type = $2'; params.push(req.query.entity_type); }
  const r = await query(q + ' ORDER BY created_at DESC', params);
  return successResponse(res, r.rows);
}));

// Delete media (removes from Cloudinary + DB)
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const r = await query('SELECT * FROM media WHERE id = $1 AND shop_id = $2', [req.params.id, req.user.shopId]);
  if (r.rows.length === 0) throw new NotFoundError('Fichier introuvable');

  const file = r.rows[0];

  // Delete from Cloudinary if applicable
  if (file.cloudinary_public_id) {
    await deleteAsset(file.cloudinary_public_id);
  } else if (file.path && file.path.startsWith('/uploads')) {
    // Fallback: delete from local disk
    const fs = require('fs').promises;
    const path = require('path');
    const config = require('../../config/index');
    const localPath = path.join(config.upload.dir, '..', file.path);
    await fs.unlink(localPath).catch(() => {});
  }

  await query('DELETE FROM media WHERE id = $1', [req.params.id]);
  return successResponse(res, { message: 'Fichier supprimé' });
}));

// Storage usage
router.get('/usage', authenticate, asyncHandler(async (req, res) => {
  const r = await query('SELECT COALESCE(SUM(size_bytes),0)::int AS total FROM media WHERE shop_id = $1', [req.user.shopId]);
  return successResponse(res, {
    used_bytes: r.rows[0].total,
    used_mb: Math.round(r.rows[0].total / 1048576 * 100) / 100,
    storage: isCloudinaryEnabled() ? 'cloudinary' : 'local',
  });
}));

module.exports = router;