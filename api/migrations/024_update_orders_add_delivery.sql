-- ============================================
-- Migration: 024_update_orders_add_delivery.sql
-- Description: Ajouter options livraison aux commandes
-- ============================================

-- Ajouter colonnes de livraison à orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_option VARCHAR(30) DEFAULT 'pickup' CHECK (delivery_option IN ('pickup', 'delivery', 'third_party')),
  ADD COLUMN IF NOT EXISTS delivery_address TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS delivery_city_id UUID REFERENCES cities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivery_fee_xof INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS client_latitude DECIMAL(10, 8) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS client_longitude DECIMAL(11, 8) DEFAULT NULL;

-- Référence à la livraison
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_id UUID REFERENCES deliveries(id) ON DELETE SET NULL;

CREATE INDEX idx_orders_delivery ON orders(delivery_id);
CREATE INDEX idx_orders_delivery_city ON orders(delivery_city_id);

-- Mettre à jour les commandes existantes
UPDATE orders SET delivery_option = 'pickup' WHERE delivery_option IS NULL;
