-- 002: Create shops table
CREATE TABLE shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    subdomain VARCHAR(63) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    category VARCHAR(20) NOT NULL CHECK (category IN ('shop','restaurant','pharmacy','artisan','service','other')),
    description TEXT,
    whatsapp_number VARCHAR(20) NOT NULL,
    phone_number VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    neighborhood VARCHAR(100),
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    logo_url VARCHAR(500),
    banner_url VARCHAR(500),
    primary_color VARCHAR(7) DEFAULT '#2D6A4F',
    secondary_color VARCHAR(7) DEFAULT '#52B788',
    opening_hours JSONB DEFAULT '{}',
    social_links JSONB DEFAULT '{}',
    is_published BOOLEAN DEFAULT false,
    custom_domain VARCHAR(255),
    custom_domain_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shops_user_id ON shops(user_id);
CREATE INDEX idx_shops_category ON shops(category);
CREATE INDEX idx_shops_is_published ON shops(is_published);
CREATE INDEX idx_shops_city ON shops(city);

CREATE TRIGGER update_shops_updated_at
    BEFORE UPDATE ON shops
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();