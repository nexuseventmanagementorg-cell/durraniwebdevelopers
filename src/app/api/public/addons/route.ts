import { NextResponse } from "next/server";
import { ADDON_CATEGORY_LABELS } from "@/lib/constants";
import { BUSINESS_CATEGORIES, getBusinessAddonCatalog } from "@/lib/business-addon-catalog";
import { DataStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = DataStore.getPricingConfig();
    const businessCatalog = getBusinessAddonCatalog(config.addons);
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
        enabled: addon.enabled,
        businessCategories: addon.businessCategories || [],
        businessTypes: addon.businessTypes || [],
        pricingLevel: addon.pricingLevel,
        origin: addon.origin || "existing",
        status: addon.status || (addon.enabled ? "active" : "inactive"),
      }));

    return NextResponse.json(
      {
        success: true,
        addons,
        businessCatalog: businessCatalog.filter((addon) => addon.enabled),
        businessCategories: BUSINESS_CATEGORIES,
        pricingConfig: config,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Failed to fetch public add-ons", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch available add-ons" },
      { status: 500 }
    );
  }
}
