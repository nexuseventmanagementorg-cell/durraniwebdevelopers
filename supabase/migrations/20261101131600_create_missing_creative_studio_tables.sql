DO $$
BEGIN
  IF to_regclass('public.creative_studio_settings') IS NULL THEN
    CREATE TABLE public.creative_studio_settings (
      id TEXT PRIMARY KEY CHECK (id = 'default'),
      config JSONB NOT NULL CHECK (jsonb_typeof(config) = 'object'),
      version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_by TEXT NOT NULL DEFAULT 'Admin'
    );

    ALTER TABLE public.creative_studio_settings ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.creative_studio_settings FROM anon, authenticated;
    GRANT ALL ON TABLE public.creative_studio_settings TO service_role;
  END IF;

  IF to_regclass('public.creative_studio_inquiries') IS NULL THEN
    CREATE TABLE public.creative_studio_inquiries (
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
      ON public.creative_studio_inquiries (status, created_at DESC);

    CREATE INDEX IF NOT EXISTS creative_studio_inquiries_email_idx
      ON public.creative_studio_inquiries ((lower(inquiry_data #>> '{customer,email}')));

    ALTER TABLE public.creative_studio_inquiries ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public.creative_studio_inquiries FROM anon, authenticated;
    GRANT ALL ON TABLE public.creative_studio_inquiries TO service_role;
  END IF;
END
$$;
