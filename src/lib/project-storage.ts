import type { Project } from "@/lib/types";
import { DataStore } from "@/lib/store";
import { getPaymentSupabase, hasPaymentSupabaseConfiguration } from "@/lib/payment-server";

const TABLE_NAME = "project_workspaces";

export class ProjectWorkspaceStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectWorkspaceStorageError";
  }
}

function hasProjectSupabaseBackend(): boolean {
  if (hasPaymentSupabaseConfiguration()) return true;
  if (process.env.NODE_ENV === "production") {
    throw new ProjectWorkspaceStorageError(
      "Project storage requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  return false;
}

function storageError(error: { code?: string }): ProjectWorkspaceStorageError {
  if (error.code === "42P01" || error.code === "PGRST205") {
    return new ProjectWorkspaceStorageError(
      "Project workspace storage is not installed. Run supabase/project-workspaces.sql in the DWD Supabase project."
    );
  }
  return new ProjectWorkspaceStorageError("Project workspace storage is unavailable. Check Supabase connectivity and service-role permissions.");
}

interface ProjectWorkspaceRow {
  project_data: Project;
}

export async function getProjectRecords(): Promise<Project[]> {
  if (!hasProjectSupabaseBackend()) return DataStore.getProjects();

  const { data, error } = await getPaymentSupabase()
    .from(TABLE_NAME)
    .select("project_data")
    .order("created_at", { ascending: false });
  if (error) throw storageError(error);
  return ((data || []) as ProjectWorkspaceRow[]).map((row) => row.project_data);
}

export async function getProjectRecord(id: string): Promise<Project | undefined> {
  if (!hasProjectSupabaseBackend()) return DataStore.getProjectById(id);

  const { data, error } = await getPaymentSupabase()
    .from(TABLE_NAME)
    .select("project_data")
    .eq("project_id", id)
    .maybeSingle();
  if (error) throw storageError(error);
  return data ? (data as ProjectWorkspaceRow).project_data : undefined;
}

export async function getProjectRecordByInquiry(inquiryId: string): Promise<Project | undefined> {
  if (!hasProjectSupabaseBackend()) {
    return DataStore.getProjects().find((project) => project.inquiryId === inquiryId);
  }

  const { data, error } = await getPaymentSupabase()
    .from(TABLE_NAME)
    .select("project_data")
    .eq("inquiry_id", inquiryId)
    .maybeSingle();
  if (error) throw storageError(error);
  return data ? (data as ProjectWorkspaceRow).project_data : undefined;
}

export async function saveProjectRecord(project: Project): Promise<Project> {
  if (!hasProjectSupabaseBackend()) return DataStore.createProject(project);

  const { error } = await getPaymentSupabase().from(TABLE_NAME).insert({
    project_id: project.id,
    inquiry_id: project.inquiryId || null,
    project_data: project,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  });
  if (error) throw storageError(error);
  return project;
}

export async function updateProjectRecord(
  id: string,
  updates: Partial<Project>
): Promise<Project | null> {
  if (!hasProjectSupabaseBackend()) return DataStore.updateProject(id, updates);

  const current = await getProjectRecord(id);
  if (!current) return null;
  const updated: Project = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  const { data, error } = await getPaymentSupabase()
    .from(TABLE_NAME)
    .update({
      inquiry_id: updated.inquiryId || null,
      project_data: updated,
      updated_at: updated.updatedAt,
    })
    .eq("project_id", id)
    .select("project_data")
    .maybeSingle();
  if (error) throw storageError(error);
  return data ? (data as ProjectWorkspaceRow).project_data : null;
}