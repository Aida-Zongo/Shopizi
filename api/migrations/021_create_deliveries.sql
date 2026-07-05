-- ============================================
-- Migration: 021_create_deliveries.sql
-- Description: Table des livraisons de commandes
-- ============================================

CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Liens
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES delivery_drivers(id) ON DELETE SET NULL,
  city_id UUID REFERENCES cities(id) ON DELETE SET NULL,
  -- Adresses
  pickup_address TEXT NOT NULL,
  pickup_latitude DECIMAL(10, 8) DEFAULT NULL,
  pickup_longitude DECIMAL(11, 8) DEFAULT NULL,
  delivery_address TEXT NOT NULL,
  delivery_latitude DECIMAL(10, 8) DEFAULT NULL,
  delivery_longitude DECIMAL(11, 8) DEFAULT NULL,
  -- Coûts
  delivery_fee_xof INTEGER NOT NULL DEFAULT 0,
  distance_km DECIMAL(6,2) DEFAULT NULL,
  -- Commission
  platform_commission_xof INTEGER NOT NULL DEFAULT 0, -- 5% du fee
  driver_earnings_xof INTEGER NOT NULL DEFAULT 0,   -- 95% du fee
  -- Statut de la livraison
  status VARCHAR(30) NOT NULL DEFAULT 'pending_driver' CHECK (status IN (
    'pending_driver',     -- En attente d'un livreplicant disponible
    'driver_assigned',    -- Livreur assigné
    'driver_heading_pickup', -- En route vers le commerçant
    'at_pickup',          -- Arrivé chez le commerçant
    'in_transit',         -- En cours de livraison
    'at_destination',     -- Arrivé à destination
    'delivered',          -- Livré au client
    'cancelled_by_client',-- Annulé par le client
    'cancelled_by_driver',-- Annulé par le livreur
    'cancelled_by_system' -- Annulé par le système
  )),
  -- Outils de suivi
  otp_code VARCHAR(10) DEFAULT NULL, -- Code OTP pour confirmation livraison
  otp_verified_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  tracking_code VARCHAR(20) DEFAULT NULL UNIQUE, -- Code de suivi public
  estimated_delivery_time TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  actual_delivery_time TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  -- Notifications
  driver_notified_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  client_notified_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  -- Notes
  client_notes TEXT DEFAULT NULL,
  driver_notes TEXT DEFAULT NULL,
  -- Dates clés
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  picked_up_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  delivered_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_deliveries_order ON deliveries(order_id);
CREATE INDEX idx_deliveries_driver ON deliveries(driver_id);
CREATE INDEX idx_deliveries_status ON deliveries(status);
CREATE INDEX idx_deliveries_city ON deliveries(city_id);
CREATE INDEX idx_deliveries_tracking ON deliveries(tracking_code);
