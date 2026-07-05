-- ============================================
-- Migration: 029_add_customer_role.sql
-- Description: Ajouter le rôle 'customer' à la table users
-- ============================================

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('merchant', 'admin', 'driver', 'customer'));
