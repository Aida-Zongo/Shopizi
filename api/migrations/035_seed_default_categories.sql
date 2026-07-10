-- Seed default categories for shops that have none yet.
-- New shops get the same defaults at creation time (see modules/categories/default-categories.js).
INSERT INTO categories (shop_id, name, slug, sort_order)
SELECT s.id, c.name, c.slug, c.sort_order
FROM shops s
CROSS JOIN (VALUES
  ('Alimentation', 'food', 0),
  ('Mode', 'fashion', 1),
  ('Électronique', 'electronics', 2),
  ('Santé', 'health', 3),
  ('Maison', 'home', 4),
  ('Beauté', 'beauty', 5),
  ('Services', 'services', 6)
) AS c(name, slug, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM categories cat WHERE cat.shop_id = s.id)
ON CONFLICT (shop_id, slug) DO NOTHING;
