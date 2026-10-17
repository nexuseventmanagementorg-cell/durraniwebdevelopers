import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/auth";
import { DataStore } from "@/lib/store";
import { Project, OrderStatus } from "@/lib/types";

export async function GET(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const projects = DataStore.getProjects();
  return NextResponse.json({ success: true, projects });
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

    DataStore.createProject(newProject);
    return NextResponse.json({ success: true, project: newProject });
  } catch (error) {
    console.error("Create project error", error);
    return NextResponse.json({ success: false, error: "Failed to create project" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, status, deploymentUrl, adminNotes, deliveryTimeline, approvedPrice } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Project ID is required" }, { status: 400 });
    }

    const updates: Partial<Project> = {};
    if (status) updates.status = status as OrderStatus;
    if (deploymentUrl !== undefined) updates.deploymentUrl = deploymentUrl;
    if (adminNotes !== undefined) updates.adminNotes = adminNotes;
    if (deliveryTimeline !== undefined) updates.deliveryTimeline = deliveryTimeline;
    if (body.projectBuildBrief && typeof body.projectBuildBrief === "object") {
      const current = DataStore.getProjectById(id);
      if (!current) {
        return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
      }
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
      const current = DataStore.getProjectById(id);
      if (current) {
        updates.remainingBalance = Math.max(0, Number(approvedPrice) - (current.advanceReceived || 0));
      }
    }

    const updated = DataStore.updateProject(id, updates);
    if (!updated) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, project: updated });
  } catch (error) {
    console.error("Update project error", error);
    return NextResponse.json({ success: false, error: "Failed to update project" }, { status: 500 });
  }
}
