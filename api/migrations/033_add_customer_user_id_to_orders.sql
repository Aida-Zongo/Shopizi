-- 033: Link orders to the authenticated customer who placed them (nullable, guest orders keep NULL)
ALTER TABLE orders ADD COLUMN customer_user_id UUID REFERENCES users(id);

CREATE INDEX idx_orders_customer_user_id ON orders(customer_user_id);
