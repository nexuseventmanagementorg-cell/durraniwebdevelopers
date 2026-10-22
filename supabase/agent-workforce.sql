-- Persistent, admin-owned first-step AI workforce runs.
-- Review and apply only to the dedicated DWD Supabase project.
-- This migration is not applied automatically by the application.

CREATE TABLE IF NOT EXISTS public.agent_runs (
    id UUID PRIMARY KEY,
    request_id UUID NOT NULL,
    created_by TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    agent_version TEXT NOT NULL,
    goal TEXT NOT NULL CHECK (char_length(goal) BETWEEN 10 AND 1200),
    status TEXT NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued', 'running', 'completed', 'failed')),
    attempt_count SMALLINT NOT NULL DEFAULT 0
        CHECK (attempt_count BETWEEN 0 AND 1),
    result JSONB,
    error_code TEXT CHECK (
        error_code IS NULL OR error_code IN (
            'configuration', 'provider', 'tool_call', 'invalid_output',
            'timeout', 'internal'
        )
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (created_by, request_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_created_by_created_at
    ON public.agent_runs (created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status_updated_at
    ON public.agent_runs (status, updated_at DESC);

ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.agent_runs FROM anon, authenticated;
GRANT ALL ON TABLE public.agent_runs TO service_role;
