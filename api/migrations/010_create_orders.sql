-- 010: Create orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    order_number VARCHAR(20) NOT NULL UNIQUE,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    customer_message TEXT,
    source VARCHAR(20) NOT NULL DEFAULT 'whatsapp' CHECK (source IN ('whatsapp','website_form','manual')),
    status VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new','confirmed','processing','ready','delivered','completed','cancelled')),
    total_amount_xof INTEGER,
    currency VARCHAR(3) DEFAULT 'XOF',
    delivery_address TEXT,
    delivery_method VARCHAR(20) DEFAULT 'pickup' CHECK (delivery_method IN ('pickup','delivery')),
    merchant_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_shop_id ON orders(shop_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_created_at ON orders(created_at);

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();