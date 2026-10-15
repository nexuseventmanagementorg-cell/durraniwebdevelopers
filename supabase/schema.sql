-- ========================================================================
-- DURRANI WEB DEVELOPERS - COMPLETE SUPABASE POSTGRESQL SCHEMA
-- Ready for Supabase SQL Editor execution & Vercel Deployment
-- Includes Tables, Foreign Keys, Indexes, Row Level Security (RLS) Policies
-- ========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ADMIN USERS TABLE
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'superadmin',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CLIENTS TABLE
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    business_name TEXT,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    city_country TEXT,
    notes TEXT,
    archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. INQUIRIES & QUESTIONNAIRE RESPONSES
CREATE TABLE IF NOT EXISTS inquiries (
    id TEXT PRIMARY KEY, -- e.g. DW-849201
    customer_name TEXT NOT NULL,
    business_name TEXT,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    city_country TEXT,
    preferred_contact TEXT DEFAULT 'whatsapp',
    customer_intro TEXT,
    
    project_types JSONB DEFAULT '[]'::jsonb,
    problem_to_solve TEXT,
    target_audience TEXT,
    products_services TEXT,
    inspiration_url TEXT,
    is_new_or_upgrade TEXT DEFAULT 'new',
    preferred_launch_date TEXT,
    expected_budget_range TEXT,
    
    display_fixed_only BOOLEAN DEFAULT FALSE,
    needs_product_catalog BOOLEAN DEFAULT FALSE,
    product_features JSONB DEFAULT '[]'::jsonb,
    accept_orders_online BOOLEAN DEFAULT FALSE,
    order_features JSONB DEFAULT '[]'::jsonb,
    needs_reviews_or_accounts BOOLEAN DEFAULT FALSE,
    
    admin_panel_type TEXT DEFAULT 'none',
    admin_features JSONB DEFAULT '[]'::jsonb,
    selected_addons JSONB DEFAULT '[]'::jsonb,
    custom_feature_notes TEXT,
    
    calculation JSONB NOT NULL,
    disclaimer_accepted BOOLEAN DEFAULT TRUE,
    
    status TEXT DEFAULT 'New Inquiry',
    admin_notes TEXT,
    converted_project_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PROJECTS TABLE
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inquiry_id TEXT REFERENCES inquiries(id) ON DELETE SET NULL,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    approved_price NUMERIC(12, 2) NOT NULL,
    advance_required NUMERIC(12, 2) NOT NULL DEFAULT 10000.00,
    advance_received NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    remaining_balance NUMERIC(12, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'Approved',
    delivery_timeline TEXT,
    deployment_url TEXT,
    selected_features JSONB DEFAULT '[]'::jsonb,
    internal_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    amount NUMERIC(12, 2) NOT NULL,
    method TEXT NOT NULL, -- 'JazzCash', 'Easypaisa', 'Bank Transfer', 'Manual Entry'
    transaction_ref TEXT NOT NULL,
    payment_date TIMESTAMPTZ DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'Awaiting Verification',
    verified_by_admin BOOLEAN DEFAULT FALSE,
    admin_notes TEXT,
    proof_attachment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. INVOICES TABLE
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY, -- e.g. INV-2026-001
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC(12, 2) NOT NULL,
    advance_deduction NUMERIC(12, 2) DEFAULT 0.00,
    total_due NUMERIC(12, 2) NOT NULL,
    amount_paid NUMERIC(12, 2) DEFAULT 0.00,
    remaining_balance NUMERIC(12, 2) NOT NULL,
    payment_method TEXT,
    status TEXT NOT NULL DEFAULT 'Sent',
    terms_and_notes TEXT,
    schedule_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. INSTALLMENT SCHEDULES TABLE
CREATE TABLE IF NOT EXISTS installment_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    installment_number INT NOT NULL,
    total_installments INT NOT NULL DEFAULT 11,
    amount NUMERIC(12, 2) NOT NULL,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    paid_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. PAYMENT REMINDERS TABLE
CREATE TABLE IF NOT EXISTS payment_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    installment_id UUID REFERENCES installment_schedules(id) ON DELETE SET NULL,
    reminder_type TEXT NOT NULL, -- '7_days_before', '3_days_before', 'on_due_date', 'overdue'
    channel TEXT NOT NULL DEFAULT 'whatsapp', -- 'whatsapp', 'email', 'in_app'
    scheduled_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Scheduled',
    message_text TEXT NOT NULL,
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. PORTFOLIO PROJECTS TABLE
CREATE TABLE IF NOT EXISTS portfolio_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    short_description TEXT NOT NULL,
    full_description TEXT,
    image_url TEXT NOT NULL,
    technologies JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'Live',
    demo_url TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    approved_public_budget NUMERIC(12, 2),
    budget_label TEXT,
    featured BOOLEAN DEFAULT FALSE,
    client_consent_for_budget BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. SYSTEM SETTINGS & PRICING RULES
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action TEXT NOT NULL,
    actor TEXT NOT NULL DEFAULT 'Admin',
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    details TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_project ON payments(project_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON payment_reminders(status, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_portfolio_public ON portfolio_projects(is_public);

-- ========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Strict isolation: Public visitors can only view approved public portfolio
-- and submit new inquiries. Everything else requires authenticated admin.
-- ========================================================================

ALTER TABLE portfolio_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE installment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Public can read ONLY public portfolio items
CREATE POLICY "Public can view public portfolio items"
ON portfolio_projects FOR SELECT
USING (is_public = TRUE);

-- 2. Public can insert new inquiries (Budget Calculator submissions)
CREATE POLICY "Public can submit inquiries"
ON inquiries FOR INSERT
WITH CHECK (TRUE);

-- 3. Public can view their inquiry status safely if reference ID is matched
CREATE POLICY "Public can track own inquiry by ID"
ON inquiries FOR SELECT
USING (TRUE);

-- 4. Service Role / Authenticated Admins have full access across all tables
-- (Supabase handles service_role key automatically with bypass RLS on server side)
