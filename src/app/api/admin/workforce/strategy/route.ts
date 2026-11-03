import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/auth";
import { getInquiries, getInquiryById } from "@/lib/inquiry-storage";
import { generateCeoStrategy, checkOllamaModel, listOllamaModels } from "@/lib/ollama-provider";
import {
  buildCeoStrategyInput,
  hasUnreviewedCeoStrategyClaims,
  hashCeoStrategyInput,
  isCeoStrategyProjectApproved,
  isCeoStrategyAwaitingApproval,
  sanitizeCeoStrategyForReview,
} from "@/lib/ceo-strategy";
import { getProjectRecord, getProjectRecords, updateProjectRecord } from "@/lib/project-storage";
import {
  isLocalWorkforceEnabled,
  readWorkforceState,
  WorkforceStateError,
} from "@/lib/workforce-pipeline";
import type { Project } from "@/lib/types";
import type { CeoStrategyRecord } from "@/lib/ceo-strategy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getApprovedProject(projectId: string): Promise<Project> {
  if (!projectId.trim() || projectId.length > 100) {
    throw new WorkforceStateError("A valid project ID is required.");
  }
  const project = await getProjectRecord(projectId);
  if (!project) throw new WorkforceStateError("The requested project was not found.");
  if (!project.inquiryId) {
    throw new WorkforceStateError("CEO strategy requires a customer inquiry converted through the approved inquiry workflow.");
  }
  const inquiry = await getInquiryById(project.inquiryId);
  if (!isCeoStrategyProjectApproved(project, inquiry)) {
    throw new WorkforceStateError("Commercial approval and verified advance are required before CEO strategy.");
  }
  return project;
}

function responseForError(error: unknown) {
  if (error instanceof WorkforceStateError) {
    const status = error.message.includes("not found") ? 404 : 409;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
  if (error instanceof TypeError) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
  console.error("CEO strategy request failed", error);
  return NextResponse.json(
    { success: false, error: "The CEO strategy request could not be completed." },
    { status: 503 }
  );
}

export async function GET(request: NextRequest) {
  const admin = getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    const [projects, inquiries] = await Promise.all([getProjectRecords(), getInquiries()]);
    const inquiryById = new Map(inquiries.map((inquiry) => [inquiry.id, inquiry]));
    const eligibleProjects = projects
      .filter((project) => project.inquiryId && isCeoStrategyProjectApproved(project, inquiryById.get(project.inquiryId)))
      .slice(0, 100)
      .map((project) => ({
        id: project.id,
        name: project.name,
        category: project.category,
        status: project.status,
        strategy: project.ceoStrategy ? sanitizeCeoStrategyForReview(project.ceoStrategy) : null,
        strategyHistoryCount: project.ceoStrategyHistory?.length || 0,
      }));
    return NextResponse.json(
      { success: true, projects: eligibleProjects },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return responseForError(error);
  }
}

export async function POST(request: NextRequest) {
  const admin = getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (!isLocalWorkforceEnabled()) {
    return NextResponse.json(
      { success: false, localOnly: true, error: "CEO strategy generation requires the authorized local workforce host." },
      { status: 503 }
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "A valid JSON request is required." }, { status: 400 });
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload) ||
      !("projectId" in payload) || typeof payload.projectId !== "string") {
    return NextResponse.json({ success: false, error: "A valid approved project ID is required." }, { status: 400 });
  }
  if ("authorizedAttachments" in payload) {
    return NextResponse.json(
      { success: false, error: "Client-supplied attachment content cannot be verified or used as strategy evidence." },
      { status: 400 }
    );
  }

  try {
    const project = await getApprovedProject(payload.projectId);
    if (project.ceoStrategy?.status === "approved") {
      return NextResponse.json(
        { success: false, error: "An approved strategy cannot be replaced. Review or reopen it through an explicit human workflow." },
        { status: 409 }
      );
    }
    const inquiry = await getInquiryById(project.inquiryId!);
    if (!inquiry) throw new WorkforceStateError("The approved source inquiry could not be loaded.");
    const input = buildCeoStrategyInput(project, inquiry);
    const state = await readWorkforceState();
    const model = state.settings.model || process.env.OLLAMA_MODEL?.trim() || "";
    if (!model) {
      return NextResponse.json({ success: false, error: "Select an installed local Ollama model before generating strategy." }, { status: 409 });
    }
    const models = await listOllamaModels();
    if (!models.some((entry) => entry.name === model)) {
      return NextResponse.json({ success: false, error: "The selected local Ollama model is not installed." }, { status: 503 });
    }
    await checkOllamaModel(model);
    const plan = await generateCeoStrategy(model, input);
    const now = new Date().toISOString();
    const strategy: CeoStrategyRecord = {
      status: "awaiting_human_approval",
      generatedAt: now,
      generatedBy: "local_ollama",
      model,
      sourceHash: hashCeoStrategyInput(input),
      plan,
      approval: null,
    };
    const updated = await updateProjectRecord(project.id, {
      ceoStrategyHistory: [
        ...(project.ceoStrategyHistory || []),
        ...(project.ceoStrategy ? [project.ceoStrategy] : []),
      ].slice(-19),
      ceoStrategy: strategy,
    });
    if (!updated) throw new WorkforceStateError("The approved project was not found while saving strategy.");
    return NextResponse.json(
      { success: true, projectId: project.id, strategy },
      { status: 201, headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return responseForError(error);
  }
}

export async function PATCH(request: NextRequest) {
  const admin = getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "A valid JSON request is required." }, { status: 400 });
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload) ||
      !("projectId" in payload) || typeof payload.projectId !== "string") {
    return NextResponse.json({ success: false, error: "A valid project ID is required." }, { status: 400 });
  }

  try {
    const project = await getApprovedProject(payload.projectId);
    const current = project.ceoStrategy;
    if (!isCeoStrategyAwaitingApproval(current)) {
      return NextResponse.json({ success: false, error: "Only a pending CEO strategy can receive human approval." }, { status: 409 });
    }
    if (hasUnreviewedCeoStrategyClaims(current.plan)) {
      return NextResponse.json(
        { success: false, error: "This stored strategy contains legacy model verification or completion claims. Generate a fresh strategy before approval." },
        { status: 409 }
      );
    }
    const inquiry = await getInquiryById(project.inquiryId!);
    if (!inquiry) throw new WorkforceStateError("The approved source inquiry could not be loaded.");
    const input = buildCeoStrategyInput(project, inquiry);
    if (hashCeoStrategyInput(input) !== current.sourceHash) {
      return NextResponse.json(
        { success: false, error: "The approved project scope changed after strategy generation. Generate a fresh strategy before approving." },
        { status: 409 }
      );
    }
    const now = new Date().toISOString();
    const approved: CeoStrategyRecord = {
      ...current,
      status: "approved",
      approval: { approvedBy: admin.email, approvedAt: now },
    };
    const updated = await updateProjectRecord(project.id, { ceoStrategy: approved });
    if (!updated) throw new WorkforceStateError("The approved project was not found while saving strategy approval.");
    return NextResponse.json(
      { success: true, projectId: project.id, strategy: approved },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return responseForError(error);
  }
}
