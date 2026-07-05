-- ============================================
-- Migration: 017_create_reviews.sql
-- Description: Avis et notations des clients sur les produits et marchands
-- ============================================

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Référence
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  -- Auteur (si auth)
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  -- Si review anonyme (commande sans compte)
  anonymous_name VARCHAR(100) DEFAULT NULL,
  -- Note 1-5 étoiles
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  -- Commentaire optionnel
  comment TEXT DEFAULT NULL,
  -- Statut de modération
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  -- Métriques utiles
  helpful_count INTEGER NOT NULL DEFAULT 0,
  -- Dates
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index rapides
CREATE INDEX idx_reviews_product ON reviews(product_id);
CREATE INDEX idx_reviews_shop ON reviews(shop_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_reviews_status ON reviews(status);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_created ON reviews(created_at DESC);

-- Vue pour calculer la note moyenne d'un produit
CREATE OR REPLACE VIEW product_avg_rating AS
SELECT
  product_id,
  ROUND(AVG(rating)::numeric, 2) AS avg_rating,
  COUNT(*) AS total_reviews
FROM reviews
WHERE status = 'approved'
GROUP BY product_id;

-- Vue pour calculer la note moyenne d'un marchand (tous ses produits)
CREATE OR REPLACE VIEW shop_avg_rating AS
SELECT
  shop_id,
  ROUND(AVG(rating)::numeric, 2) AS avg_rating,
  COUNT(DISTINCT product_id) AS reviewed_products_count,
  COUNT(*) AS total_reviews
FROM reviews
WHERE status = 'approved'
GROUP BY shop_id;
