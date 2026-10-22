import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { NexusAgentExecutionError } from "@/lib/nexus-agent-runtime";
import { getProjectRecord } from "@/lib/project-storage";
import {
  createProjectTaskExecution,
  listProjectTaskExecutions,
  ProjectTaskExecutionError,
} from "@/lib/project-task-executions";
import {
  approveSyntheticTaskScope,
  generateAIBackedTaskProposal,
  prepareSyntheticTaskProposal,
  reviewSyntheticTaskResult,
  type SyntheticTaskScope,
  type SyntheticTaskCompletionReport,
} from "@/lib/synthetic-worker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYNTHETIC_WORKFLOW_PERSISTENCE = "process_local" as const;

function responseForError(error: unknown) {
  if (error instanceof ProjectTaskExecutionError) {
    const status = error.code === "invalid" ? 400
      : error.code === "not_found" ? 404
        : error.code === "duplicate" || error.code === "conflict" ? 409
          : 503;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
  console.error("Project task execution request failed", error);
  return NextResponse.json(
    { success: false, error: "Project task execution storage is unavailable." },
    { status: 503 }
  );
}

export async function GET(request: NextRequest) {
  if (!getAdminFromRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const projectId = new URL(request.url).searchParams.get("projectId")?.trim();
  const taskId = new URL(request.url).searchParams.get("taskId")?.trim();
  if (!projectId || projectId.length > 100 || (taskId && taskId.length > 100)) {
    return NextResponse.json({ success: false, error: "A valid project ID is required." }, { status: 400 });
  }

  try {
    const project = await getProjectRecord(projectId);
    if (!project) return NextResponse.json({ success: false, error: "Project not found." }, { status: 404 });
    const executions = await listProjectTaskExecutions(project.id, taskId);
    return NextResponse.json(
      { success: true, executions },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return responseForError(error);
  }
}

export async function POST(request: NextRequest) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "A valid JSON request is required." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ success: false, error: "A valid task execution request is required." }, { status: 400 });
  }
  const payload = body as Record<string, unknown>;

  // Branch 1: Record an explicit authenticated-admin approval for an exact synthetic scope.
  if (payload.action === "approve_synthetic_scope") {
    const scopeBase = payload.scope as Omit<SyntheticTaskScope, "approval"> | undefined;
    if (!scopeBase || typeof scopeBase !== "object") {
      return NextResponse.json({ success: false, error: "A synthetic task scope is required for approval." }, { status: 400 });
    }
    try {
      const scope = approveSyntheticTaskScope(scopeBase, admin.email);
      return NextResponse.json(
        { success: true, scope, persistenceMode: SYNTHETIC_WORKFLOW_PERSISTENCE },
        { headers: { "Cache-Control": "private, no-store" } }
      );
    } catch (err: unknown) {
      return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
    }
  }

  // Branch 2: Gemini-backed proposal; it does not execute task code.
  if (payload.action === "generate_ai_proposal") {
    const limit = checkRateLimit(`task_proposal_${admin.email.toLowerCase()}`, 3, 10 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json(
        { success: false, providerMode: "gemini", error: `Too many proposal requests. Try again in ${limit.resetInSec} seconds.` },
        { status: 429, headers: { "Cache-Control": "no-store" } }
      );
    }
    const scope = payload.scope as SyntheticTaskScope | undefined;
    const taskDescription = payload.taskDescription;
    if (!scope || typeof scope !== "object" ||
        typeof taskDescription !== "string" || taskDescription.length > 1200) {
      return NextResponse.json({ success: false, error: "A valid approved scope and task description are required." }, { status: 400 });
    }
    const apiKey = process.env.NEXUS_GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { success: false, providerMode: "gemini", error: "The server-side AI provider is not configured." },
        { status: 503, headers: { "Cache-Control": "no-store" } }
      );
    }
    try {
      const report = await generateAIBackedTaskProposal({
        scope,
        taskDescription,
        adminUser: admin.email,
        apiKey,
      });
      return NextResponse.json(
        { success: true, providerMode: "gemini", report, persistenceMode: SYNTHETIC_WORKFLOW_PERSISTENCE },
        { headers: { "Cache-Control": "private, no-store" } }
      );
    } catch (error) {
      if (error instanceof NexusAgentExecutionError) {
        const status = error.code === "configuration" ? 503
          : error.code === "invalid_output" ? 422
            : 502;
        const diagnostics = error.providerDiagnostics
          ? { providerDiagnostics: error.providerDiagnostics }
          : {};
        return NextResponse.json(
          { success: false, providerMode: "gemini", error: error.message, ...diagnostics },
          { status, headers: { "Cache-Control": "no-store" } }
        );
      }
      console.error("AI task proposal failed.");
      return NextResponse.json(
        { success: false, providerMode: "gemini", error: "The AI proposal could not be generated." },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      );
    }
  }

  // Branch 3: Deterministic text-only mock; it does not execute task code.
  if (payload.action === "prepare_synthetic_proposal") {
    const scope = payload.scope as SyntheticTaskScope | undefined;
    const requestedOperation = payload.operation as { path: string; operation: "create" | "modify"; content: string } | undefined;
    if (!scope || typeof scope !== "object" || !requestedOperation || typeof requestedOperation !== "object") {
      return NextResponse.json({ success: false, error: "Valid scope and operation are required for a synthetic proposal." }, { status: 400 });
    }

    try {
      const report = await prepareSyntheticTaskProposal({
        scope,
        requestedOperation,
        adminUser: admin.email,
      });

      return NextResponse.json(
        { success: true, providerMode: "deterministic_mock", report, persistenceMode: SYNTHETIC_WORKFLOW_PERSISTENCE },
        { status: report.status === "simulated" ? 200 : 422, headers: { "Cache-Control": "private, no-store" } }
      );
    } catch (err: unknown) {
      return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
    }
  }

  // Branch 4: Synthetic human review
  if (payload.action === "review_synthetic") {
    const report = payload.report as SyntheticTaskCompletionReport | undefined;
    const decision = payload.decision as "accepted" | "rejected" | undefined;
    const rationale = payload.rationale as string | undefined;

    if (!report || !decision || !["accepted", "rejected"].includes(decision) || typeof rationale !== "string" || !rationale.trim()) {
      return NextResponse.json({ success: false, error: "Valid report, decision ('accepted' | 'rejected'), and rationale are required." }, { status: 400 });
    }

    try {
      const reviewed = reviewSyntheticTaskResult(report, admin.email, decision, rationale);
      return NextResponse.json(
        { success: true, report: reviewed, persistenceMode: SYNTHETIC_WORKFLOW_PERSISTENCE },
        { headers: { "Cache-Control": "private, no-store" } }
      );
    } catch (err: unknown) {
      return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
    }
  }

  // Branch 5: Standard pending execution creation (existing behavior)
  const { projectId, taskId, idempotencyKey } = payload;
  if (typeof projectId !== "string" || projectId.trim().length < 1 || projectId.length > 100 ||
      typeof taskId !== "string" || taskId.length > 100 ||
      typeof idempotencyKey !== "string" || idempotencyKey.length > 128) {
    return NextResponse.json({ success: false, error: "Project ID, task ID, and idempotency key are required." }, { status: 400 });
  }

  try {
    const project = await getProjectRecord(projectId.trim());
    if (!project) return NextResponse.json({ success: false, error: "Project not found." }, { status: 404 });
    const result = await createProjectTaskExecution(project, taskId, idempotencyKey);
    return NextResponse.json(
      { success: true, created: result.created, execution: result.record },
      { status: result.created ? 201 : 200, headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return responseForError(error);
  }
}
