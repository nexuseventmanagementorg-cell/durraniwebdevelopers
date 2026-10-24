import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/auth";
import { DataStore } from "@/lib/store";
import { PortfolioProject } from "@/lib/types";

const TEMPLATE_PACKAGES = [
  "ecommerce_starter",
  "ecommerce_business",
  "ecommerce_advanced",
  "saas_starter",
  "saas_business",
  "saas_enterprise",
] as const;

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
      templatePricingPackage,
      templateStartingPrice,
      templateIncludedAddonIds,
      templateIncludedAddonPrices,
      offerEnabled,
      offerTag,
      offerDiscountPercent,
      offerEndsAt,
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
    const existingProject = id
      ? DataStore.getPortfolio(true).find((project) => project.id === id)
      : undefined;
    if (
      templatePricingPackage !== undefined &&
      !TEMPLATE_PACKAGES.includes(templatePricingPackage)
    ) {
      return NextResponse.json(
        { success: false, error: "Select a valid template pricing package." },
        { status: 400 }
      );
    }
    if (
      templateStartingPrice !== undefined &&
      (!Number.isFinite(Number(templateStartingPrice)) || Number(templateStartingPrice) < 0)
    ) {
      return NextResponse.json(
        { success: false, error: "Template starting price must be a valid non-negative amount." },
        { status: 400 }
      );
    }
    if (templateIncludedAddonIds !== undefined) {
      const allowedAddonIds = new Set(Object.keys(DataStore.getPricingConfig().addons));
      if (
        !Array.isArray(templateIncludedAddonIds) ||
        templateIncludedAddonIds.some((addonId: unknown) =>
          typeof addonId !== "string" || !allowedAddonIds.has(addonId)
        )
      ) {
        return NextResponse.json(
          { success: false, error: "Included template features must use valid public add-on IDs." },
          { status: 400 }
        );
      }
    }
    if (templateIncludedAddonPrices !== undefined) {
      if (
        typeof templateIncludedAddonPrices !== "object" ||
        templateIncludedAddonPrices === null ||
        Array.isArray(templateIncludedAddonPrices) ||
        Object.entries(templateIncludedAddonPrices).some(([addonId, value]) =>
          !Array.isArray(templateIncludedAddonIds) ||
          !templateIncludedAddonIds.includes(addonId) ||
          typeof value !== "number" ||
          !Number.isFinite(value) ||
          value < 0
        )
      ) {
        return NextResponse.json(
          { success: false, error: "Custom feature prices must be non-negative amounts for selected features." },
          { status: 400 }
        );
      }
    }
    if (offerEnabled) {
      const discount = Number(offerDiscountPercent);
      const endTime = new Date(offerEndsAt).getTime();
      const effectiveBudget = approvedPublicBudget === undefined
        ? existingProject?.approvedPublicBudget
        : Number(approvedPublicBudget);
      if (
        !Number.isFinite(discount) ||
        discount <= 0 ||
        discount >= 100 ||
        typeof offerTag !== "string" ||
        !offerTag.trim() ||
        offerTag.trim().length > 40 ||
        !Number.isFinite(endTime) ||
        endTime <= Date.now() ||
        templateAvailable === false ||
        !effectiveBudget ||
        !Number.isFinite(effectiveBudget)
      ) {
        return NextResponse.json(
          { success: false, error: "Active offers need an available template, a budget, a tag, a 1–99% discount, and a future end time." },
          { status: 400 }
        );
      }
    }

    const project: PortfolioProject = {
      ...existingProject,
      id: projectId,
      templateFeatureVersion: 1,
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
      approvedPublicBudget: approvedPublicBudget === undefined
        ? existingProject?.approvedPublicBudget
        : Number(approvedPublicBudget) || undefined,
      budgetLabel: budgetLabel || "Estimated Project Budget",
      featured: featured === undefined ? Boolean(existingProject?.featured) : Boolean(featured),
      clientConsentForBudget: clientConsentForBudget === undefined
        ? Boolean(existingProject?.clientConsentForBudget)
        : Boolean(clientConsentForBudget),
      templatePricingPackage: templatePricingPackage ?? existingProject?.templatePricingPackage,
      templateStartingPrice: templateStartingPrice === undefined
        ? existingProject?.templateStartingPrice
        : Number(templateStartingPrice) || undefined,
      templateIncludedAddonIds: Array.isArray(templateIncludedAddonIds)
        ? templateIncludedAddonIds
        : existingProject?.templateIncludedAddonIds,
      templateIncludedAddonPrices:
        templateIncludedAddonPrices && typeof templateIncludedAddonPrices === "object"
          ? templateIncludedAddonPrices
          : existingProject?.templateIncludedAddonPrices,
      offerEnabled: Boolean(offerEnabled),
      offerTag: offerEnabled ? String(offerTag).trim() : "",
      offerDiscountPercent: offerEnabled ? Number(offerDiscountPercent) : undefined,
      offerEndsAt: offerEnabled ? new Date(offerEndsAt).toISOString() : undefined,
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

export async function DELETE(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (typeof body.id !== "string" || !body.id.trim()) {
      return NextResponse.json({ success: false, error: "Portfolio item ID is required." }, { status: 400 });
    }
    const deleted = DataStore.deletePortfolioProject(body.id, "Admin");
    if (!deleted) {
      return NextResponse.json({ success: false, error: "Portfolio item not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete portfolio project error", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete portfolio project" },
      { status: 500 }
    );
  }
}
