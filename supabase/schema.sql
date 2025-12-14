-- KOFA Commerce Engine - Supabase Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/sql

-- ===========================================
-- PRODUCTS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    price_ngn DECIMAL(12, 2) NOT NULL,
    stock_level INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    category TEXT,
    image_url TEXT,
    voice_tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ===========================================
-- ORDERS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_phone TEXT,
    items JSONB NOT NULL DEFAULT '[]',
    total_amount DECIMAL(12, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'fulfilled', 'cancelled')),
    payment_ref TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ===========================================
-- EXPENSES TABLE (for Spend module)
-- ===========================================
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    category TEXT,
    expense_type TEXT NOT NULL DEFAULT 'business' CHECK (expense_type IN ('business', 'personal')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ===========================================
-- MANUAL SALES TABLE (Instagram, walk-in, etc.)
-- ===========================================
CREATE TABLE IF NOT EXISTS manual_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    amount_ngn DECIMAL(12, 2) NOT NULL,
    channel TEXT NOT NULL DEFAULT 'other' CHECK (channel IN ('instagram', 'walk-in', 'whatsapp', 'other')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ===========================================
-- INDEXES
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_ref ON orders(payment_ref);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_expenses_type ON expenses(expense_type);
CREATE INDEX IF NOT EXISTS idx_manual_sales_channel ON manual_sales(channel);

-- ===========================================
-- AUTO-UPDATE TIMESTAMP TRIGGER
-- ===========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- SAMPLE DATA (Nigerian market optimized)
-- ===========================================
INSERT INTO products (name, price_ngn, stock_level, voice_tags, description, category) VALUES
    (
        'Nike Air Max Red',
        45000,
        12,
        ARRAY['red canvas', 'red sneakers', 'canvas', 'kicks', 'gym shoes', 'running shoes', 'red kicks', 'sport shoe', 'nike red', 'air max'],
        'Premium Nike Air Max running shoes in red',
        'Footwear'
    ),
    (
        'Adidas White Sneakers',
        38000,
        10,
        ARRAY['white canvas', 'canvas', 'white sneakers', 'white kicks', 'adidas white', 'clean white', 'all white', 'white shoe'],
        'Classic white Adidas sneakers',
        'Footwear'
    ),
    (
        'Men Formal Shirt White',
        15000,
        20,
        ARRAY['packing shirt', 'button down', 'office wear', 'white shirt', 'formal shirt', 'top', 'office top', 'work shirt'],
        'Professional white formal shirt for office',
        'Clothing'
    ),
    (
        'Designer Blue Jeans',
        25000,
        15,
        ARRAY['jeans', 'blue jeans', 'denim', 'trouser', 'jean trouser', 'pants', 'blue trouser', 'designer jeans'],
        'Premium designer blue denim jeans',
        'Clothing'
    ),
    (
        'Black Leather Bag',
        35000,
        5,
        ARRAY['bag', 'leather bag', 'handbag', 'black bag', 'purse', 'side bag', 'hand bag', 'designer bag'],
        'Premium black leather handbag',
        'Accessories'
    ),
    (
        'Plain Round Neck T-Shirt',
        8000,
        50,
        ARRAY['round neck', 'polo', 'top', 'plain tee', 't-shirt', 'tshirt', 'plain top', 'round neck top', 'casual top'],
        'Comfortable plain t-shirt for casual wear',
        'Clothing'
    )
ON CONFLICT DO NOTHING;
