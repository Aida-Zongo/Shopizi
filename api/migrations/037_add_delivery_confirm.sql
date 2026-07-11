-- QR code delivery confirmation: one-time token scanned by the customer,
-- plus the delivery timestamp.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_confirm_token VARCHAR(64);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;
