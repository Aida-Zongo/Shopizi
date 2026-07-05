-- ============================================
-- Migration: 023_update_shops_add_city.sql
-- Description: Ajouter ville et coordonnées GPS aux boutiques
-- ============================================

-- Ajouter ville au shop
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES cities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS city_name VARCHAR(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS address TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS allows_delivery BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_fee_xof INTEGER DEFAULT NULL; -- Si le commerçant fixe un tarif

-- Index pour recherches géographiques
CREATE INDEX IF NOT EXISTS idx_shops_city ON shops(city_id);
CREATE INDEX IF NOT EXISTS idx_shops_location ON shops(latitude, longitude);
