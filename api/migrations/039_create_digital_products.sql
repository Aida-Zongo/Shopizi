-- ============================================
-- Migration: 039_create_digital_products.sql
-- Description: Produits digitaux (fichiers hebergés sur Cloudinary) et
--              achats avec lien de telechargement signe a duree limitee.
-- ============================================

CREATE TABLE IF NOT EXISTS digital_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price_xof INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  file_public_id TEXT NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  cover_image_url TEXT,
  category VARCHAR(100),
  is_published BOOLEAN DEFAULT false,
  total_sales INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS digital_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  digital_product_id UUID REFERENCES digital_products(id),
  customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_email VARCHAR(255) NOT NULL,
  amount_paid INTEGER NOT NULL,
  shopizi_commission INTEGER NOT NULL,
  merchant_amount INTEGER NOT NULL,
  download_token VARCHAR(128) UNIQUE NOT NULL,
  download_expires_at TIMESTAMP NOT NULL,
  download_count INTEGER DEFAULT 0,
  payment_status VARCHAR(50) DEFAULT 'pending',
  transaction_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_digital_products_shop
  ON digital_products(shop_id);
CREATE INDEX IF NOT EXISTS idx_digital_purchases_token
  ON digital_purchases(download_token);
CREATE INDEX IF NOT EXISTS idx_digital_purchases_customer
  ON digital_purchases(customer_id);
