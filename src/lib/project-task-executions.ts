import { randomUUID } from "crypto";
import type { Project, ProjectAutomationWorkflow } from "@/lib/types";
import { getPaymentSupabase, hasPaymentSupabaseConfiguration } from "@/lib/payment-server";
import { isProjectWorkflowTaskApproved } from "@/lib/project-workflow";

export type ProjectTaskExecutionStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "timed_out";

export type ProjectTaskExecutionErrorCode =
  | "provider"
  | "timeout"
  | "artifact_missing"
  | "verification_failed"
  | "internal";

export interface ProjectTaskArtifactReference {
  path: string;
  sha256: string;
}

export interface ProjectTaskVerificationEvidence {
  command: string;
  exitCode: number;
  testsPassed: number;
  testsFailed: number;
  verifiedAt: string;
}

export interface ProjectTaskExecutionRecord {
  id: string;
  project_id: string;
  task_id: string;
  task_description: string;
  agent_role: string;
  status: ProjectTaskExecutionStatus;
  attempt_count: number;
  idempotency_key: string;
  artifact_refs: ProjectTaskArtifactReference[];
  verification_evidence: ProjectTaskVerificationEvidence | null;
  error_code: ProjectTaskExecutionErrorCode | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
}

export const MAX_PROJECT_TASK_ATTEMPTS = 3;
const TABLE_NAME = "project_task_executions";

export class ProjectTaskExecutionError extends Error {
  constructor(
    message: string,
    readonly code: "invalid" | "not_found" | "duplicate" | "conflict" | "not_configured" | "storage"
  ) {
    super(message);
    this.name = "ProjectTaskExecutionError";
  }
}

export function approveProjectWorkflowTask(
  workflow: ProjectAutomationWorkflow,
  taskId: string,
  approvedBy: string,
  approvedAt = new Date().toISOString()
): ProjectAutomationWorkflow | null {
  const task = workflow.tasks.find((item) => item.id === taskId);
  if (!task || task.id !== "implementation" || task.status !== "ready" ||
      !approvedBy.trim() || task.approvedAt) {
    return null;
  }

  return {
    ...workflow,
    tasks: workflow.tasks.map((item) => item.id === taskId
      ? { ...item, approvedAt, approvedBy: approvedBy.trim() }
      : item),
  };
}

export function buildPendingProjectTaskExecution(
  project: Project,
  taskId: string,
  idempotencyKey: string,
  id: string = randomUUID(),
  createdAt = new Date().toISOString()
): Omit<ProjectTaskExecutionRecord, "updated_at"> {
  const key = idempotencyKey.trim();
  if (!project.id || !["Approved", "In Development"].includes(project.status) ||
      !project.automationWorkflow || !/^[A-Za-z0-9._:-]{8,128}$/.test(key)) {
    throw new ProjectTaskExecutionError("A valid approved project and idempotency key are required.", "invalid");
  }

  const task = project.automationWorkflow.tasks.find((item) => item.id === taskId);
  if (!task || task.id !== "implementation" || task.role !== "Web Developer" ||
      task.status !== "ready" || !isProjectWorkflowTaskApproved(task)) {
    throw new ProjectTaskExecutionError("The implementation task must be explicitly approved and ready.", "invalid");
  }

  return {
    id,
    project_id: project.id,
    task_id: task.id,
    task_description: task.title,
    agent_role: task.role,
    status: "pending",
    attempt_count: 0,
    idempotency_key: key,
    artifact_refs: [],
    verification_evidence: null,
    error_code: null,
    created_at: createdAt,
    started_at: null,
    completed_at: null,
  };
}

export function isCompatibleProjectTaskExecutionDuplicate(
  existing: ProjectTaskExecutionRecord,
  requested: Omit<ProjectTaskExecutionRecord, "updated_at">
): boolean {
  return existing.project_id === requested.project_id &&
    existing.idempotency_key === requested.idempotency_key &&
    existing.task_id === requested.task_id &&
    existing.task_description === requested.task_description &&
    existing.agent_role === requested.agent_role;
}

