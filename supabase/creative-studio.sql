-- AI Creative Studio standalone fresh-install script and schema reference.
-- This is not an incremental migration: the bucket upsert updates settings on
-- conflict. Use reviewed versioned migrations for repairs to an existing project.

CREATE TABLE IF NOT EXISTS creative_studio_settings (
  id TEXT PRIMARY KEY CHECK (id = 'default'),
  config JSONB NOT NULL CHECK (jsonb_typeof(config) = 'object'),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT NOT NULL DEFAULT 'Admin'
);

CREATE TABLE IF NOT EXISTS creative_studio_inquiries (
  inquiry_id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'NEW_INQUIRY'
    CHECK (status IN (
      'NEW_INQUIRY', 'UNDER_REVIEW', 'NEEDS_MORE_INFORMATION',
      'QUOTATION_PREPARED', 'AWAITING_CUSTOMER_APPROVAL', 'AWAITING_PAYMENT',
      'PAYMENT_UNDER_VERIFICATION', 'PAYMENT_RECEIVED', 'ADMIN_APPROVED',
      'READY_FOR_PRODUCTION', 'IN_PRODUCTION', 'QUALITY_REVIEW',
      'REVISION_REQUESTED', 'APPROVED_FOR_DELIVERY', 'DELIVERED', 'COMPLETED',
      'CANCELLED', 'ON_HOLD'
    )),
  inquiry_data JSONB NOT NULL CHECK (jsonb_typeof(inquiry_data) = 'object'),
  tracking_token_hash TEXT NOT NULL CHECK (length(tracking_token_hash) = 64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS creative_studio_inquiries_status_created_idx
  ON creative_studio_inquiries (status, created_at DESC);

CREATE INDEX IF NOT EXISTS creative_studio_inquiries_email_idx
  ON creative_studio_inquiries ((lower(inquiry_data #>> '{customer,email}')));

ALTER TABLE creative_studio_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE creative_studio_inquiries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE creative_studio_settings FROM anon, authenticated;
REVOKE ALL ON TABLE creative_studio_inquiries FROM anon, authenticated;
GRANT ALL ON TABLE creative_studio_settings TO service_role;
GRANT ALL ON TABLE creative_studio_inquiries TO service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'creative-studio-references',
  'creative-studio-references',
  FALSE,
  10485760,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm',
    'text/plain', 'application/x-subrip', 'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/rtf', 'text/rtf', 'application/x-rtf'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = 10485760,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
