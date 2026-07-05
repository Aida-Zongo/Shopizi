-- 034: Link reviews to the order they were left for (verified purchase)
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_shop_order_unique
  ON reviews(shop_id, order_id) WHERE order_id IS NOT NULL;
