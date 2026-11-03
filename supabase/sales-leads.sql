-- Proposed persistence for the private Agent 6 manual research workflow.
-- Review before running in the DWD Supabase project; this file is not applied automatically.

CREATE TABLE IF NOT EXISTS public.sales_leads (
  id TEXT PRIMARY KEY,
  normalized_domain TEXT,
  business_name TEXT NOT NULL
    CHECK (business_name ~ '[^[:space:]]' AND char_length(business_name) <= 160),
  country TEXT NOT NULL
    CHECK (country ~ '[^[:space:]]' AND char_length(country) <= 100),
  verification_status TEXT NOT NULL CHECK (
    verification_status IN ('UNVERIFIED', 'PARTIALLY_VERIFIED', 'VERIFIED', 'OUTDATED', 'REJECTED')
  ),
  qualification_status TEXT NOT NULL CHECK (
    qualification_status IN ('HIGH_POTENTIAL', 'MEDIUM_POTENTIAL', 'LOW_POTENTIAL', 'RESEARCH_REQUIRED', 'NOT_SUITABLE')
  ),
  lead_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT sales_leads_json_object_check
    CHECK (jsonb_typeof(lead_data) = 'object'),
  CONSTRAINT sales_leads_duplicate_columns_match_json_check CHECK ((
    jsonb_typeof(lead_data->'id') = 'string'
    AND lead_data->>'id' = id
    AND jsonb_typeof(lead_data->'businessName') = 'string'
    AND lead_data->>'businessName' = business_name
    AND jsonb_typeof(lead_data->'country') = 'string'
    AND lead_data->>'country' = country
    AND jsonb_typeof(lead_data->'verificationStatus') = 'string'
    AND lead_data->>'verificationStatus' = verification_status
    AND jsonb_typeof(lead_data->'qualificationStatus') = 'string'
    AND lead_data->>'qualificationStatus' = qualification_status
    AND jsonb_typeof(lead_data->'createdAt') = 'string'
    AND lead_data->>'createdAt' =
      to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    AND jsonb_typeof(lead_data->'updatedAt') = 'string'
    AND lead_data->>'updatedAt' =
      to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  ) IS TRUE),
  CONSTRAINT sales_leads_updated_at_after_created_at_check
    CHECK (updated_at >= created_at)
);

CREATE INDEX IF NOT EXISTS public.idx_sales_leads_updated
  ON public.sales_leads (updated_at DESC);
CREATE INDEX IF NOT EXISTS public.idx_sales_leads_domain
  ON public.sales_leads (normalized_domain) WHERE normalized_domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS public.idx_sales_leads_country
  ON public.sales_leads (lower(country));
CREATE INDEX IF NOT EXISTS public.idx_sales_leads_verification
  ON public.sales_leads (verification_status);
CREATE INDEX IF NOT EXISTS public.idx_sales_leads_qualification
  ON public.sales_leads (qualification_status);

ALTER TABLE public.sales_leads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.sales_leads FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.sales_leads TO service_role;