export function isProjectTaskExecutionForProject(
  execution: ProjectTaskExecutionRecord,
  projectId: string
): boolean {
  return execution.project_id === projectId;
}

export function canCompleteProjectWorkflowTask(
  taskId: string,
  hasVerifiedTaskExecution: boolean
): boolean {
  return !["implementation", "quality-assurance"].includes(taskId) ||
    hasVerifiedTaskExecution;
}

export function hasValidProjectTaskEvidence(
  artifacts: unknown,
  evidence: unknown
): boolean {
  if (!Array.isArray(artifacts) || typeof evidence !== "object" || evidence === null ||
      Array.isArray(evidence)) return false;
  const candidate = evidence as Record<string, unknown>;
  return Array.isArray(artifacts) &&
    artifacts.length > 0 &&
    artifacts.every((artifact) =>
      typeof artifact === "object" &&
      artifact !== null &&
      !Array.isArray(artifact) &&
      "path" in artifact &&
      "sha256" in artifact &&
      typeof artifact.path === "string" &&
      typeof artifact.sha256 === "string" &&
      artifact.path.length > 0 &&
      !artifact.path.startsWith("/") &&
      !/^[A-Za-z][A-Za-z0-9+.-]*:/.test(artifact.path) &&
      !artifact.path.includes("\\") &&
      !artifact.path.split("/").some((segment: string) => segment === "." || segment === "..") &&
      /^[a-f0-9]{64}$/i.test(artifact.sha256)
    ) &&
    typeof candidate.command === "string" &&
    candidate.command.trim().length > 0 &&
    candidate.command.length <= 200 &&
    candidate.exitCode === 0 &&
    Number.isInteger(candidate.testsPassed) &&
    Number(candidate.testsPassed) > 0 &&
    candidate.testsFailed === 0 &&
    typeof candidate.verifiedAt === "string" &&
    Number.isFinite(Date.parse(candidate.verifiedAt));
}

export function createProjectTaskExecutionTransition(
  current: ProjectTaskExecutionRecord,
  action:
    | { type: "start"; at: string }
    | { type: "succeed"; at: string; artifacts: ProjectTaskArtifactReference[]; evidence: ProjectTaskVerificationEvidence }
    | { type: "fail"; at: string; errorCode: Exclude<ProjectTaskExecutionErrorCode, "timeout"> }
    | { type: "timeout"; at: string }
    | { type: "retry"; at?: string }
): ProjectTaskExecutionRecord {
  const updated = {
    ...current,
    updated_at: "at" in action && typeof action.at === "string"
      ? action.at
      : new Date().toISOString(),
  };
  const updatedAtMs = Date.parse(updated.updated_at);
  const createdAtMs = Date.parse(current.created_at);
  if (!Number.isFinite(updatedAtMs) || !Number.isFinite(createdAtMs) || updatedAtMs < createdAtMs) {
    throw new ProjectTaskExecutionError("Execution timestamps must be valid and chronological.", "invalid");
  }
  const currentUpdatedAtMs = Date.parse(current.updated_at);
  if (!Number.isFinite(currentUpdatedAtMs) || currentUpdatedAtMs > updatedAtMs) {
    throw new ProjectTaskExecutionError("Execution timestamps must not move backwards.", "invalid");
  }

  if (action.type === "start") {
    if (current.status !== "pending" || current.attempt_count >= MAX_PROJECT_TASK_ATTEMPTS) {
      throw new ProjectTaskExecutionError("This execution cannot be started.", "conflict");
    }
    return {
      ...updated,
      status: "running",
      attempt_count: current.attempt_count + 1,
      started_at: action.at,
      completed_at: null,
      error_code: null,
    };
  }

  if (action.type === "succeed") {
    const startedAtMs = current.started_at ? Date.parse(current.started_at) : NaN;
    if (current.status !== "running" ||
        !Number.isFinite(startedAtMs) ||
        updatedAtMs < startedAtMs ||
        !hasValidProjectTaskEvidence(action.artifacts, action.evidence)) {
      throw new ProjectTaskExecutionError("A running task needs an artifact and passing test evidence to succeed.", "invalid");
    }
    return {
      ...updated,
      status: "succeeded",
      artifact_refs: action.artifacts,
      verification_evidence: action.evidence,
      error_code: null,
      completed_at: action.at,
    };
  }

  if (action.type === "fail" || action.type === "timeout") {
    const startedAtMs = current.started_at ? Date.parse(current.started_at) : NaN;
    if (current.status !== "running" || !Number.isFinite(startedAtMs) || updatedAtMs < startedAtMs) {
      throw new ProjectTaskExecutionError("Only a running execution can fail or time out.", "conflict");
    }
    return {
      ...updated,
      status: action.type === "timeout" ? "timed_out" : "failed",
      error_code: action.type === "timeout" ? "timeout" : action.errorCode,
      completed_at: action.at,
    };
  }

  if (!["failed", "timed_out"].includes(current.status) ||
      current.attempt_count >= MAX_PROJECT_TASK_ATTEMPTS) {
    throw new ProjectTaskExecutionError("This execution cannot be retried.", "conflict");
  }
  return {
    ...updated,
    status: "pending",
    artifact_refs: [],
    verification_evidence: null,
    error_code: null,
    started_at: null,
    completed_at: null,
  };
}

