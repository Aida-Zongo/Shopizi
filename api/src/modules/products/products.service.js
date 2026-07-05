const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const { query, getClient } = require('../../db/pool');
const { slugify } = require('../../utils/slug');
const { parsePagination } = require('../../utils/pagination');
const eventBus = require('../../events');
const { NotFoundError, ForbiddenError } = require('../../utils/errors');
const config = require('../../config/index');

// ========== Products ==========

async function listProducts(shopId, filters = {}) {
  const { page, limit, offset } = parsePagination(filters);
  let where = 'WHERE p.shop_id = $1';
  const params = [shopId];
  let idx = 2;

  if (filters.category_id) {
    where += ` AND p.category_id = $${idx++}`; params.push(filters.category_id);
  }
  if (filters.status === 'published') {
    where += ` AND p.is_published = true`;
  } else if (filters.status === 'draft') {
    where += ` AND p.is_published = false`;
  }
  if (filters.search) {
    where += ` AND (p.name ILIKE $${idx} OR p.description ILIKE $${idx})`;
    params.push(`%${filters.search}%`);
    idx++;
  }

  const sortMap = { name: 'p.name', price: 'p.price_xof', created: 'p.created_at' };
  const orderBy = sortMap[filters.sort] || 'p.created_at DESC';

  params.push(limit, offset);
  const [dataResult, countResult] = await Promise.all([
    query(`SELECT p.*, pi.url AS primary_image, pi.thumbnail_url AS primary_thumbnail
     FROM products p LEFT JOIN LATERAL (
       SELECT url, thumbnail_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, sort_order LIMIT 1
     ) pi ON true
     ${where} ORDER BY ${orderBy} LIMIT $${idx++} OFFSET $${idx}`, params),
    query(`SELECT COUNT(*)::int AS total FROM products p ${where}`, params.slice(0, idx - 2)),
  ]);

  return { products: dataResult.rows, total: countResult.rows[0].total, page, limit };
}

async function getProduct(shopId, productId) {
  const result = await query('SELECT * FROM products WHERE id = $1 AND shop_id = $2', [productId, shopId]);
  if (result.rows.length === 0) throw new NotFoundError('Produit introuvable');

  const [images, variants] = await Promise.all([
    query('SELECT * FROM product_images WHERE product_id = $1 ORDER BY is_primary DESC, sort_order', [productId]),
    query('SELECT * FROM product_variants WHERE product_id = $1 ORDER BY sort_order', [productId]),
  ]);

  return { ...result.rows[0], images: images.rows, variants: variants.rows };
}

async function createProduct(shopId, data) {
  const slug = slugify(data.name);
  const result = await query(
    `INSERT INTO products (shop_id, category_id, name, slug, description, price_xof, sale_price_xof, stock_status, stock_quantity, unit, sku, has_variants, is_featured, is_published)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
    [shopId, data.category_id || null, data.name, slug, data.description || null,
     data.price_xof, data.sale_price_xof || null, data.stock_status || 'in_stock',
     data.stock_quantity || 0, data.unit || null, data.sku || null,
     data.has_variants || false, data.is_featured || false, data.is_published !== false]
  );
  eventBus.emit('product:created', { shopId, productId: result.rows[0].id });
  return result.rows[0];
}

async function updateProduct(shopId, productId, data) {
  const product = await getProduct(shopId, productId);
  if (data.name && data.name !== product.name) data.slug = slugify(data.name);

  const updates = [];
  const params = [];
  let idx = 1;
  const fields = ['name','slug','description','price_xof','sale_price_xof','category_id',
    'stock_status','stock_quantity','unit','sku','is_featured','is_published','sort_order'];

  for (const f of fields) {
    if (data[f] !== undefined) { updates.push(`${f} = $${idx++}`); params.push(data[f]); }
  }
  if (!updates.length) return product;

  params.push(productId, shopId);
  const result = await query(
    `UPDATE products SET ${updates.join(', ')} WHERE id = $${idx++} AND shop_id = $${idx} RETURNING *`, params
  );
  eventBus.emit('product:updated', { shopId, productId });
  return result.rows[0];
}

async function deleteProduct(shopId, productId) {
  await getProduct(shopId, productId);
  await query('DELETE FROM products WHERE id = $1 AND shop_id = $2', [productId, shopId]);
  eventBus.emit('product:deleted', { shopId, productId });
  return { message: 'Produit supprimé' };
}

// ========== Product Images ==========

async function uploadProductImages(shopId, productId, files) {
  await getProduct(shopId, productId);
  const uploadDir = path.join(config.upload.dir, shopId, 'products');
  await fs.mkdir(uploadDir, { recursive: true });

  const images = [];
  for (const file of files) {
    const filename = `${uuidv4()}.jpg`;
    const thumbFilename = `${uuidv4()}_thumb.jpg`;
    const smallFilename = `${uuidv4()}_small.jpg`;

    // Resize to 3 sizes
    await sharp(file.path)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toFile(path.join(uploadDir, filename));

    await sharp(file.path)
      .resize(400, 400, { fit: 'cover' })
      .jpeg({ quality: 80 })
      .toFile(path.join(uploadDir, thumbFilename));

    await sharp(file.path)
      .resize(200, 200, { fit: 'cover' })
      .jpeg({ quality: 75 })
      .toFile(path.join(uploadDir, smallFilename));

    // Clean up temp file
    await fs.unlink(file.path).catch(() => {});

    const img = await query(
      `INSERT INTO product_images (product_id, url, thumbnail_url, small_url, alt_text, size_bytes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [productId, `/uploads/${shopId}/products/${filename}`,
       `/uploads/${shopId}/products/${thumbFilename}`,
       `/uploads/${shopId}/products/${smallFilename}`,
       file.originalname, file.size]
    );
    images.push(img.rows[0]);

    // Set first image as primary
    if (images.length === 1) {
      await query('UPDATE product_images SET is_primary = true WHERE id = $1', [img.rows[0].id]);
    }
  }

  eventBus.emit('product:image:added', { shopId, productId });
  return images;
}

