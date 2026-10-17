-- Private, consent-based calculator leads for the DWD admin panel.
-- Run in the dedicated DWD Supabase SQL Editor before enabling production lead capture.

CREATE TABLE IF NOT EXISTS calculator_leads (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'New'
    CHECK (status IN ('New', 'Contacted', 'Qualified', 'Converted', 'Closed')),
  currency TEXT NOT NULL DEFAULT 'PKR',
  goal TEXT NOT NULL,
  budget_band TEXT NOT NULL,
  progress_step SMALLINT NOT NULL DEFAULT 0 CHECK (progress_step BETWEEN 0 AND 8),
  contact_consent_at TIMESTAMPTZ NOT NULL,
  lead_data JSONB NOT NULL CHECK (jsonb_typeof(lead_data) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calculator_leads_updated
  ON calculator_leads (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_calculator_leads_email
  ON calculator_leads (lower(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calculator_leads_phone
  ON calculator_leads (phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calculator_leads_status
  ON calculator_leads (status);

ALTER TABLE calculator_leads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE calculator_leads FROM anon, authenticated;
GRANT ALL ON TABLE calculator_leads TO service_role;