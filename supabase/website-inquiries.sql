-- Durable calculator/contact inquiries for Vercel deployments.
-- Run in the dedicated DWD Supabase SQL Editor before deploying inquiry storage.

ALTER TABLE public.inquiries
    ADD COLUMN IF NOT EXISTS inquiry_data JSONB;

CREATE INDEX IF NOT EXISTS idx_inquiries_created_at
    ON public.inquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_email
    ON public.inquiries (lower(email));
CREATE INDEX IF NOT EXISTS idx_inquiries_status
    ON public.inquiries (status);

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view their inquiry status safely if reference ID is matched"
    ON public.inquiries;
DROP POLICY IF EXISTS "Public can submit inquiries" ON public.inquiries;
REVOKE ALL ON TABLE public.inquiries FROM anon, authenticated;
GRANT ALL ON TABLE public.inquiries TO service_role;