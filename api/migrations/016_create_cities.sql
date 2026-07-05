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
INSERT INTO cities (name, slug, region) VALUES
  ('Ouagadougou', 'ouagadougou', 'Centre'),
  ('Bobo-Dioulasso', 'bobo-dioulasso', 'Hauts-Bassins'),
  ('Koudougou', 'koudougou', 'Centre-Ouest'),
  ('Banfora', 'banfora', 'Cascades'),
  ('Ouahigouya', 'ouahigouya', 'Nord'),
  ('Pouytenga', 'pouytenga', 'Centre-Est'),
  ('Manga', 'manga', 'Centre-Sud'),
  ('Kaya', 'kaya', 'Centre-Nord'),
  ('Fada N''Gourma', 'fada-ngourma', 'Est'),
  ('Tenkodogo', 'tenkodogo', 'Centre-Est'),
  ('Dédougou', 'dedougou', 'Boucle du Mouhoun'),
  ('Houndé', 'hounde', 'Tuy'),
  ('Zorgo', 'zorgo', 'Ganzourgou'),
  ('Koupéla', 'koupela', 'Centre-Est'),
  ('Gorom-Gorom', 'gorom-gorom', 'Sahel')
  ON CONFLICT DO NOTHING;
