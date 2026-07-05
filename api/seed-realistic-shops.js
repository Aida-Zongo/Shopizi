/**
 * Seed script — nettoie les boutiques "test" et insère 3 boutiques réalistes.
 *
 * À exécuter depuis le dossier api/ de ton projet (là où se trouve node_modules) :
 *   node seed-realistic-shops.js
 *
 * Le script suppose que .env contient DATABASE_URL et que les migrations
 * sont déjà appliquées (npm run migrate).
 */
require('dotenv').config();
const { query, getClient } = require('./src/db/pool');
const { hash } = require('./src/utils/password');
const { slugify } = require('./src/utils/slug');

async function cleanTestShops() {
  const delProducts = await query(`
    DELETE FROM products WHERE shop_id IN (
      SELECT id FROM shops
      WHERE name ILIKE '%test%'
         OR description IS NULL
         OR description = 'null'
         OR description = 'undefined'
    )
  `);
  console.log(`✅ Produits test supprimés (${delProducts.rowCount})`);

  const delShops = await query(`
    DELETE FROM shops
    WHERE name ILIKE '%test%'
       OR description IS NULL
       OR description = 'null'
       OR description = 'undefined'
  `);
  console.log(`✅ Boutiques test supprimées (${delShops.rowCount})`);
}

async function getCityId(nameLike) {
  const res = await query(`SELECT id, name FROM cities WHERE name ILIKE $1 LIMIT 1`, [`%${nameLike}%`]);
  return res.rows[0] || null;
}

// NOTE: le schéma actuel impose UNE boutique par compte marchand
// (contrainte UNIQUE sur shops.user_id). On crée donc un compte
// marchand dédié pour chacune des 3 boutiques de démonstration.
// Mot de passe par défaut (à changer) : Shopizi2026!
const DEMO_PASSWORD = 'Shopizi2026!';

async function createMerchant(client, { full_name, email, phone_number }) {
  const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows[0]) return existing.rows[0].id;

  const password_hash = await hash(DEMO_PASSWORD);
  const res = await client.query(
    `INSERT INTO users (email, password_hash, full_name, phone_number, role, email_verified, is_active)
     VALUES ($1, $2, $3, $4, 'merchant', true, true)
     RETURNING id`,
    [email, password_hash, full_name, phone_number]
  );
  return res.rows[0].id;
}

async function getFreePlanId(client) {
  const res = await client.query(`SELECT id FROM plans WHERE slug = 'free'`);
  return res.rows[0]?.id || null;
}

async function createSubscription(client, userId, planId) {
  if (!planId) return;
  const now = new Date();
  const endsAt = new Date(now.getFullYear() + 100, 0, 1);
  await client.query(
    `INSERT INTO subscriptions (user_id, plan_id, status, starts_at, ends_at)
     VALUES ($1, $2, 'active', $3, $4)`,
    [userId, planId, now, endsAt]
  );
}

async function seedShops() {
  const client = await getClient();
  try {
    const ouaga = await getCityId('Ouaga');
    const bobo = await getCityId('Bobo');
    const freePlanId = await getFreePlanId(client);

    // category doit respecter la contrainte CHECK de la table shops :
    // ('shop','restaurant','pharmacy','artisan','service','other')
    const shops = [
      {
        merchant: {
          full_name: 'Aïcha Wend-Panga',
          email: 'contact@pharmacie-wend-panga.bf',
          phone_number: '+22670000001',
        },
        name: 'Pharmacie Wend-Panga',
        subdomain: 'pharmacie-wend-panga',
        category: 'pharmacy',
        description: 'Médicaments, produits de santé et parapharmacie disponibles à Ouagadougou.',
        city: ouaga,
        delivery_fee_xof: 500,
        whatsapp_number: '+22670000001',
        lat: 12.3714,
        lng: -1.5197,
        products: [
          { name: 'Paracétamol 500mg', price: 800 },
          { name: 'Savon antiseptique Dettol', price: 1500 },
        ],
      },
      {
        merchant: {
          full_name: 'Issa Ouédraogo',
          email: 'contact@electronique-burkina.bf',
          phone_number: '+22670000002',
        },
        name: 'Électronique Burkina',
        subdomain: 'electronique-burkina',
        category: 'shop',
        description: 'Téléphones, accessoires informatiques et réparations électroniques rapides.',
        city: ouaga,
        delivery_fee_xof: 1000,
        whatsapp_number: '+22670000002',
        lat: 12.3650,
        lng: -1.5330,
        products: [
          { name: 'Chargeur universel USB-C', price: 3500 },
          { name: 'Écouteurs Bluetooth sans fil', price: 8000 },
        ],
      },
      {
        merchant: {
          full_name: 'Kadi Sawadogo',
          email: 'contact@maison-deco-faso.bf',
          phone_number: '+22670000003',
        },
        name: 'Maison & Déco Faso',
        subdomain: 'maison-deco-faso',
        category: 'artisan',
        description: 'Articles de maison, décoration et ustensiles de cuisine traditionnels.',
        city: bobo || ouaga,
        delivery_fee_xof: 1500,
        whatsapp_number: '+22670000003',
        lat: 11.1771,
        lng: -4.2979,
        products: [
          { name: 'Natte tressée locale', price: 5000 },
          { name: 'Canari traditionnel en terre cuite', price: 3000 },
        ],
      },
    ];

    for (const shop of shops) {
      await client.query('BEGIN');
      try {
        const existingShop = await client.query('SELECT id FROM shops WHERE subdomain = $1', [shop.subdomain]);
        if (existingShop.rows[0]) {
          console.log('⚠️ Boutique déjà existante:', shop.name);
          await client.query('ROLLBACK');
          continue;
        }

        const userId = await createMerchant(client, shop.merchant);
        await createSubscription(client, userId, freePlanId);

        const shopSlug = slugify(shop.name);
        const shopResult = await client.query(
          `INSERT INTO shops (
            user_id, name, subdomain, slug, category, description,
            city_id, city_name, delivery_fee_xof, whatsapp_number,
            latitude, longitude, allows_delivery, is_published,
            created_at, updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true,true,NOW(),NOW())
          RETURNING id, name`,
          [
            userId, shop.name, shop.subdomain, shopSlug, shop.category, shop.description,
            shop.city?.id || null, shop.city?.name || null, shop.delivery_fee_xof,
            shop.whatsapp_number, shop.lat, shop.lng,
          ]
        );
        const shopId = shopResult.rows[0].id;
        console.log('✅ Boutique créée:', shop.name);

        for (const product of shop.products) {
          const productSlug = slugify(product.name);
          await client.query(
            `INSERT INTO products (shop_id, name, slug, price_xof, is_published, stock_quantity, created_at, updated_at)
             VALUES ($1, $2, $3, $4, true, 20, NOW(), NOW())`,
            [shopId, product.name, productSlug, product.price]
          );
          console.log('  ✅ Produit ajouté:', product.name);
        }

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ Échec pour ${shop.name}:`, err.message);
      }
    }
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await cleanTestShops();
    await seedShops();
    console.log('\n🎉 Seed terminé avec succès !');
  } catch (e) {
    console.error('❌ Erreur:', e.message);
  } finally {
    process.exit(0);
  }
}

main();