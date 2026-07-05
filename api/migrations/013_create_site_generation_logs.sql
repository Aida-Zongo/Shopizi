-- 013: Create site_generation_logs table
CREATE TABLE site_generation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    trigger VARCHAR(30) NOT NULL CHECK (trigger IN ('manual','shop_update','product_update','subscription_change','image_update')),
    status VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','success','failed')),
    error_message TEXT,
    duration_ms INTEGER,
    output_path VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_site_gen_shop_id ON site_generation_logs(shop_id);
CREATE INDEX idx_site_gen_status ON site_generation_logs(status);