import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/auth";
import { getInquiryById } from "@/lib/inquiry-storage";
import { getProjectRecord, updateProjectRecord } from "@/lib/project-storage";
import {
  analyzeBusinessRequirements,
  approveBusinessAnalysis,
  buildBusinessAnalysisInput,
  BusinessAnalysisValidationError,
  isBusinessAnalysisCurrent,
  requestBusinessAnalysisClarifications,
  validateBusinessAnalysisRecord,
} from "@/lib/business-analysis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function responseForError(error: unknown) {
  if (error instanceof BusinessAnalysisValidationError) {
    return NextResponse.json({ success: false, error: error.message }, { status: 409 });
  }
  console.error("Business Analyst request failed", error);
  return NextResponse.json(
    { success: false, error: "Business requirements analysis could not be completed." },
    { status: 503 }
  );
}

async function loadApprovedSources(projectId: string) {
  if (!projectId.trim() || projectId.length > 100) {
    throw new BusinessAnalysisValidationError("A valid project ID is required.");
  }
  const project = await getProjectRecord(projectId);
  if (!project) throw new BusinessAnalysisValidationError("The requested project was not found.");
  if (!project.inquiryId) {
    throw new BusinessAnalysisValidationError("Business analysis requires an approved project converted from an inquiry.");
  }
  const inquiry = await getInquiryById(project.inquiryId);
  if (!inquiry) throw new BusinessAnalysisValidationError("The approved source inquiry could not be loaded.");
  const input = buildBusinessAnalysisInput(project, inquiry);
  return { project, inquiry, input };
}

export async function GET(request: NextRequest) {
  if (!getAdminFromRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const projectId = new URL(request.url).searchParams.get("projectId")?.trim() || "";
  try {
    const { project, inquiry } = await loadApprovedSources(projectId);
    const analysis = project.businessAnalysis || null;
    if (analysis) validateBusinessAnalysisRecord(analysis, project.id);
    return NextResponse.json(
      {
        success: true,
        projectId,
        analysis,
        eligible: true,
        current: Boolean(analysis && isBusinessAnalysisCurrent(analysis, project, inquiry)),
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
      { success: false, error: "Only a project ID is accepted; authorized sources and requirements are loaded and generated server-side." },
      { status: 400 }
    );
  }
  try {
    const { project, inquiry, input } = await loadApprovedSources(payload.projectId);
    const previous = project.businessAnalysis;
    if (previous?.status === "APPROVED" && isBusinessAnalysisCurrent(previous, project, inquiry)) {
      return NextResponse.json(
        { success: false, error: "A current approved requirements baseline cannot be replaced." },
        { status: 409 }
      );
    }
    const analysis = analyzeBusinessRequirements(input);
    const history = project.businessAnalysisHistory || [];
    const updated = await updateProjectRecord(project.id, {
      businessAnalysis: analysis,
      businessAnalysisHistory: [
        ...history,
        ...(previous ? [previous] : []),
      ].slice(-19),
    });
    if (!updated) throw new BusinessAnalysisValidationError("The project workspace was not found while saving requirements.");
    return NextResponse.json(
      { success: true, projectId: project.id, analysis: updated.businessAnalysis },
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
      !("analysisId" in payload) || typeof payload.analysisId !== "string" ||
      !("action" in payload) || !["approve", "request_clarification"].includes(String(payload.action))) {
    return NextResponse.json({ success: false, error: "A project ID, analysis ID, and supported action are required." }, { status: 400 });
  }
  const action = payload.action;
  const requestedClarificationIds =
    action === "request_clarification" &&
    "clarificationIds" in payload &&
    Array.isArray(payload.clarificationIds) &&
    payload.clarificationIds.every((id) => typeof id === "string")
      ? payload.clarificationIds
      : null;
  const expectedKeys = action === "approve"
    ? ["projectId", "analysisId", "action"]
    : ["projectId", "analysisId", "action", "clarificationIds"];
  if (Object.keys(payload).some((key) => !expectedKeys.includes(key)) ||
      (action === "request_clarification" && !requestedClarificationIds)) {
    return NextResponse.json({ success: false, error: "The action contains unsupported or invalid fields." }, { status: 400 });
  }
  try {
    const { project, inquiry } = await loadApprovedSources(payload.projectId);
    const current = project.businessAnalysis;
    if (!current || current.id !== payload.analysisId) {
      return NextResponse.json({ success: false, error: "The requested Business Analyst document is not the current project analysis." }, { status: 409 });
    }
    validateBusinessAnalysisRecord(current, project.id);
    if (!isBusinessAnalysisCurrent(current, project, inquiry)) {
      return NextResponse.json({ success: false, error: "The project or inquiry source changed; regenerate and review the requirements analysis." }, { status: 409 });
    }
    const updatedAnalysis = action === "approve"
      ? approveBusinessAnalysis(current, project, inquiry, admin.email)
      : requestBusinessAnalysisClarifications(
          current,
          requestedClarificationIds || [],
          admin.email
        );
    const updated = await updateProjectRecord(project.id, { businessAnalysis: updatedAnalysis });
    if (!updated) throw new BusinessAnalysisValidationError("The project workspace was not found while saving the analysis action.");
    return NextResponse.json(
      { success: true, projectId: project.id, analysis: updated.businessAnalysis },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return responseForError(error);
  }
}
