-- 003: Create plans table
CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    price_monthly_xof INTEGER NOT NULL,
    price_yearly_xof INTEGER,
    max_products INTEGER NOT NULL,
    max_images_per_product INTEGER NOT NULL,
    max_variants_per_product INTEGER NOT NULL,
    max_categories INTEGER NOT NULL,
    storage_mb INTEGER NOT NULL,
    custom_domain BOOLEAN NOT NULL DEFAULT false,
    analytics BOOLEAN NOT NULL DEFAULT false,
    custom_colors BOOLEAN NOT NULL DEFAULT false,
    remove_branding BOOLEAN NOT NULL DEFAULT false,
    priority_support BOOLEAN NOT NULL DEFAULT false,
    trial_days INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_plans_updated_at
    BEFORE UPDATE ON plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();