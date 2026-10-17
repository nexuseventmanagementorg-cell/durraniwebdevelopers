-- Durable project records for Vercel deployments.
-- Run after the DWD inquiries migration in the project's Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS project_workspaces (
  project_id TEXT PRIMARY KEY,
  inquiry_id TEXT UNIQUE,
  project_data JSONB NOT NULL CHECK (jsonb_typeof(project_data) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_workspaces_created
  ON project_workspaces (created_at DESC);

ALTER TABLE project_workspaces ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE project_workspaces FROM anon, authenticated;
GRANT ALL ON TABLE project_workspaces TO service_role;