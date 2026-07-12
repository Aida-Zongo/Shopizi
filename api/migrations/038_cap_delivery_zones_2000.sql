-- ============================================
-- Migration: 038_cap_delivery_zones_2000.sql
-- Description: Livraison intra-ville uniquement, bareme plafonne a 2000 FCFA
-- ============================================

UPDATE delivery_zones SET price_fcfa =
  CASE
    WHEN max_km <= 5  THEN 500
    WHEN max_km <= 10 THEN 1000
    WHEN max_km <= 15 THEN 1500
    ELSE 2000
  END;