function requireExecutionStorage(): void {
  if (!hasPaymentSupabaseConfiguration()) {
    throw new ProjectTaskExecutionError(
      "Durable task execution storage requires the server-side Supabase configuration.",
      "not_configured"
    );
  }
}

function storageError(code?: string): ProjectTaskExecutionError {
  if (code === "42P01" || code === "PGRST205") {
    return new ProjectTaskExecutionError(
      "Project task execution storage is not installed. Review supabase/project-task-executions.sql.",
      "storage"
    );
  }
  return new ProjectTaskExecutionError(
    "Project task execution storage is unavailable. Check Supabase connectivity and service-role permissions.",
    "storage"
  );
}

async function getExecutionByIdempotencyKey(
  projectId: string,
  idempotencyKey: string
): Promise<ProjectTaskExecutionRecord | null> {
  const { data, error } = await getPaymentSupabase()
    .from(TABLE_NAME)
    .select("*")
    .eq("project_id", projectId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (error) throw storageError(error.code);
  return data as ProjectTaskExecutionRecord | null;
}

export async function createProjectTaskExecution(
  project: Project,
  taskId: string,
  idempotencyKey: string
): Promise<{ record: ProjectTaskExecutionRecord; created: boolean }> {
  const pending = buildPendingProjectTaskExecution(project, taskId, idempotencyKey);
  requireExecutionStorage();
  const insert = { ...pending, updated_at: pending.created_at };
  const { data, error } = await getPaymentSupabase()
    .from(TABLE_NAME)
    .insert(insert)
    .select("*")
    .maybeSingle();

  if (!error) {
    if (!data) throw storageError();
    return { record: data as ProjectTaskExecutionRecord, created: true };
  }
  if (error.code !== "23505") throw storageError(error.code);

  const existing = await getExecutionByIdempotencyKey(project.id, pending.idempotency_key);
  if (!existing) throw storageError(error.code);
  if (!isCompatibleProjectTaskExecutionDuplicate(existing, pending)) {
    throw new ProjectTaskExecutionError("The idempotency key was already used for a different task.", "duplicate");
  }
  return { record: existing, created: false };
}

export async function getProjectTaskExecution(
  projectId: string,
  executionId: string
): Promise<ProjectTaskExecutionRecord | null> {
  requireExecutionStorage();
  const { data, error } = await getPaymentSupabase()
    .from(TABLE_NAME)
    .select("*")
    .eq("project_id", projectId)
    .eq("id", executionId)
    .maybeSingle();
  if (error) throw storageError(error.code);
  const record = data as ProjectTaskExecutionRecord | null;
  return record && isProjectTaskExecutionForProject(record, projectId) ? record : null;
}

export async function listProjectTaskExecutions(
  projectId: string,
  taskId?: string
): Promise<ProjectTaskExecutionRecord[]> {
  requireExecutionStorage();
  let query = getPaymentSupabase()
    .from(TABLE_NAME)
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (taskId) query = query.eq("task_id", taskId);
  const { data, error } = await query;
  if (error) throw storageError(error.code);
  return (data || []) as ProjectTaskExecutionRecord[];
}

export async function hasSucceededProjectTaskExecution(
  projectId: string,
  taskId: string
): Promise<boolean> {
  const records = await listProjectTaskExecutions(projectId, taskId);
  return records.some((record) =>
    record.status === "succeeded" &&
    record.artifact_refs.length > 0 &&
    record.verification_evidence !== null &&
    hasValidProjectTaskEvidence(record.artifact_refs, record.verification_evidence)
  );
}

async function saveTransition(
  projectId: string,
  current: ProjectTaskExecutionRecord,
  next: ProjectTaskExecutionRecord
): Promise<ProjectTaskExecutionRecord> {
  const { data, error } = await getPaymentSupabase()
    .from(TABLE_NAME)
    .update({
      status: next.status,
      attempt_count: next.attempt_count,
      artifact_refs: next.artifact_refs,
      verification_evidence: next.verification_evidence,
      error_code: next.error_code,
      started_at: next.started_at,
      completed_at: next.completed_at,
      updated_at: next.updated_at,
    })
    .eq("project_id", projectId)
    .eq("id", current.id)
    .eq("status", current.status)
    .select("*")
    .maybeSingle();
  if (error) throw storageError(error.code);
  if (!data) throw new ProjectTaskExecutionError("The execution changed concurrently; reload it before retrying.", "conflict");
  return data as ProjectTaskExecutionRecord;
}

async function transitionProjectTaskExecution(
  projectId: string,
  executionId: string,
  action: Parameters<typeof createProjectTaskExecutionTransition>[1]
): Promise<ProjectTaskExecutionRecord> {
  requireExecutionStorage();
  const current = await getProjectTaskExecution(projectId, executionId);
  if (!current) throw new ProjectTaskExecutionError("Project task execution not found.", "not_found");
  const next = createProjectTaskExecutionTransition(current, action);
  return saveTransition(projectId, current, next);
}

export function startProjectTaskExecution(projectId: string, executionId: string, at?: string) {
  return transitionProjectTaskExecution(projectId, executionId, {
    type: "start",
    at: at || new Date().toISOString(),
  });
}

export function succeedProjectTaskExecution(
  projectId: string,
  executionId: string,
  artifacts: ProjectTaskArtifactReference[],
  evidence: ProjectTaskVerificationEvidence,
  at?: string
) {
  return transitionProjectTaskExecution(projectId, executionId, {
    type: "succeed",
    at: at || new Date().toISOString(),
    artifacts,
    evidence,
  });
}

export function failProjectTaskExecution(
  projectId: string,
  executionId: string,
  errorCode: Exclude<ProjectTaskExecutionErrorCode, "timeout">,
  at?: string
) {
  return transitionProjectTaskExecution(projectId, executionId, {
    type: "fail",
    at: at || new Date().toISOString(),
    errorCode,
  });
}

export function timeOutProjectTaskExecution(projectId: string, executionId: string, at?: string) {
  return transitionProjectTaskExecution(projectId, executionId, {
    type: "timeout",
    at: at || new Date().toISOString(),
  });
}

export function retryProjectTaskExecution(projectId: string, executionId: string, at?: string) {
  return transitionProjectTaskExecution(projectId, executionId, { type: "retry", at });
}
