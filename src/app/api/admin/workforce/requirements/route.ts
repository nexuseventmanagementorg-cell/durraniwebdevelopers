import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAdminFromCookies } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import {
  NexusAgentExecutionError,
  REQUIREMENTS_ANALYST,
  runRequirementsAnalyst,
} from "@/lib/nexus-agent-runtime";
import {
  createNexusAgentRun,
  getNexusAgentRunByRequest,
  listNexusAgentRunsForAdmin,
  NexusAgentStorageError,
  updateNexusAgentRun,
} from "@/lib/nexus-agent-storage";

export const runtime = "nodejs";
export const maxDuration = 50;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateGoal(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const goal = value.trim();
  if (
    goal.length < 10 ||
    goal.length > 1200 ||
    /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|(?:\+?\d[\s().-]*){9,}/.test(goal)
  ) return null;
  return goal;
}

function statusForExistingRun(status: string): number {
  return status === "completed" ? 200 : status === "failed" ? 502 : 409;
}

export async function GET() {
  const admin = getAdminFromCookies();
  if (!admin) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const runs = await listNexusAgentRunsForAdmin(admin.email);
    return NextResponse.json(
      { success: true, runs },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    const message = error instanceof NexusAgentStorageError
      ? error.message
      : "Agent run history could not be loaded.";
    return NextResponse.json({ success: false, error: message }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const admin = getAdminFromCookies();
  if (!admin) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const ip = request.ip || request.headers.get("x-forwarded-for") || "admin";
  const limit = checkRateLimit(`requirements_agent_${ip}`, 3, 10 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, error: `Too many agent runs. Try again in ${limit.resetInSec} seconds.` },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "A valid JSON request is required." }, { status: 400 });
  }
  const goal = isRecord(body) ? validateGoal(body.goal) : null;
  const requestId = isRecord(body) && typeof body.requestId === "string" ? body.requestId : "";
  if (!goal || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
    return NextResponse.json(
      { success: false, error: "Enter a project brief of 10–1200 characters and a valid request ID. Do not include personal or confidential information." },
      { status: 400 }
    );
  }

  const apiKey = process.env.NEXUS_GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: "The server-side NEXUS_GEMINI_API_KEY is not configured." },
      { status: 503 }
    );
  }

  let modelRequestStarted = false;
  try {
    let existing = await getNexusAgentRunByRequest(admin.email, requestId);
    if (existing) {
      return NextResponse.json(
        { success: existing.status === "completed", run: existing },
        { status: statusForExistingRun(existing.status), headers: { "Cache-Control": "private, no-store" } }
      );
    }

    const runId = randomUUID();
    try {
      await createNexusAgentRun({
        id: runId,
        requestId,
        createdBy: admin.email,
        goal,
        agentId: REQUIREMENTS_ANALYST.id,
        agentVersion: REQUIREMENTS_ANALYST.version,
      });
    } catch (error) {
      if (!(error instanceof NexusAgentStorageError) || error.code !== "duplicate") {
        throw error;
      }
      existing = await getNexusAgentRunByRequest(admin.email, requestId);
      if (!existing) throw error;
      return NextResponse.json(
        { success: existing.status === "completed", run: existing },
        { status: statusForExistingRun(existing.status), headers: { "Cache-Control": "private, no-store" } }
      );
    }

    await updateNexusAgentRun(runId, {
      status: "running",
      attempt_count: REQUIREMENTS_ANALYST.maxAttempts,
      started_at: new Date().toISOString(),
    });

    try {
      modelRequestStarted = true;
      const result = await runRequirementsAnalyst(goal, apiKey, fetch);
      await updateNexusAgentRun(runId, {
        status: "completed",
        result,
        error_code: null,
        completed_at: new Date().toISOString(),
      });
      return NextResponse.json(
        { success: true, run: { id: runId, status: "completed", result } },
        { status: 201, headers: { "Cache-Control": "private, no-store" } }
      );
    } catch (error) {
      const errorCode = error instanceof NexusAgentExecutionError ? error.code : "internal";
      await updateNexusAgentRun(runId, {
        status: "failed",
        error_code: errorCode,
        completed_at: new Date().toISOString(),
      });
      const message = error instanceof NexusAgentExecutionError
        ? error.message
        : "The agent run failed. No retry was attempted.";
      return NextResponse.json(
        { success: false, runId, error: message },
        { status: errorCode === "configuration" ? 503 : 502, headers: { "Cache-Control": "no-store" } }
      );
    }
  } catch (error) {
    const message = modelRequestStarted
      ? "Agent execution may have completed, but its final state could not be saved. Check admin run history before retrying."
      : error instanceof NexusAgentStorageError
        ? error.message
        : "Agent run could not be persisted. No model request was started.";
    return NextResponse.json({ success: false, error: message }, { status: 503 });
  }
}
