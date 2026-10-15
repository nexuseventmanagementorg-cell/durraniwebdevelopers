-- Stores only the scrypt password hash used by the DWD admin password-change flow.
-- Run this in the dedicated DWD Supabase project, never in a customer project.

CREATE TABLE IF NOT EXISTS public.admin_credentials (
    id SMALLINT PRIMARY KEY CHECK (id = 1),
    password_hash TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.admin_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_credentials FROM anon, authenticated;
GRANT ALL ON TABLE public.admin_credentials TO service_role;
