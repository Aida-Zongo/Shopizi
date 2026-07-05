-- ============================================
-- Migration: 031_order_flow_v2.sql
-- Description: Flux de commande temps réel (Socket.io) avec statuts
--              séquentiels livreur portés directement par orders,
--              en parallèle du système deliveries existant.
-- ============================================

-- Livreur en ligne / hors ligne (bascule rapide depuis le dashboard livreur)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;

-- Livreur assigné directement sur la commande (flux simplifié)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES delivery_drivers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON orders(driver_id);

-- Nouveaux statuts de progression livreur : pickup, picked_up
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('new','confirmed','processing','ready','pickup','picked_up','delivered','completed','cancelled'));

-- Part du livreur sur les frais de livraison (calculée à la création de commande)
ALTER TABLE order_financials ADD COLUMN IF NOT EXISTS driver_amount_xof INTEGER NOT NULL DEFAULT 0;
