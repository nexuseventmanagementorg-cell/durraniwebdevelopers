import { NextResponse } from "next/server";
import { ADDON_CATEGORY_LABELS } from "@/lib/constants";
import { DataStore } from "@/lib/store";

export async function GET() {
  try {
    const config = DataStore.getPricingConfig();
    const addons = Object.values(config.addons)
      .filter((addon) => addon.enabled)
      .map((addon) => ({
        id: addon.id,
        label: addon.label,
        category: addon.category,
        categoryLabel: ADDON_CATEGORY_LABELS[addon.category],
        price: addon.price,
        billingPeriod: addon.billingPeriod || "one_time",
        description: addon.description,
      }));

    return NextResponse.json({ success: true, addons });
  } catch (error) {
    console.error("Failed to fetch public add-ons", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch available add-ons" },
      { status: 500 }
    );
  }
}
