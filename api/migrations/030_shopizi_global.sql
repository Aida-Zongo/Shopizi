-- 030: Shopizi Global - Delivery, Payments, Ads, Financials

-- Part 3: Delivery Zones
CREATE TABLE delivery_zones (
    id SERIAL PRIMARY KEY,
    min_km NUMERIC NOT NULL,
    max_km NUMERIC NOT NULL,
    price_fcfa INTEGER NOT NULL
);

INSERT INTO delivery_zones (min_km, max_km, price_fcfa) VALUES 
(0, 5, 500),
(5, 10, 1000),
(10, 15, 1500),
(15, 20, 2000),
(20, 25, 2500),
(25, 30, 3000);

-- Part 3: Geolocation for shops
ALTER TABLE shops
ADD COLUMN IF NOT EXISTS latitude NUMERIC,
ADD COLUMN IF NOT EXISTS longitude NUMERIC;

-- Part 2: Merchant Payments for subscriptions via CinetPay
CREATE TABLE merchant_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    plan_slug VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    cinetpay_ref VARCHAR(255) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Part 4: Financial flows breakdown
CREATE TABLE IF NOT EXISTS order_financials (
    order_id UUID PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES shops(id),
    platform_fee_xof INTEGER NOT NULL DEFAULT 0,
    merchant_earnings_xof INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending_payout' CHECK (status IN ('pending_payout', 'paid_out'))
);

-- Part 5: Ads system (simplified)
CREATE TABLE IF NOT EXISTS ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    budget_xof INTEGER NOT NULL DEFAULT 5000,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Delivery columns for orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_fee_xof INTEGER,
  ADD COLUMN IF NOT EXISTS client_latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS client_longitude NUMERIC;

-- Part 7: Scalability Indexes
CREATE INDEX IF NOT EXISTS idx_products_shop_id ON products(shop_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
-- idx_orders_status already exists in 010
CREATE INDEX IF NOT EXISTS idx_ads_status ON ads(status);
CREATE INDEX IF NOT EXISTS idx_shops_lat_lng ON shops(latitude, longitude);
