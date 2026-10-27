import { randomUUID } from "crypto";
import { mkdir, readFile, rename, rm, writeFile } from "fs/promises";
import { join } from "path";
import type { WorkforceAgentBrief } from "@/lib/ollama-provider";
import { getWorkforceStorageRoot } from "@/lib/workforce-storage";

export type AgentReadinessState = "running" | "ready" | "failed";

export interface AgentReadinessRecord {
  id: string;
  status: AgentReadinessState;
  model: string;
  updatedAt: string;
  output?: WorkforceAgentBrief;
  error?: string;
}

interface AgentReadinessFile {
  version: 1;
  agents: AgentReadinessRecord[];
}

function getStatusPath(): string {
  return join(getWorkforceStorageRoot(), "agent-readiness.json");
}

function validateAgentReadiness(value: unknown): AgentReadinessFile {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      !("version" in value) || value.version !== 1 ||
      !("agents" in value) || !Array.isArray(value.agents)) {
    throw new Error("The agent readiness file is invalid. Inspect agent-readiness.json before continuing.");
  }
  for (const agent of value.agents) {
    if (!agent || typeof agent !== "object" ||
        typeof agent.id !== "string" ||
        !["running", "ready", "failed"].includes(agent.status) ||
        typeof agent.model !== "string" ||
        typeof agent.updatedAt !== "string") {
      throw new Error("The agent readiness file contains an invalid role status.");
    }
  }
  return value as AgentReadinessFile;
}

export async function readAgentReadiness(): Promise<AgentReadinessRecord[]> {
  try {
    const raw = await readFile(getStatusPath(), "utf8");
    return validateAgentReadiness(JSON.parse(raw)).agents;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return [];
    if (error instanceof SyntaxError) {
      throw new Error("The agent readiness file contains invalid JSON and was not reset.");
    }
    throw error;
  }
}

export async function setAgentReadiness(record: Omit<AgentReadinessRecord, "updatedAt">): Promise<void> {
  const statusPath = getStatusPath();
  const directory = getWorkforceStorageRoot();
  await mkdir(directory, { recursive: true });
  const agents = await readAgentReadiness();
  const updatedAt = new Date().toISOString();
  const nextRecord: AgentReadinessRecord = { ...record, updatedAt };
  const existingIndex = agents.findIndex((agent) => agent.id === record.id);
  if (existingIndex < 0) agents.push(nextRecord);
  else agents[existingIndex] = nextRecord;

  const temporary = join(directory, `agent-readiness-${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, JSON.stringify({ version: 1, agents } satisfies AgentReadinessFile, null, 2), {
      encoding: "utf8",
      flag: "wx",
    });
    await rename(temporary, statusPath);
  } finally {
    await rm(temporary, { force: true });
  }
}
