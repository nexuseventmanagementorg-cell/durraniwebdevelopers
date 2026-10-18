import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/auth";
import { DataStore } from "@/lib/store";
import { Project, OrderStatus } from "@/lib/types";
import { getProjectRecord, getProjectRecords, saveProjectRecord, updateProjectRecord } from "@/lib/project-storage";
import { updateProjectWorkflowTask } from "@/lib/project-workflow";
import { ProjectWorkspaceStorageError } from "@/lib/project-storage";
import { buildWebsiteDraft } from "@/lib/website-draft-worker";

export async function GET(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const projects = await getProjectRecords();
    return NextResponse.json({ success: true, projects });
  } catch (error) {
    console.error("Project workspace load failed", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Project workspaces could not be loaded." },
      { status: 503 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { clientId, name, category, description, approvedPrice, advanceRequired, deliveryTimeline, deploymentUrl } = body;

    const client = DataStore.getClientById(clientId);
    if (!client) {
      return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 });
    }

    const price = Number(approvedPrice || 35000);
    const advance = Number(advanceRequired || 10000);
    const newProject: Project = {
      id: `proj-${Date.now().toString().slice(-6)}`,
      clientId: client.id,
      clientName: client.name,
      clientEmail: client.email,
      clientPhone: client.phone,
      name: name || "New Web Application",
      category: category || "Custom web application",
      description: description || "",
      approvedPrice: price,
      advanceRequired: advance,
      advanceReceived: 0,
      remainingBalance: Math.max(0, price - advance),
      status: "Approved",
      deliveryTimeline: deliveryTimeline || "3 to 4 Weeks",
      deploymentUrl: deploymentUrl || "",
      selectedFeatures: [],
      adminNotes: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveProjectRecord(newProject);
    return NextResponse.json({ success: true, project: newProject });
  } catch (error) {
    console.error("Create project error", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof ProjectWorkspaceStorageError ? error.message : "Failed to create project",
      },
      { status: error instanceof ProjectWorkspaceStorageError ? 503 : 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, status, deploymentUrl, adminNotes, deliveryTimeline, approvedPrice, automationTask, generateWebsiteDraft } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Project ID is required" }, { status: 400 });
    }

    const current = await getProjectRecord(id);
    if (!current) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    const updates: Partial<Project> = {};
    if (status) updates.status = status as OrderStatus;
    if (deploymentUrl !== undefined) updates.deploymentUrl = deploymentUrl;
    if (adminNotes !== undefined) updates.adminNotes = adminNotes;
    if (deliveryTimeline !== undefined) updates.deliveryTimeline = deliveryTimeline;
    if (generateWebsiteDraft === true) {
      const implementationTask = current.automationWorkflow?.tasks.find((task) => task.id === "implementation");
      if (!current.inquiryId || !current.projectBuildBrief || !implementationTask) {
        return NextResponse.json({ success: false, error: "A verified inquiry project and approved build brief are required." }, { status: 409 });
      }
      if (implementationTask.status !== "in_progress" && implementationTask.status !== "completed") {
        return NextResponse.json({ success: false, error: "Start the implementation workflow before generating a website concept." }, { status: 409 });
      }
      updates.websiteDraft = buildWebsiteDraft(current);
    }
    if (automationTask !== undefined) {
      if (!automationTask || typeof automationTask.taskId !== "string" ||
          !["in_progress", "completed"].includes(automationTask.status)) {
        return NextResponse.json({ success: false, error: "A valid workflow task update is required." }, { status: 400 });
      }
      if (!current.automationWorkflow) {
        return NextResponse.json({ success: false, error: "This project has no automation workflow." }, { status: 409 });
      }
      const workflow = updateProjectWorkflowTask(
        current.automationWorkflow,
        automationTask.taskId,
        automationTask.status
      );
      if (!workflow) {
        return NextResponse.json({ success: false, error: "Complete the prerequisite tasks before advancing this workflow." }, { status: 409 });
      }
      updates.automationWorkflow = workflow;
    }
    if (body.projectBuildBrief && typeof body.projectBuildBrief === "object") {
      if (!current.projectBuildBrief) {
        return NextResponse.json({ success: false, error: "This project has no build checklist." }, { status: 409 });
      }

      const requestedCompletion = new Map<string, boolean>();
      const incomingChecklist = (body.projectBuildBrief as Record<string, unknown>).checklist;
      if (Array.isArray(incomingChecklist)) {
        for (const value of incomingChecklist.slice(0, 30)) {
          if (typeof value === "object" && value !== null && "id" in value && "completed" in value &&
              typeof value.id === "string" && typeof value.completed === "boolean") {
            requestedCompletion.set(value.id, value.completed);
          }
        }
      }
      updates.projectBuildBrief = {
        ...current.projectBuildBrief,
        checklist: current.projectBuildBrief.checklist.map((item) => ({
          ...item,
          completed: requestedCompletion.get(item.id) ?? item.completed,
        })),
      };
    }
    if (approvedPrice !== undefined) {
      updates.approvedPrice = Number(approvedPrice);
      updates.remainingBalance = Math.max(0, Number(approvedPrice) - (current.advanceReceived || 0));
    }

    const updated = await updateProjectRecord(id, updates);
    if (!updated) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, project: updated });
  } catch (error) {
    console.error("Update project error", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof ProjectWorkspaceStorageError ? error.message : "Failed to update project",
      },
      { status: error instanceof ProjectWorkspaceStorageError ? 503 : 500 }
    );
  }
}
