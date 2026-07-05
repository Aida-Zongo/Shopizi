-- ============================================
-- Migration: 022_create_driver_payments.sql
-- Description: Paiements et transactions des livreurs
-- ============================================

CREATE TABLE IF NOT EXISTS driver_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES delivery_drivers(id) ON DELETE CASCADE,
  amount_xof INTEGER NOT NULL DEFAULT 0,
  type VARCHAR(30) NOT NULL DEFAULT 'earning' CHECK (type IN (
    'earning',
    'withdrawal',
    'bonus',
    'penalty',
    'adjustment'
  )),
  delivery_id UUID REFERENCES deliveries(id) ON DELETE SET NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'completed' CHECK (status IN (
    'pending',
    'processing',
    'completed',
    'failed'
  )),
  transaction_reference VARCHAR(100) DEFAULT NULL,
  payment_method VARCHAR(50) DEFAULT NULL,
  payment_phone VARCHAR(20) DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_driver_payments_driver ON driver_payments(driver_id);
CREATE INDEX idx_driver_payments_type ON driver_payments(type);
CREATE INDEX idx_driver_payments_status ON driver_payments(status);
