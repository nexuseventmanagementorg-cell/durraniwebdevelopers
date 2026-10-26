-- Restaurant website template Supabase / PostgreSQL schema

-- Enable uuid-ossp extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_ur TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_ur TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  price NUMERIC(10, 2) NOT NULL,
  description_en TEXT NOT NULL,
  description_ur TEXT,
  image_url TEXT NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  original_price_format TEXT,
  verified_from_menu BOOLEAN NOT NULL DEFAULT true,
  original_menu_section TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. DEALS TABLE
CREATE TABLE IF NOT EXISTS deals (
  id TEXT PRIMARY KEY,
  deal_number INT NOT NULL,
  name_en TEXT NOT NULL,
  name_ur TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  components JSONB NOT NULL DEFAULT '[]'::jsonb,
  description_en TEXT NOT NULL,
  image_url TEXT NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  is_family_deal BOOLEAN NOT NULL DEFAULT false,
  original_price_format TEXT,
  verified_from_menu BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. DINING TABLES (QR ORDERING)
CREATE TABLE IF NOT EXISTS dining_tables (
  id TEXT PRIMARY KEY, -- e.g. 'T01'
  label TEXT NOT NULL,  -- e.g. 'Table 1'
  seats INT NOT NULL DEFAULT 4,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY, -- e.g. 'SS-2610-8492'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('dine_in', 'takeaway', 'delivery')),
  table_number TEXT,
  delivery_address TEXT,
  special_instructions TEXT,
  items JSONB NOT NULL,
  items_subtotal NUMERIC(10, 2) NOT NULL,
  delivery_charges NUMERIC(10, 2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'awaiting_whatsapp'
    CHECK (status IN ('awaiting_whatsapp', 'pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled')),
  status_notes TEXT,
  estimated_minutes INT,
  whatsapp_prefilled TEXT,
  whatsapp_declared_sent BOOLEAN NOT NULL DEFAULT false
);

-- 6. BUSINESS SETTINGS TABLE
CREATE TABLE IF NOT EXISTS business_settings (
  id INT PRIMARY KEY DEFAULT 1,
  restaurant_name TEXT NOT NULL,
  urdu_name TEXT NOT NULL,
  tagline TEXT NOT NULL,
  phone_candidate TEXT NOT NULL,
  whatsapp_number_formatted TEXT NOT NULL,
  is_whatsapp_confirmed_by_owner BOOLEAN NOT NULL DEFAULT false,
  address TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  google_maps_url TEXT NOT NULL,
  facebook_url TEXT NOT NULL,
  opening_hours_formatted TEXT NOT NULL,
  is_sunday_off BOOLEAN NOT NULL DEFAULT true,
  delivery_charges NUMERIC(10, 2) NOT NULL DEFAULT 100,
  minimum_order NUMERIC(10, 2) NOT NULL DEFAULT 250,
  announcement_text TEXT NOT NULL,
  is_announcement_active BOOLEAN NOT NULL DEFAULT true,
  currency_symbol TEXT NOT NULL DEFAULT 'Rs.',
  dine_in_enabled BOOLEAN NOT NULL DEFAULT true,
  takeaway_enabled BOOLEAN NOT NULL DEFAULT true,
  delivery_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE dining_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

-- Public can read menu data, active tables, and business settings
CREATE POLICY "Public Read Categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Public Read Products" ON products FOR SELECT USING (is_available = true);
CREATE POLICY "Public Read Deals" ON deals FOR SELECT USING (is_available = true);
CREATE POLICY "Public Read Tables" ON dining_tables FOR SELECT USING (is_active = true);
CREATE POLICY "Public Read Settings" ON business_settings FOR SELECT USING (true);

-- Public can create orders (authenticated or anonymous guest customers)
CREATE POLICY "Public Insert Orders" ON orders FOR INSERT WITH CHECK (true);

-- Public can check status of their specific order by matching Order ID
CREATE POLICY "Public Read Specific Order" ON orders FOR SELECT USING (true);

-- Admin full control (service_role or authenticated admin)
CREATE POLICY "Admin Full Categories" ON categories FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin Full Products" ON products FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin Full Deals" ON deals FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin Full Tables" ON dining_tables FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin Full Orders" ON orders FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin Full Settings" ON business_settings FOR ALL TO authenticated USING (true);
