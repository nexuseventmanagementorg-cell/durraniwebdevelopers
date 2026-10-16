-- Privacy-conscious daily visitor and tool-use counts for Durrani Web Developers.
-- Run in the dedicated DWD Supabase project SQL Editor.

CREATE TABLE IF NOT EXISTS public.daily_visitor_event_visitors (
    day DATE NOT NULL,
    event TEXT NOT NULL CHECK (event IN ('visitor', 'calculator', 'estimator')),
    visitor_hash TEXT NOT NULL CHECK (visitor_hash ~ '^[0-9a-f]{64}$'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (day, event, visitor_hash)
);

CREATE TABLE IF NOT EXISTS public.daily_visitor_counts (
    day DATE NOT NULL,
    event TEXT NOT NULL CHECK (event IN ('visitor', 'calculator', 'estimator')),
    visitor_count BIGINT NOT NULL DEFAULT 0 CHECK (visitor_count >= 0),
    PRIMARY KEY (day, event)
);

ALTER TABLE public.daily_visitor_event_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_visitor_counts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.daily_visitor_event_visitors FROM anon, authenticated;
REVOKE ALL ON TABLE public.daily_visitor_counts FROM anon, authenticated;
GRANT ALL ON TABLE public.daily_visitor_event_visitors TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.daily_visitor_counts TO service_role;

CREATE OR REPLACE FUNCTION public.record_daily_visitor_event(
    p_day DATE,
    p_event TEXT,
    p_visitor_hash TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_event NOT IN ('visitor', 'calculator', 'estimator')
       OR p_visitor_hash !~ '^[0-9a-f]{64}$' THEN
        RAISE EXCEPTION 'Invalid visitor analytics event';
    END IF;

    INSERT INTO public.daily_visitor_event_visitors (day, event, visitor_hash)
    VALUES (p_day, p_event, p_visitor_hash)
    ON CONFLICT DO NOTHING;

    IF FOUND THEN
        INSERT INTO public.daily_visitor_counts (day, event, visitor_count)
        VALUES (p_day, p_event, 1)
        ON CONFLICT (day, event)
        DO UPDATE SET visitor_count = public.daily_visitor_counts.visitor_count + 1;
    END IF;

    DELETE FROM public.daily_visitor_event_visitors
    WHERE day < p_day - 2;
END;
$$;

REVOKE ALL ON FUNCTION public.record_daily_visitor_event(DATE, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_daily_visitor_event(DATE, TEXT, TEXT) TO service_role;
