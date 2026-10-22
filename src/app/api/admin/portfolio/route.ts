import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/auth";
import { DataStore } from "@/lib/store";
import { PortfolioProject } from "@/lib/types";

export async function GET(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const portfolio = DataStore.getPortfolio(true); // Return all including private for admin
  return NextResponse.json({ success: true, portfolio });
}

export async function POST(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      id,
      title,
      category,
      shortDescription,
      fullDescription,
      imageUrl,
      technologies,
      status,
      availabilityStatus,
      templateAvailable,
      demoUrl,
      isPublic,
      approvedPublicBudget,
      budgetLabel,
      featured,
      clientConsentForBudget,
    } = body;

    if (!title || !category || !shortDescription) {
      return NextResponse.json(
        { success: false, error: "Title, category, and short description are required." },
        { status: 400 }
      );
    }
    if (
      availabilityStatus !== undefined &&
      availabilityStatus !== "Online" &&
      availabilityStatus !== "Offline"
    ) {
      return NextResponse.json(
        { success: false, error: "Availability status must be Online or Offline." },
        { status: 400 }
      );
    }

    const projectId = id || `port-${Date.now().toString().slice(-6)}`;
    const project: PortfolioProject = {
      id: projectId,
      title,
      category,
      shortDescription,
      fullDescription: fullDescription || shortDescription,
      imageUrl: imageUrl || "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80",
      technologies: Array.isArray(technologies) ? technologies : ["Next.js", "TypeScript", "Tailwind CSS"],
      status: status || "Live",
      availabilityStatus: availabilityStatus || "Online",
      templateAvailable: templateAvailable !== false,
      demoUrl: demoUrl || "",
      isPublic: isPublic !== undefined ? Boolean(isPublic) : true,
      approvedPublicBudget: approvedPublicBudget ? Number(approvedPublicBudget) : undefined,
      budgetLabel: budgetLabel || "Estimated Project Budget",
      featured: Boolean(featured),
      clientConsentForBudget: Boolean(clientConsentForBudget),
    };

    const saved = DataStore.savePortfolioProject(project, "Admin");
    return NextResponse.json({ success: true, project: saved });
  } catch (error) {
    console.error("Save portfolio project error", error);
    return NextResponse.json(
      { success: false, error: "Failed to save portfolio project" },
      { status: 500 }
    );
  }
}
