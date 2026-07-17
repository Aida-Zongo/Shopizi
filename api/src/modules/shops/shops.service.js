const { query } = require('../../db/pool');
const { slugify, isValidSubdomain } = require('../../utils/slug');
const eventBus = require('../../events');
const { ConflictError, NotFoundError, BadRequestError } = require('../../utils/errors');
const { cacheDel } = require('../../services/redis.service');
const { seedDefaultCategories } = require('../categories/default-categories');

async function createShop(userId, data) {
  const existing = await query('SELECT id FROM shops WHERE user_id = $1', [userId]);
  if (existing.rows.length > 0) throw new ConflictError('Vous avez déjà une boutique');

  if (!isValidSubdomain(data.subdomain)) throw new BadRequestError('Sous-domaine invalide');

  const subExists = await query('SELECT id FROM shops WHERE subdomain = $1', [data.subdomain]);
  if (subExists.rows.length > 0) throw new ConflictError('Ce sous-domaine est déjà utilisé');

  const slug = slugify(data.name);
  const result = await query(
    `INSERT INTO shops (user_id, subdomain, name, slug, category, description, whatsapp_number, phone_number, email, address, city, neighborhood, opening_hours)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [userId, data.subdomain, data.name, slug, data.category, data.description || null,
     data.whatsapp_number, data.phone_number || null, data.email || null,
     data.address || null, data.city || null, data.neighborhood || null,
     JSON.stringify(data.opening_hours || {})]
  );
  await seedDefaultCategories(query, result.rows[0].id);
  eventBus.emit('shop:created', { shopId: result.rows[0].id, userId, subdomain: data.subdomain });
  return result.rows[0];
}

async function getMyShop(userId) {
  const result = await query('SELECT * FROM shops WHERE user_id = $1', [userId]);
  if (result.rows.length === 0) throw new NotFoundError('Boutique introuvable');
  return result.rows[0];
}

async function updateShop(userId, data, isPartial = false) {
  const shop = await getMyShop(userId);

  // If name changed, update slug
  if (data.name && data.name !== shop.name) {
    data.slug = slugify(data.name);
  }

  // Ville choisie dans la liste : synchronise city_id, city_name et le
  // champ legacy city (utilisés pour le ciblage géographique des livreurs)
  if (data.city_id !== undefined) {
    if (data.city_id) {
      const r = await query('SELECT id, name FROM cities WHERE id = $1', [data.city_id]);
      if (r.rows.length === 0) throw new BadRequestError('Ville invalide');
      data.city_name = r.rows[0].name;
      data.city = r.rows[0].name;
    } else {
      data.city_name = null;
    }
  }

  const updates = [];
  const params = [];
  let idx = 1;
  const allowedFields = ['name','slug','category','description','whatsapp_number','phone_number',
    'email','address','city','city_id','city_name','neighborhood','primary_color','secondary_color',
    'opening_hours','social_links','latitude','longitude'];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = $${idx++}`);
      const value = data[field];
      params.push(value !== null && typeof value === 'object' ? JSON.stringify(value) : value);
    }
  }
  if (updates.length === 0) return shop;

  params.push(shop.id);
  const result = await query(
    `UPDATE shops SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`, params
  );

  const changedFields = allowedFields.filter(f => data[f] !== undefined);
  eventBus.emit('shop:updated', { shopId: shop.id, userId, changedFields });

  // Invalidate product cache since shop info may have changed
  await cacheDel('featured_products');

  if (shop.is_published && changedFields.some(f => ['name','description','logo_url','banner_url','primary_color','secondary_color','opening_hours'].includes(f))) {
    eventBus.emit('site:generate', { shopId: shop.id, trigger: 'shop_update' });
  }

  return result.rows[0];
}

async function publishShop(userId, isPublished) {
  const shop = await getMyShop(userId);
  const result = await query(
    'UPDATE shops SET is_published = $1 WHERE id = $2 RETURNING *', [isPublished, shop.id]
  );
  if (isPublished) {
    eventBus.emit('shop:published', { shopId: shop.id });
    eventBus.emit('site:generate', { shopId: shop.id, trigger: 'shop_update' });
  }
  return result.rows[0];
}

async function getShopBySubdomain(subdomain) {
  const result = await query(
    `SELECT id, subdomain, name, slug, category, description, whatsapp_number, phone_number,
            email, address, city, COALESCE(city_name, city) AS city_name, neighborhood, latitude, longitude,
            logo_url, banner_url, primary_color, secondary_color,
            opening_hours, social_links, is_published, custom_domain
     FROM shops WHERE subdomain = $1 AND is_published = true`,
    [subdomain]
  );
  if (result.rows.length === 0) throw new NotFoundError('Boutique introuvable');
  return result.rows[0];
}

async function getShopStats(userId) {
  const shop = await getMyShop(userId);
  const [products, orders, categories] = await Promise.all([
    query('SELECT COUNT(*)::int AS count FROM products WHERE shop_id = $1', [shop.id]),
    query('SELECT COUNT(*)::int AS count FROM orders WHERE shop_id = $1', [shop.id]),
    query('SELECT COUNT(*)::int AS count FROM categories WHERE shop_id = $1', [shop.id]),
  ]);
  return {
    productCount: products.rows[0].count,
    orderCount: orders.rows[0].count,
    categoryCount: categories.rows[0].count,
    isPublished: shop.is_published,
  };
}

async function verifyCustomDomain(userId, customDomain) {
  const shop = await getMyShop(userId);
  // In production, verify DNS CNAME record pointing to shopizi.bf
  await query('UPDATE shops SET custom_domain = $1, custom_domain_verified = false WHERE id = $2',
    [customDomain, shop.id]);
  return { custom_domain: customDomain, verified: false, message: 'Domaine enregistré. Vérification DNS en attente.' };
}

module.exports = { createShop, getMyShop, updateShop, publishShop, getShopBySubdomain, getShopStats, verifyCustomDomain };