-- 012: Create media table
CREATE TABLE media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size_bytes INTEGER NOT NULL,
    path VARCHAR(500) NOT NULL,
    thumbnail_path VARCHAR(500),
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('shop_logo','shop_banner','product_image','category_image')),
    entity_id UUID,
    width INTEGER,
    height INTEGER,
    hash VARCHAR(64),
    is_used BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_media_shop_id ON media(shop_id);
CREATE INDEX idx_media_entity_type_entity_id ON media(entity_type, entity_id);