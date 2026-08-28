-- ============================================
-- Migration: 044_update_city_regions_2025_reform.sql
-- Description: Mise à jour des noms de régions suite à la réforme
--              administrative du 2 juillet 2025 (Burkina Faso) :
--              passage de 13 à 17 régions avec nouveaux noms en langues nationales.
-- ============================================

UPDATE cities SET region = 'Tannounyan' WHERE slug = 'banfora';
UPDATE cities SET region = 'Guiriko'    WHERE slug = 'bobo-dioulasso';
UPDATE cities SET region = 'Bankui'     WHERE slug = 'dedougou';
UPDATE cities SET region = 'Goulmou'    WHERE slug = 'fada-ngourma';
UPDATE cities SET region = 'Liptako'    WHERE slug = 'gorom-gorom';
UPDATE cities SET region = 'Guiriko'    WHERE slug = 'hounde';
UPDATE cities SET region = 'Kuilsé'     WHERE slug = 'kaya';
UPDATE cities SET region = 'Nando'      WHERE slug = 'koudougou';
UPDATE cities SET region = 'Nakambé'    WHERE slug = 'koupela';
UPDATE cities SET region = 'Nazinon'    WHERE slug = 'manga';
UPDATE cities SET region = 'Kadiogo'    WHERE slug = 'ouagadougou';
UPDATE cities SET region = 'Yaadga'     WHERE slug = 'ouahigouya';
UPDATE cities SET region = 'Nakambé'    WHERE slug = 'pouytenga';
UPDATE cities SET region = 'Nakambé'    WHERE slug = 'tenkodogo';
UPDATE cities SET region = 'Oubri'      WHERE slug = 'zorgo';
