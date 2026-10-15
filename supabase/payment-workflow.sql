-- Durrani Web Developers manual payment receipts.
-- Run this in the dedicated DWD Supabase project's SQL Editor.
-- Do not run against a client's project or the GRILLVI project.

CREATE TABLE IF NOT EXISTS public.payment_settings (
    id TEXT PRIMARY KEY CHECK (id = 'default'),
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.payment_settings (id, settings)
VALUES (
    'default',
    '{
      "accountHolder": "",
      "walletNumber": "",
      "bankName": "",
      "accountNumber": "",
      "iban": "",
      "branch": "",
      "jazzcashEnabled": true,
      "easypaisaEnabled": true,
      "bankTransferEnabled": true
    }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.payment_proofs (
    id UUID PRIMARY KEY,
    customer_name TEXT NOT NULL CHECK (char_length(customer_name) BETWEEN 2 AND 100),
    customer_email TEXT NOT NULL CHECK (char_length(customer_email) <= 254),
    customer_phone TEXT NOT NULL CHECK (char_length(customer_phone) BETWEEN 7 AND 30),
    inquiry_reference TEXT CHECK (char_length(inquiry_reference) <= 50),
    method TEXT NOT NULL CHECK (method IN ('JazzCash', 'Easypaisa', 'Bank Transfer')),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'PKR' CHECK (currency = 'PKR'),
    transaction_reference TEXT NOT NULL CHECK (char_length(transaction_reference) BETWEEN 3 AND 100),
    storage_path TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
    admin_note TEXT CHECK (char_length(admin_note) <= 500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payment_proofs_status_created
    ON public.payment_proofs (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_email_created
    ON public.payment_proofs (customer_email, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_proofs_method_transaction
    ON public.payment_proofs (method, lower(transaction_reference));

ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.payment_settings FROM anon, authenticated;
REVOKE ALL ON TABLE public.payment_proofs FROM anon, authenticated;
GRANT ALL ON TABLE public.payment_settings TO service_role;
GRANT ALL ON TABLE public.payment_proofs TO service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'payment-receipts',
    'payment-receipts',
    FALSE,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = FALSE,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- This bucket intentionally has no anon/authenticated object policies.
-- The server uses the secret service-role key to upload and issue short-lived
-- signed links for authorized admin sessions only.
