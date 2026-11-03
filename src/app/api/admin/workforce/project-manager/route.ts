import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/auth";
import { getInquiryById } from "@/lib/inquiry-storage";
import { getProjectRecord, updateProjectRecord } from "@/lib/project-storage";
import {
  approveProjectManagerPlan,
  buildProjectManagerPlan,
  isProjectManagerStrategyCurrent,
  ProjectManagerValidationError,
  validateProjectManagerPlan,
} from "@/lib/project-manager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function responseForError(error: unknown) {
  if (error instanceof ProjectManagerValidationError) {
    return NextResponse.json({ success: false, error: error.message }, { status: 409 });
  }
  console.error("Project Manager request failed", error);
  return NextResponse.json(
    { success: false, error: "Project Manager planning could not be completed." },
    { status: 503 }
  );
}

async function getApprovedProject(projectId: string) {
  if (!projectId.trim() || projectId.length > 100) {
    throw new ProjectManagerValidationError("A valid project ID is required.");
  }
  const project = await getProjectRecord(projectId);
  if (!project) throw new ProjectManagerValidationError("The requested project was not found.");
  if (!project.inquiryId) {
    throw new ProjectManagerValidationError("Project Manager planning requires a converted customer inquiry.");
  }
  const inquiry = await getInquiryById(project.inquiryId);
  if (!inquiry) throw new ProjectManagerValidationError("The approved source inquiry could not be loaded.");
  return { project, inquiry };
}

export async function GET(request: NextRequest) {
  if (!getAdminFromRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const projectId = new URL(request.url).searchParams.get("projectId")?.trim() || "";
  try {
    const { project, inquiry } = await getApprovedProject(projectId);
    const plan = project.projectManagerPlan || null;
    if (plan) validateProjectManagerPlan(plan, project.id);
    const current = Boolean(plan && isProjectManagerStrategyCurrent(project, inquiry, plan));
    return NextResponse.json(
      { success: true, projectId, plan, sourceStrategyApproved: project.ceoStrategy?.status === "approved", current },
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
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "A valid JSON request is required." }, { status: 400 });
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload) ||
      !("projectId" in payload) || typeof payload.projectId !== "string" ||
      Object.keys(payload).some((key) => key !== "projectId")) {
    return NextResponse.json({ success: false, error: "Only a project ID is accepted; plans and assignments are generated server-side." }, { status: 400 });
  }
  try {
    const { project, inquiry } = await getApprovedProject(payload.projectId);
    const plan = buildProjectManagerPlan(project, inquiry);
    const history = project.projectManagerPlanHistory || [];
    if (project.projectManagerPlan?.status === "APPROVED" &&
        isProjectManagerStrategyCurrent(project, inquiry, project.projectManagerPlan)) {
      return NextResponse.json({ success: false, error: "An approved Project Manager plan cannot be replaced." }, { status: 409 });
    }
    const updated = await updateProjectRecord(project.id, {
      projectManagerPlan: plan,
      projectManagerPlanHistory: [
        ...history,
        ...(project.projectManagerPlan ? [project.projectManagerPlan] : []),
      ].slice(-19),
    });
    if (!updated) throw new ProjectManagerValidationError("The project workspace was not found while saving the plan.");
    return NextResponse.json(
      { success: true, projectId: project.id, plan: updated.projectManagerPlan },
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
      !("planId" in payload) || typeof payload.planId !== "string" ||
      Object.keys(payload).some((key) => !["projectId", "planId"].includes(key))) {
    return NextResponse.json({ success: false, error: "A project ID and plan ID are required." }, { status: 400 });
  }
  try {
    const { project, inquiry } = await getApprovedProject(payload.projectId);
    const current = project.projectManagerPlan;
    if (!current || current.id !== payload.planId) {
      return NextResponse.json({ success: false, error: "The requested Project Manager plan is not current." }, { status: 409 });
    }
    validateProjectManagerPlan(current, project.id);
    if (!isProjectManagerStrategyCurrent(project, inquiry, current)) {
      return NextResponse.json({ success: false, error: "The approved CEO strategy changed; regenerate the Project Manager plan." }, { status: 409 });
    }
    const approved = approveProjectManagerPlan(current, project.id, admin.email);
    const updated = await updateProjectRecord(project.id, { projectManagerPlan: approved });
    if (!updated) throw new ProjectManagerValidationError("The project workspace was not found while saving plan approval.");
    return NextResponse.json(
      { success: true, projectId: project.id, plan: updated.projectManagerPlan },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return responseForError(error);
  }
}
