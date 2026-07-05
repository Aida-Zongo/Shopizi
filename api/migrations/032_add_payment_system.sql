-- ============================================
-- Migration: 032_add_payment_system.sql
-- Description: Système de paiement unifié (sandbox + CinetPay) pour
--              commandes clients, abonnements marchands et publicités.
-- ============================================

CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id VARCHAR(100) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL, -- order | subscription | ads
  amount INTEGER NOT NULL,
  customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending | completed | failed
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);

-- Solde marchand crédité automatiquement à la confirmation d'une commande payée
ALTER TABLE shops ADD COLUMN IF NOT EXISTS pending_balance INTEGER NOT NULL DEFAULT 0;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS total_earned INTEGER NOT NULL DEFAULT 0;

-- Statut de paiement de la commande (distinct du statut de traitement)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) NOT NULL DEFAULT 'pending';
