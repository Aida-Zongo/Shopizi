-- ============================================
-- Migration: 020_create_delivery_drivers.sql
-- Description: Table des livreurs
-- ============================================

CREATE TABLE IF NOT EXISTS delivery_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Lien vers le compte user (optionnel, peut être un simple enregistrement)
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  -- Informations personnelles
  full_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(255) UNIQUE DEFAULT NULL,
  -- Ville de résidence/préférence
  city_id UUID REFERENCES cities(id) ON DELETE SET NULL,
  city_name VARCHAR(100) NOT NULL,
  -- Localisation GPS actuelle (pour tracking)
  current_latitude DECIMAL(10, 8) DEFAULT NULL,
  current_longitude DECIMAL(11, 8) DEFAULT NULL,
  location_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  -- Véhicule / Moyen de livraison
  vehicle_type VARCHAR(50) DEFAULT 'moto' CHECK (vehicle_type IN ('moto', 'tricycle', 'voiture', 'camionette', 'bicycle', 'a_pied')),
  vehicle_plate VARCHAR(20) DEFAULT NULL,
  -- Statut du livreur
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',     -- En attente de validation admin
    'approved',    -- Approuvé, peut recevoir des courses
    'busy',        -- En cours de livraison
    'offline',     -- Hors ligne
    'suspended',   -- Suspendu par admin
    'rejected'     -- Rejeté
  )),
  -- Paiement / Commission
  balance_xof INTEGER NOT NULL DEFAULT 0,
  commission_rate INTEGER NOT NULL DEFAULT 95, -- % que le livreur garde (défaut 95%, dev prend 5%)
  payment_method VARCHAR(50) DEFAULT 'orange_money',
  payment_phone VARCHAR(20) DEFAULT NULL,
  -- Notation du livreur
  avg_rating DECIMAL(2,1) DEFAULT 5.0,
  total_reviews INTEGER NOT NULL DEFAULT 0,
  total_deliveries INTEGER NOT NULL DEFAULT 0,
  -- Statistiques
  total_earnings_xof INTEGER NOT NULL DEFAULT 0,
  -- Dates
  approved_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_drivers_city ON delivery_drivers(city_id);
CREATE INDEX idx_drivers_status ON delivery_drivers(status);
CREATE INDEX idx_drivers_user ON delivery_drivers(user_id);

-- Vue: livreurs disponibles (approved + pas busy + pas offline)
CREATE OR REPLACE VIEW available_drivers AS
SELECT
  d.*,
  c.name AS city_name_display,
  c.latitude AS city_lat,
  c.longitude AS city_lng
FROM delivery_drivers d
LEFT JOIN cities c ON c.id = d.city_id
WHERE d.status = 'approved'
  AND (d.current_latitude IS NOT NULL OR d.city_id IS NOT NULL);
