// Catégories par défaut créées pour chaque nouvelle boutique
// (mêmes valeurs que la migration 035 pour les boutiques existantes).
const DEFAULT_CATEGORIES = [
  { name: 'Alimentation', slug: 'food' },
  { name: 'Mode', slug: 'fashion' },
  { name: 'Électronique', slug: 'electronics' },
  { name: 'Santé', slug: 'health' },
  { name: 'Maison', slug: 'home' },
  { name: 'Beauté', slug: 'beauty' },
  { name: 'Services', slug: 'services' },
];

// queryFn : soit query (pool), soit (text, params) => client.query(...) dans une transaction
async function seedDefaultCategories(queryFn, shopId) {
  for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
    const c = DEFAULT_CATEGORIES[i];
    await queryFn(
      `INSERT INTO categories (shop_id, name, slug, sort_order)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (shop_id, slug) DO NOTHING`,
      [shopId, c.name, c.slug, i]
    );
  }
}

module.exports = { DEFAULT_CATEGORIES, seedDefaultCategories };