async function deleteProductImage(shopId, productId, imageId) {
  const img = await query('SELECT * FROM product_images WHERE id = $1 AND product_id = $2', [imageId, productId]);
  if (img.rows.length === 0) throw new NotFoundError('Image introuvable');

  // Delete files from disk
  const uploadDir = path.join(config.upload.dir);
  for (const key of ['url', 'thumbnail_url', 'small_url']) {
    if (img.rows[0][key]) {
      await fs.unlink(path.join(uploadDir, '..', img.rows[0][key])).catch(() => {});
    }
  }

  await query('DELETE FROM product_images WHERE id = $1', [imageId]);

  // Promote next image as primary
  if (img.rows[0].is_primary) {
    await query(
      `UPDATE product_images SET is_primary = true
       WHERE id = (SELECT id FROM product_images WHERE product_id = $1 ORDER BY sort_order LIMIT 1)
       AND NOT EXISTS (SELECT 1 FROM product_images WHERE product_id = $1 AND is_primary = true)`,
      [productId]
    );
  }
  return { message: 'Image supprimée' };
}

async function setPrimaryImage(shopId, productId, imageId) {
  await query('UPDATE product_images SET is_primary = false WHERE product_id = $1', [productId]);
  await query('UPDATE product_images SET is_primary = true WHERE id = $1 AND product_id = $2', [imageId, productId]);
  return { message: 'Image principale définie' };
}

// ========== Variants ==========

async function createVariant(shopId, productId, data) {
  const result = await query(
    `INSERT INTO product_variants (product_id, type, name, price_adjustment_xof, stock_quantity, sku)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [productId, data.type, data.name, data.price_adjustment_xof || 0,
     data.stock_quantity || 0, data.sku || null]
  );
  if (!result.rows[0].length) {
    await query('UPDATE products SET has_variants = true WHERE id = $1', [productId]);
  }
  return result.rows[0];
}

async function updateVariant(shopId, productId, variantId, data) {
  const result = await query(
    `UPDATE product_variants SET type=$1, name=$2, price_adjustment_xof=$3, stock_quantity=$4, sku=$5, is_active=$6
     WHERE id=$7 AND product_id=$8 RETURNING *`,
    [data.type, data.name, data.price_adjustment_xof || 0,
     data.stock_quantity || 0, data.sku || null, data.is_active !== false ? true : false,
     variantId, productId]
  );
  if (result.rows.length === 0) throw new NotFoundError('Variante introuvable');
  return result.rows[0];
}

async function deleteVariant(shopId, productId, variantId) {
  await query('DELETE FROM product_variants WHERE id=$1 AND product_id=$2', [variantId, productId]);
  const remaining = await query('SELECT COUNT(*)::int AS c FROM product_variants WHERE product_id=$1', [productId]);
  if (remaining.rows[0].c === 0) {
    await query('UPDATE products SET has_variants = false WHERE id=$1', [productId]);
  }
  return { message: 'Variante supprimée' };
}

module.exports = {
  listProducts, getProduct, createProduct, updateProduct, deleteProduct,
  uploadProductImages, deleteProductImage, setPrimaryImage,
  createVariant, updateVariant, deleteVariant,
};