import { getPaymentSupabase, hasPaymentSupabaseConfiguration } from "@/lib/payment-server";
import type { RequirementsAgentResult } from "@/lib/nexus-agent-runtime";

export type NexusAgentRunStatus = "queued" | "running" | "completed" | "failed";

export interface NexusAgentRunRecord {
  id: string;
  request_id: string;
  created_by: string;
  agent_id: string;
  agent_version: string;
  goal: string;
  status: NexusAgentRunStatus;
  attempt_count: number;
  result: RequirementsAgentResult | null;
  error_code: string | null;
  created_at: string;
  updated_at: string;
}

export class NexusAgentStorageError extends Error {
  constructor(message: string, readonly code?: "duplicate" | "storage") {
    super(message);
    this.name = "NexusAgentStorageError";
  }
}

function requireAgentStorage(): void {
  if (!hasPaymentSupabaseConfiguration()) {
    throw new NexusAgentStorageError("Agent job storage requires the server-side Supabase configuration.");
  }
}

function explainStorageError(code?: string): NexusAgentStorageError {
  if (code === "42P01" || code === "PGRST205") {
    return new NexusAgentStorageError(
      "Agent job storage is not installed. Apply supabase/agent-workforce.sql after review.",
      "storage"
    );
  }
  return new NexusAgentStorageError(
    "Agent job storage is unavailable. Check Supabase connectivity and service-role permissions.",
    "storage"
  );
}

export async function createNexusAgentRun(input: {
  id: string;
  requestId: string;
  createdBy: string;
  goal: string;
  agentId: string;
  agentVersion: string;
}): Promise<void> {
  requireAgentStorage();
  const { error } = await getPaymentSupabase().from("agent_runs").insert({
    id: input.id,
    request_id: input.requestId,
    created_by: input.createdBy,
    goal: input.goal,
    agent_id: input.agentId,
    agent_version: input.agentVersion,
    status: "queued",
    attempt_count: 0,
  });
  if (error) {
    if (error.code === "23505") {
      throw new NexusAgentStorageError("A run with this request ID already exists.", "duplicate");
    }
    throw explainStorageError(error.code);
  }
}

export async function getNexusAgentRunByRequest(
  createdBy: string,
  requestId: string
): Promise<NexusAgentRunRecord | null> {
  requireAgentStorage();
  const { data, error } = await getPaymentSupabase()
    .from("agent_runs")
    .select("*")
    .eq("created_by", createdBy)
    .eq("request_id", requestId)
    .maybeSingle();
  if (error) throw explainStorageError(error.code);
  return data as NexusAgentRunRecord | null;
}

export async function updateNexusAgentRun(
  id: string,
  updates: {
    status: NexusAgentRunStatus;
    attempt_count?: number;
    result?: RequirementsAgentResult | null;
    error_code?: string | null;
    started_at?: string;
    completed_at?: string;
  }
): Promise<void> {
  requireAgentStorage();
  const { error } = await getPaymentSupabase()
    .from("agent_runs")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw explainStorageError(error.code);
}

export async function listNexusAgentRunsForAdmin(
  createdBy: string,
  limit = 10
): Promise<NexusAgentRunRecord[]> {
  requireAgentStorage();
  const { data, error } = await getPaymentSupabase()
    .from("agent_runs")
    .select("*")
    .eq("created_by", createdBy)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw explainStorageError(error.code);
  return (data || []) as NexusAgentRunRecord[];
}

export async function getLatestPublicNexusAgentRun(): Promise<Pick<
  NexusAgentRunRecord,
  "id" | "status" | "created_at" | "updated_at"
> | null> {
  requireAgentStorage();
  const { data, error } = await getPaymentSupabase()
    .from("agent_runs")
    .select("id,status,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw explainStorageError(error.code);
  return data;
}
