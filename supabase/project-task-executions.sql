-- Durable, project-scoped task execution records.
-- Review and apply after supabase/project-workspaces.sql in the DWD Supabase project.
-- The application uses the server-side service role; this migration is not automatic.

CREATE OR REPLACE FUNCTION public.project_task_artifact_refs_valid(refs JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    artifact JSONB;
    artifact_path TEXT;
    artifact_sha256 TEXT;
    path_segment TEXT;
BEGIN
    IF refs IS NULL OR jsonb_typeof(refs) IS DISTINCT FROM 'array' THEN
        RETURN FALSE;
    END IF;

    FOR artifact IN SELECT value FROM jsonb_array_elements(refs) AS items(value)
    LOOP
        IF jsonb_typeof(artifact) IS DISTINCT FROM 'object'
            OR jsonb_typeof(artifact->'path') IS DISTINCT FROM 'string'
            OR jsonb_typeof(artifact->'sha256') IS DISTINCT FROM 'string' THEN
            RETURN FALSE;
        END IF;

        artifact_path := artifact->>'path';
        artifact_sha256 := artifact->>'sha256';
        IF char_length(artifact_path) = 0
            OR left(artifact_path, 1) = '/'
            OR artifact_path ~ '^[A-Za-z][A-Za-z0-9+.-]*:'
            OR position(chr(92) IN artifact_path) > 0
            OR artifact_sha256 !~* '^[a-f0-9]{64}$' THEN
            RETURN FALSE;
        END IF;

        FOREACH path_segment IN ARRAY string_to_array(artifact_path, '/')
        LOOP
            IF path_segment IN ('.', '..') THEN
                RETURN FALSE;
            END IF;
        END LOOP;
    END LOOP;

    RETURN TRUE;
END;
$$;

CREATE TABLE IF NOT EXISTS public.project_task_executions (
    id UUID PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES public.project_workspaces(project_id) ON DELETE CASCADE,
    task_id TEXT NOT NULL CHECK (char_length(task_id) BETWEEN 1 AND 100),
    task_description TEXT NOT NULL CHECK (char_length(task_description) BETWEEN 1 AND 500),
    agent_role TEXT NOT NULL CHECK (char_length(agent_role) BETWEEN 1 AND 100),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'running', 'succeeded', 'failed', 'timed_out')),
    attempt_count SMALLINT NOT NULL DEFAULT 0
        CHECK (attempt_count BETWEEN 0 AND 3),
    idempotency_key TEXT NOT NULL CHECK (char_length(idempotency_key) BETWEEN 8 AND 128),
    artifact_refs JSONB NOT NULL DEFAULT '[]'::jsonb
        CHECK (public.project_task_artifact_refs_valid(artifact_refs)),
    verification_evidence JSONB
        CHECK (verification_evidence IS NULL OR jsonb_typeof(verification_evidence) = 'object'),
    error_code TEXT
        CHECK (error_code IS NULL OR error_code IN (
            'provider', 'timeout', 'artifact_missing', 'verification_failed', 'internal'
        )),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, idempotency_key),
    CONSTRAINT project_task_executions_state_attempt_error_check CHECK (
        (status = 'pending'
            AND attempt_count BETWEEN 0 AND 2
            AND error_code IS NULL
            AND started_at IS NULL
            AND completed_at IS NULL)
        OR (status = 'running'
            AND attempt_count BETWEEN 1 AND 3
            AND error_code IS NULL
            AND started_at IS NOT NULL
            AND completed_at IS NULL)
        OR (status = 'succeeded'
            AND attempt_count BETWEEN 1 AND 3
            AND error_code IS NULL
            AND started_at IS NOT NULL
            AND completed_at IS NOT NULL)
        OR (status = 'failed'
            AND attempt_count BETWEEN 1 AND 3
            AND error_code IS NOT NULL
            AND error_code IN ('provider', 'artifact_missing', 'verification_failed', 'internal')
            AND started_at IS NOT NULL
            AND completed_at IS NOT NULL)
        OR (status = 'timed_out'
            AND attempt_count BETWEEN 1 AND 3
            AND error_code IS NOT NULL
            AND error_code = 'timeout'
            AND started_at IS NOT NULL
            AND completed_at IS NOT NULL)
    ),
    CONSTRAINT project_task_executions_timestamps_check CHECK (
        created_at <= updated_at
        AND (started_at IS NULL OR (created_at <= started_at AND started_at <= updated_at))
        AND (completed_at IS NULL OR (
            started_at IS NOT NULL
            AND started_at <= completed_at
            AND completed_at <= updated_at
        ))
    ),
    CONSTRAINT project_task_executions_succeeded_evidence_check CHECK (
        status <> 'succeeded' OR COALESCE((
            CASE
                WHEN jsonb_typeof(artifact_refs) = 'array'
                    THEN jsonb_array_length(artifact_refs) > 0
                ELSE FALSE
            END
            AND jsonb_typeof(verification_evidence) = 'object'
            AND jsonb_typeof(verification_evidence->'command') = 'string'
            AND char_length(btrim(verification_evidence->>'command')) BETWEEN 1 AND 200
            AND jsonb_typeof(verification_evidence->'exitCode') = 'number'
            AND CASE
                WHEN jsonb_typeof(verification_evidence->'exitCode') = 'number'
                    THEN (verification_evidence->>'exitCode')::numeric = 0
                ELSE FALSE
            END
            AND jsonb_typeof(verification_evidence->'testsPassed') = 'number'
            AND CASE
                WHEN jsonb_typeof(verification_evidence->'testsPassed') = 'number'
                    THEN (verification_evidence->>'testsPassed')::numeric > 0
                        AND (verification_evidence->>'testsPassed')::numeric
                            <= 1.7976931348623157e308
                        AND trunc((verification_evidence->>'testsPassed')::numeric)
                            = (verification_evidence->>'testsPassed')::numeric
                ELSE FALSE
            END
            AND jsonb_typeof(verification_evidence->'testsFailed') = 'number'
            AND CASE
                WHEN jsonb_typeof(verification_evidence->'testsFailed') = 'number'
                    THEN (verification_evidence->>'testsFailed')::numeric = 0
                ELSE FALSE
            END
            AND jsonb_typeof(verification_evidence->'verifiedAt') = 'string'
            AND char_length(btrim(verification_evidence->>'verifiedAt')) > 0
        ), FALSE)
    )
);

CREATE INDEX IF NOT EXISTS idx_project_task_executions_project_task_created
    ON public.project_task_executions (project_id, task_id, created_at DESC);

ALTER TABLE public.project_task_executions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.project_task_executions FROM anon, authenticated;
GRANT ALL ON TABLE public.project_task_executions TO service_role;
