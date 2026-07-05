-- 026: Seed default plans
INSERT INTO plans (name, slug, description, price_monthly_xof, price_yearly_xof, max_products, max_images_per_product, max_variants_per_product, max_categories, storage_mb, custom_domain, analytics, custom_colors, remove_branding, priority_support, trial_days, sort_order) VALUES
('Gratuit', 'free', 'Plan gratuit avec les fonctionnalités essentielles pour démarrer.', 0, 0, 10, 3, 0, 3, 100, false, false, false, false, false, 0, 1),
 ('Pro', 'pro', 'Plan professionnel pour les commerçants actifs.', 7500, 75000, 100, 5, 3, 10, 500, false, true, false, false, true, 7, 2),
 ('Business', 'business', 'Plan business illimit pour les professionnels et grandes boutiques.', 20000, 200000, 1000, 10, 5, 20, 2000, true, true, true, true, true, 14, 3);
