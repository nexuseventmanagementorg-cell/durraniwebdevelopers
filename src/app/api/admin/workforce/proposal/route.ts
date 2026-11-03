import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/auth";
import { getInquiryById } from "@/lib/inquiry-storage";
import { getProjectRecord, updateProjectRecord } from "@/lib/project-storage";
import {
  approveProposal,
  buildProposalInput,
  generateProposalDraft,
  isProposalCurrent,
  PROPOSAL_HISTORY_LIMIT,
  ProposalValidationError,
  reviewProposal,
  validateProposalRecord,
  type ProposalRecord,
} from "@/lib/proposal-writer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function responseForError(error: unknown) {
  if (error instanceof ProposalValidationError) {
    return NextResponse.json({ success: false, error: error.message }, { status: 409 });
  }
  console.error("Proposal Writer request failed", error);
  return NextResponse.json(
    { success: false, error: "The proposal workflow could not be completed." },
    { status: 503 }
  );
}

async function loadProject(projectId: string) {
  if (!projectId.trim() || projectId.length > 100) {
    throw new ProposalValidationError("A valid project ID is required.");
  }
  const project = await getProjectRecord(projectId);
  if (!project) throw new ProposalValidationError("The requested project was not found.");
  if (!project.inquiryId) {
    throw new ProposalValidationError("Proposal drafting requires a project converted from an approved inquiry.");
  }
  const inquiry = await getInquiryById(project.inquiryId);
  if (!inquiry) throw new ProposalValidationError("The project's source inquiry could not be loaded.");
  return { project, inquiry };
}

function validateSavedProposal(projectId: string, proposal: ProposalRecord | null | undefined): asserts proposal is ProposalRecord | null | undefined {
  if (proposal) validateProposalRecord(proposal, projectId);
}

function validateProposalHistory(projectId: string, value: unknown): ProposalRecord[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length >= PROPOSAL_HISTORY_LIMIT) {
    throw new ProposalValidationError("The saved proposal history exceeds its supported bound or is malformed.");
  }
  const ids = new Set<string>();
  let previousVersion = 0;
  for (const item of value) {
    validateProposalRecord(item, projectId);
    if (ids.has(item.id) || item.version <= previousVersion) {
      throw new ProposalValidationError("The saved proposal history contains duplicate or out-of-order versions.");
    }
    ids.add(item.id);
    previousVersion = item.version;
  }
  return value;
}

export async function GET(request: NextRequest) {
  if (!getAdminFromRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const projectId = new URL(request.url).searchParams.get("projectId")?.trim() || "";
  try {
    const { project, inquiry } = await loadProject(projectId);
    const proposal = project.proposal || null;
    validateSavedProposal(project.id, proposal);
    const history = validateProposalHistory(project.id, project.proposalHistory);
    if (proposal && history.some((item) => item.id === proposal.id || item.version >= proposal.version)) {
      throw new ProposalValidationError("The current proposal version conflicts with its saved history.");
    }
    let eligible = false;
    let blocker: string | null = null;
    try {
      buildProposalInput(project, inquiry);
      eligible = true;
    } catch (error) {
      if (!(error instanceof ProposalValidationError)) throw error;
      blocker = error.message;
    }
    return NextResponse.json(
      {
        success: true,
        projectId: project.id,
        proposal,
        history,
        eligible,
        blocker,
        current: Boolean(proposal && isProposalCurrent(proposal, project, inquiry)),
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return responseForError(error);
  }
}

export async function POST(request: NextRequest) {
  if (!getAdminFromRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "A valid JSON request is required." }, { status: 400 });
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload) ||
      !("projectId" in payload) || typeof payload.projectId !== "string" ||
      Object.keys(payload).some((key) => key !== "projectId")) {
    return NextResponse.json(
      { success: false, error: "Only a project ID is accepted; authorized proposal sources are loaded server-side." },
      { status: 400 }
    );
  }
  try {
    const { project, inquiry } = await loadProject(payload.projectId);
    const previous = project.proposal || null;
    validateSavedProposal(project.id, previous);
    const history = validateProposalHistory(project.id, project.proposalHistory);
    if (previous && history.some((item) => item.id === previous.id || item.version >= previous.version)) {
      throw new ProposalValidationError("The current proposal version conflicts with its saved history.");
    }
    if (previous?.status === "APPROVED_FOR_CUSTOMER" && isProposalCurrent(previous, project, inquiry)) {
      return NextResponse.json(
        { success: false, error: "A current approved proposal version cannot be replaced." },
        { status: 409 }
      );
    }
    const input = buildProposalInput(project, inquiry);
    const version = Math.max(0, ...history.map((item) => item.version), previous?.version || 0) + 1;
    const proposal = generateProposalDraft(input, version);
    const updated = await updateProjectRecord(project.id, {
      proposal,
      proposalHistory: [...history, ...(previous ? [previous] : [])].slice(-(PROPOSAL_HISTORY_LIMIT - 1)),
    });
    if (!updated) throw new ProposalValidationError("The project workspace was not found while saving the proposal.");
    return NextResponse.json(
      { success: true, projectId: project.id, proposal: updated.proposal, history: updated.proposalHistory || [] },
      { status: 201, headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return responseForError(error);
  }
}

export async function PATCH(request: NextRequest) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "A valid JSON request is required." }, { status: 400 });
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload) ||
      !("projectId" in payload) || typeof payload.projectId !== "string" ||
      !("proposalId" in payload) || typeof payload.proposalId !== "string" ||
      !("action" in payload) || !["review", "approve"].includes(String(payload.action))) {
    return NextResponse.json(
      { success: false, error: "A project ID, proposal ID, and supported human-review action are required." },
      { status: 400 }
    );
  }
  const action = payload.action;
  const openItemsAcknowledged = "openItemsAcknowledged" in payload
    ? payload.openItemsAcknowledged
    : undefined;
  const expectedKeys = action === "review"
    ? ["projectId", "proposalId", "action"]
    : ["projectId", "proposalId", "action", "openItemsAcknowledged"];
  if (Object.keys(payload).some((key) => !expectedKeys.includes(key)) ||
      (action === "approve" && typeof openItemsAcknowledged !== "boolean")) {
    return NextResponse.json({ success: false, error: "The proposal action contains unsupported or invalid fields." }, { status: 400 });
  }
  try {
    const { project, inquiry } = await loadProject(payload.projectId);
    const current = project.proposal;
    if (!current || current.id !== payload.proposalId) {
      return NextResponse.json({ success: false, error: "The requested proposal is not the current project version." }, { status: 409 });
    }
    validateProposalRecord(current, project.id);
    if (!isProposalCurrent(current, project, inquiry)) {
      return NextResponse.json({ success: false, error: "An approved source changed; regenerate and review a current proposal." }, { status: 409 });
    }
    const updatedProposal = action === "review"
      ? reviewProposal(current, project, inquiry, admin.email)
      : approveProposal(
          current,
          project,
          inquiry,
          admin.email,
          openItemsAcknowledged === true
        );
    const updated = await updateProjectRecord(project.id, { proposal: updatedProposal });
    if (!updated) throw new ProposalValidationError("The project workspace was not found while saving the proposal review.");
    return NextResponse.json(
      { success: true, projectId: project.id, proposal: updated.proposal },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return responseForError(error);
  }
}
