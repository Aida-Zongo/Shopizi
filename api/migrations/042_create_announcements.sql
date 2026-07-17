-- ============================================
-- Migration: 042_create_announcements.sql
-- Description: Annonces des marchands vers leurs clients (promo, prix, arrivage).
--              Reservee au plan Business. Affichee en bandeau sur la boutique.
-- ============================================

CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  -- Type d'annonce
  type VARCHAR(20) NOT NULL DEFAULT 'promo' CHECK (type IN ('promo', 'price', 'arrival')),
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_announcements_shop_active ON announcements(shop_id, is_active, created_at DESC);
