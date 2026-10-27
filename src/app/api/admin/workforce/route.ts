import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { getAdminFromRequest } from "@/lib/auth";
import { checkOllamaModel, listOllamaModels, OllamaProviderError } from "@/lib/ollama-provider";
import { getWorkforceStorageRoot } from "@/lib/workforce-storage";
import { readAgentReadiness } from "@/lib/workforce-agent-readiness";
import {
  controlWorkforceBatch,
  enqueueDailyBatch,
  getWorkforceRoleRegistry,
  isLocalWorkforceEnabled,
  readWorkforceState,
  retryWorkforceBatch,
  setWorkforceConcurrency,
  setWorkforceModel,
  setWorkforceSchedule,
  WorkforceStateError,
} from "@/lib/workforce-pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INQUIRY_TASK_IDS = [
  "fashion-ux-designer",
  "ecommerce-architect",
  "storefront-coder",
  "admin-dashboard-coder",
  "qa-reviewer",
] as const;
const INQUIRY_TASK_STATUSES = ["waiting", "running", "completed", "failed"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function readInquiryAgentRun() {
  const projectDirectory = join(getWorkforceStorageRoot(), "projects", "DW-944529-ahlam-collections-preview");
  let latestContent: string;
  try {
    latestContent = await readFile(join(projectDirectory, "latest-agent-run.json"), "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return null;
    throw error;
  }

  const latest: unknown = JSON.parse(latestContent);
  if (!isRecord(latest) || typeof latest.runId !== "string" ||
      !/^agent-build-[\dT-]+Z(?:-\d+)?$/.test(latest.runId) ||
      !["running", "completed", "failed"].includes(String(latest.status))) {
    throw new Error("The latest inquiry agent run record is invalid.");
  }

  let runContent: string;
  try {
    runContent = await readFile(join(projectDirectory, "agent-generated-store", latest.runId, "agent-run.json"), "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return null;
    throw error;
  }
  const run: unknown = JSON.parse(runContent);
  if (!isRecord(run) || run.runId !== latest.runId || !Array.isArray(run.tasks) ||
      !isRecord(run.qa) || typeof run.qa.passed !== "number" || typeof run.qa.failed !== "number") {
    throw new Error("The inquiry agent task record is invalid.");
  }
  const tasks = run.tasks.map((task: unknown) => {
    if (!isRecord(task) || typeof task.id !== "string" ||
        !(INQUIRY_TASK_IDS as readonly string[]).includes(task.id) ||
        typeof task.role !== "string" ||
        !(INQUIRY_TASK_STATUSES as readonly string[]).includes(String(task.status))) {
      throw new Error("The inquiry agent task record contains an invalid task.");
    }
    return {
      id: task.id,
      role: task.role.slice(0, 80),
      status: task.status,
      model: typeof task.model === "string" ? task.model.slice(0, 120) : null,
      startedAt: typeof task.startedAt === "string" ? task.startedAt : null,
      completedAt: typeof task.completedAt === "string" ? task.completedAt : null,
      summary: typeof task.summary === "string" ? task.summary.slice(0, 400) : null,
      error: typeof task.error === "string" ? task.error.slice(0, 400) : null,
    };
  });
  if (tasks.length !== INQUIRY_TASK_IDS.length) throw new Error("The inquiry agent task record is incomplete.");
  return {
    runId: latest.runId,
    status: latest.status,
    updatedAt: typeof run.updatedAt === "string" ? run.updatedAt : null,
    tasks,
    qa: { passed: run.qa.passed, failed: run.qa.failed },
    prototypeDisclaimer: typeof run.prototypeDisclaimer === "string"
      ? run.prototypeDisclaimer.slice(0, 400)
      : "Local review prototype only; production integrations are not enabled.",
  };
}

function karachiDate(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function errorResponse(error: unknown) {
  if (error instanceof WorkforceStateError) {
    const status = error.message.includes("disabled on Vercel") ? 503
      : error.message.includes("not found") ? 404
        : error.message.includes("cannot be") || error.message.includes("Only failed") ? 409
          : 400;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
  if (error instanceof OllamaProviderError) {
    return NextResponse.json({ success: false, error: error.message }, {
      status: error.code === "invalid_configuration" ? 400 : 503,
    });
  }
  console.error("Local workforce request failed", error);
  return NextResponse.json({ success: false, error: "The local workforce request could not be completed." }, { status: 500 });
}

export async function GET(request: NextRequest) {
  if (!getAdminFromRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!isLocalWorkforceEnabled()) {
    return NextResponse.json({
      success: false,
      localOnly: true,
      storageDirectory: getWorkforceStorageRoot(),
      error: "The workforce runs on the local Windows PC; Vercel cannot connect to its Ollama service.",
    }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }

  try {
    const [state, modelsResult, agentReadiness, inquiryAgentRun] = await Promise.all([
      readWorkforceState(),
      listOllamaModels().then((models) => ({ models, error: null as string | null }))
        .catch((error: unknown) => ({
          models: [],
          error: error instanceof OllamaProviderError
            ? error.message
            : "Could not read the local Ollama model list.",
        })),
      readAgentReadiness(),
      readInquiryAgentRun(),
    ]);
    let modelReady = false;
    let modelError: string | null = null;
    if (state.settings.model && modelsResult.models.some((model) => model.name === state.settings.model)) {
      try {
        await checkOllamaModel(state.settings.model);
        modelReady = true;
      } catch (error) {
        modelError = error instanceof OllamaProviderError ? error.message : "The selected Ollama model is not ready.";
      }
    } else if (state.settings.model) {
      modelError = "The selected model is no longer installed.";
    }
    return NextResponse.json({
      success: true,
      localOnly: true,
      provider: {
        name: "Ollama",
        available: modelsResult.error === null,
        baseUrl: process.env.OLLAMA_BASE_URL?.trim() || "http://127.0.0.1:11434",
        models: modelsResult.models,
        error: modelsResult.error,
        selectedModelReady: modelReady,
        modelError,
        lastSuccessfulAt: state.provider.lastSuccessfulAt,
        lastSuccessfulModel: state.provider.lastModel,
        lastError: state.provider.lastError,
      },
      settings: state.settings,
      registry: getWorkforceRoleRegistry(modelsResult.models, state.batches, agentReadiness),
      batches: state.batches.slice(0, 20),
      events: state.events.slice(-50).reverse(),
      inquiryAgentRun,
      scheduleTimezone: "Asia/Karachi",
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const admin = getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (!isLocalWorkforceEnabled()) {
    return NextResponse.json({ success: false, error: "Local workforce controls are disabled on Vercel." }, { status: 503 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "A valid JSON request is required." }, { status: 400 });
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload) || !("action" in payload) || typeof payload.action !== "string") {
    return NextResponse.json({ success: false, error: "A valid workforce action is required." }, { status: 400 });
  }

  try {
    switch (payload.action) {
      case "set_model": {
        if (!("model" in payload) || typeof payload.model !== "string" || payload.model.length > 120) {
          return NextResponse.json({ success: false, error: "Choose an installed Ollama model." }, { status: 400 });
        }
        const models = await listOllamaModels();
        if (!models.some((model) => model.name === payload.model)) {
          return NextResponse.json({ success: false, error: "The selected model is not installed in Ollama." }, { status: 400 });
        }
        await checkOllamaModel(payload.model);
        await setWorkforceModel(payload.model);
        return NextResponse.json({ success: true, settings: (await readWorkforceState()).settings });
      }
      case "set_concurrency": {
        if (!("maxConcurrency" in payload) || typeof payload.maxConcurrency !== "number") {
          return NextResponse.json({ success: false, error: "Concurrency must be a number from 1 to 3." }, { status: 400 });
        }
        await setWorkforceConcurrency(payload.maxConcurrency);
        return NextResponse.json({ success: true, settings: (await readWorkforceState()).settings });
      }
      case "set_schedule": {
        const enabled = "enabled" in payload ? payload.enabled : undefined;
        const time = "time" in payload ? payload.time : undefined;
        if ((enabled !== undefined && typeof enabled !== "boolean") ||
            (time !== undefined && typeof time !== "string")) {
          return NextResponse.json({ success: false, error: "Schedule requires a boolean enabled value and/or HH:mm time." }, { status: 400 });
        }
        await setWorkforceSchedule({
          ...(enabled !== undefined ? { enabled } : {}),
          ...(time !== undefined ? { time } : {}),
        });
        return NextResponse.json({ success: true, settings: (await readWorkforceState()).settings });
      }
      case "start_today": {
        const state = await readWorkforceState();
        const model = state.settings.model || process.env.OLLAMA_MODEL?.trim() || "";
        const models = await listOllamaModels();
        if (!model || !models.some((entry) => entry.name === model)) {
          return NextResponse.json({
            success: false,
            error: "Select an installed Ollama model before starting a batch.",
          }, { status: 409 });
        }
        await checkOllamaModel(model);
        const result = await enqueueDailyBatch(karachiDate(), "manual", admin.email);
        return NextResponse.json({
          success: true,
          created: result.created,
          batch: result.batch,
          message: result.created ? "Today's batch was queued for the local worker." : "Today's batch already exists; no duplicate was created.",
        }, { status: result.created ? 202 : 200, headers: { "Cache-Control": "private, no-store" } });
      }
      case "pause":
      case "resume":
      case "cancel": {
        const batchId = "batchId" in payload && typeof payload.batchId === "string" ? payload.batchId : "";
        if (!batchId || batchId.length > 32) {
          return NextResponse.json({ success: false, error: "A valid batch ID is required." }, { status: 400 });
        }
        const batch = await controlWorkforceBatch(batchId, payload.action);
        return NextResponse.json({ success: true, batch });
      }
      case "retry": {
        const batchId = "batchId" in payload && typeof payload.batchId === "string" ? payload.batchId : "";
        if (!batchId || batchId.length > 32) {
          return NextResponse.json({ success: false, error: "A valid batch ID is required." }, { status: 400 });
        }
        const batch = await retryWorkforceBatch(batchId);
        return NextResponse.json({ success: true, batch, message: "Failed batch was queued for a bounded retry." }, { status: 202 });
      }
      default:
        return NextResponse.json({ success: false, error: "Unsupported workforce action." }, { status: 400 });
    }
  } catch (error) {
    return errorResponse(error);
  }
}
