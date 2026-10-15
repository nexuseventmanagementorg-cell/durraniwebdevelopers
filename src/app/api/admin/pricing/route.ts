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

    if (!body.baseWithoutAdmin || !body.baseWithAdmin) {
      return NextResponse.json(
        { success: false, error: "Base prices are required" },
        { status: 400 }
      );
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
