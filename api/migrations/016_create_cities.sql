-- ============================================
-- Migration: 016_create_cities.sql
-- Description: Table des villes pour localisation
-- ============================================

CREATE TABLE IF NOT EXISTS cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(120) NOT NULL UNIQUE,
  region VARCHAR(100) NOT NULL,
  country VARCHAR(100) NOT NULL DEFAULT 'Burkina Faso',
  latitude DECIMAL(10, 8) DEFAULT NULL,
  longitude DECIMAL(11, 8) DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index sur le nom et le slug pour recherche rapide
CREATE UNIQUE INDEX idx_cities_slug ON cities(slug);
CREATE INDEX idx_cities_name ON cities(name);

-- Insertion des principales villes du Burkina Faso
-- Régions mises à jour selon la réforme administrative du 2 juillet 2025
INSERT INTO cities (name, slug, region) VALUES
  ('Ouagadougou',  'ouagadougou',   'Kadiogo'),
  ('Bobo-Dioulasso','bobo-dioulasso','Guiriko'),
  ('Koudougou',    'koudougou',     'Nando'),
  ('Banfora',      'banfora',       'Tannounyan'),
  ('Ouahigouya',   'ouahigouya',    'Yaadga'),
  ('Pouytenga',    'pouytenga',     'Nakambé'),
  ('Manga',        'manga',         'Nazinon'),
  ('Kaya',         'kaya',          'Kuilsé'),
  ('Fada N''Gourma','fada-ngourma', 'Goulmou'),
  ('Tenkodogo',    'tenkodogo',     'Nakambé'),
  ('Dédougou',     'dedougou',      'Bankui'),
  ('Houndé',       'hounde',        'Guiriko'),
  ('Zorgo',        'zorgo',         'Oubri'),
  ('Koupéla',      'koupela',       'Nakambé'),
  ('Gorom-Gorom',  'gorom-gorom',   'Liptako')
  ON CONFLICT DO NOTHING;
