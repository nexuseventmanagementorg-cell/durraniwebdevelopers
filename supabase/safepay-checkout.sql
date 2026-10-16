-- Safepay hosted card checkout records for Durrani Web Developers.
-- Run once in the dedicated DWD Supabase project after reviewing the changes.
-- This is additive; it does not modify payment_settings or payment_proofs.

CREATE TABLE IF NOT EXISTS public.gateway_payments (
    id UUID PRIMARY KEY,
    customer_name TEXT NOT NULL CHECK (char_length(customer_name) BETWEEN 2 AND 100),
    customer_email TEXT NOT NULL CHECK (char_length(customer_email) <= 254),
    customer_phone TEXT NOT NULL CHECK (char_length(customer_phone) BETWEEN 7 AND 30),
    inquiry_reference TEXT CHECK (char_length(inquiry_reference) <= 50),
    amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
    currency TEXT NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
    tracker_token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_gateway_payments_status_created
    ON public.gateway_payments (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gateway_payments_email_created
    ON public.gateway_payments (customer_email, created_at DESC);

ALTER TABLE public.gateway_payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.gateway_payments FROM anon, authenticated;
GRANT ALL ON TABLE public.gateway_payments TO service_role;
