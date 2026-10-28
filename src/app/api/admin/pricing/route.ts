import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/auth";
import { DataStore } from "@/lib/store";
import { PricingRuleConfig } from "@/lib/types";

export async function GET(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const config = DataStore.getPricingConfig();
  return NextResponse.json({ success: true, config });
}

export async function POST(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: PricingRuleConfig = await request.json();

    if (
      !body || typeof body !== "object" ||
      !Number.isFinite(body.baseWithoutAdmin) || body.baseWithoutAdmin <= 0 ||
      !Number.isFinite(body.baseWithAdmin) || body.baseWithAdmin <= 0 ||
      !body.addons || typeof body.addons !== "object" || Array.isArray(body.addons)
    ) {
      return NextResponse.json(
        { success: false, error: "Valid base prices and an add-on catalog are required" },
        { status: 400 }
      );
    }

    for (const [id, addon] of Object.entries(body.addons)) {
      if (
        !addon || typeof addon !== "object" ||
        addon.id !== id || !Number.isFinite(addon.price) || addon.price < 0 ||
        typeof addon.label !== "string" || typeof addon.description !== "string"
      ) {
        return NextResponse.json(
          { success: false, error: `Invalid add-on key or numeric price for "${id}"` },
          { status: 400 }
        );
      }
      if (addon.category !== "businesscatalog" || addon.origin !== "new") continue;
      const minimumPrice = addon.pricingLevel === "basic" ? 10000
        : addon.pricingLevel === "expanded" ? 25000
        : addon.pricingLevel === "complex" ? 70000
        : Number.POSITIVE_INFINITY;
      const maximumPrice = addon.pricingLevel === "basic" ? 20000
        : addon.pricingLevel === "expanded" ? 60000
        : Number.POSITIVE_INFINITY;
      if (
        addon.price < minimumPrice ||
        addon.price > maximumPrice ||
        !addon.businessCategories?.length ||
        !addon.label.trim() ||
        !addon.description.trim() ||
        (addon.status === "archived" && addon.enabled)
      ) {
        return NextResponse.json(
          { success: false, error: `Invalid business add-on scope, status, or ${addon.pricingLevel || "missing"} tier price for "${id}"` },
          { status: 400 }
        );
      }
    }

    const updated = DataStore.updatePricingConfig(body, "Admin");
    return NextResponse.json({ success: true, config: updated });
  } catch (error) {
    console.error("Update pricing rules error", error);
    return NextResponse.json(
      { success: false, error: "Failed to update pricing rules" },
      { status: 500 }
    );
  }
}
