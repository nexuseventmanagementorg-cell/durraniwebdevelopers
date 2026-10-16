import { NextRequest, NextResponse } from "next/server";
import { DataStore } from "@/lib/store";
import {
  calculateBudget,
  getChargeableAddonIds,
  getPricingPackageConfig,
  isPricingPackageId,
} from "@/lib/constants";
import { checkRateLimit } from "@/lib/rateLimit";
import { Inquiry } from "@/lib/types";
import { CurrencyCode, isCurrencyCode, getRegionalPricingConfig } from "@/lib/currency";
import { getExchangeRateSnapshot } from "@/lib/exchange-rates";
import { notifyAdminOfSubmission } from "@/lib/admin-notifications";

export async function POST(request: NextRequest) {
  try {
    const ip = request.ip || request.headers.get("x-forwarded-for") || "client";
    const rateLimit = checkRateLimit(`inquiry_${ip}`, 10, 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many submissions. Please wait ${rateLimit.resetInSec} seconds before trying again.`,
        },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Required fields validation
    if (!body.customerName || !body.customerName.trim()) {
      return NextResponse.json(
        { success: false, error: "Customer name is required" },
        { status: 400 }
      );
    }
    if (!body.email || !body.email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "A valid email address is required" },
        { status: 400 }
      );
    }
    if (!body.phone || body.phone.trim().length < 8) {
      return NextResponse.json(
        { success: false, error: "A valid WhatsApp / contact phone number is required" },
        { status: 400 }
      );
    }
    if (!body.disclaimerAccepted) {
      return NextResponse.json(
        { success: false, error: "You must accept the estimate disclaimer to proceed" },
        { status: 400 }
      );
    }
    if (body.currency !== undefined && !isCurrencyCode(body.currency)) {
      return NextResponse.json(
        { success: false, error: "Please select a supported project currency." },
        { status: 400 }
      );
    }
    if (body.pricingPackage != null && !isPricingPackageId(body.pricingPackage)) {
      return NextResponse.json(
        { success: false, error: "Please select a supported pricing package." },
        { status: 400 }
      );
    }

    const adminPanelType = body.adminPanelType === "client_admin" ? "client_admin" : "none";
    const pricingPackage = isPricingPackageId(body.pricingPackage) ? body.pricingPackage : undefined;
    const requestedAddons: string[] = Array.isArray(body.selectedAddons) ? body.selectedAddons : [];
    const selectedAddons = getChargeableAddonIds(requestedAddons, pricingPackage);
    const currency: CurrencyCode = isCurrencyCode(body.currency) ? body.currency : "PKR";

    // Persist the PKR base estimate for existing admin bookkeeping, and keep the
    // visitor-facing regional estimate alongside it when the selected currency differs.
    const storedPricingConfig = DataStore.getPricingConfig();
    const pricingConfig = pricingPackage
      ? getPricingPackageConfig(storedPricingConfig, pricingPackage)
      : storedPricingConfig;
    const serverCalculation = calculateBudget(adminPanelType, selectedAddons, pricingConfig);
    const exchangeSnapshot = currency === "PKR" ? null : await getExchangeRateSnapshot();
    const regionalConfig = getRegionalPricingConfig(
      pricingConfig,
      currency,
      exchangeSnapshot?.rates || { PKR: 1 }
    );
    const internationalCalculation = calculateBudget(adminPanelType, selectedAddons, regionalConfig);

    // Generate unique inquiry ID (e.g. DW-829104)
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const inquiryId = `DW-${randomSuffix}`;

    const newInquiry: Inquiry = {
      id: inquiryId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "New Inquiry",
      
      customerName: body.customerName.trim(),
      businessName: (body.businessName || "").trim(),
      email: body.email.trim().toLowerCase(),
      phone: body.phone.trim(),
      cityCountry: (body.cityCountry || "").trim(),
      preferredContact: body.preferredContact || "whatsapp",
      customerIntro: (body.customerIntro || "").trim(),

      projectTypes: Array.isArray(body.projectTypes) && body.projectTypes.length > 0
        ? body.projectTypes
        : ["Custom web application"],

      problemToSolve: (body.problemToSolve || "").trim(),
      targetAudience: (body.targetAudience || "").trim(),
      productsServices: (body.productsServices || "").trim(),
      inspirationUrl: (body.inspirationUrl || "").trim(),
      isNewOrUpgrade: body.isNewOrUpgrade === "upgrade" ? "upgrade" : "new",
      preferredLaunchDate: (body.preferredLaunchDate || "").trim(),
      expectedBudgetRange: (body.expectedBudgetRange || "").trim(),

      displayFixedOnly: Boolean(body.displayFixedOnly),
      needsProductCatalog: Boolean(body.needsProductCatalog),
      productFeatures: Array.isArray(body.productFeatures) ? body.productFeatures : [],
      acceptOrdersOnline: Boolean(body.acceptOrdersOnline),
      orderFeatures: Array.isArray(body.orderFeatures) ? body.orderFeatures : [],
      needsReviewsOrAccounts: Boolean(body.needsReviewsOrAccounts),

      adminPanelType,
      adminFeatures: Array.isArray(body.adminFeatures) ? body.adminFeatures : [],
      selectedAddons,
      customFeatureNotes: (body.customFeatureNotes || "").trim(),
      ...(pricingPackage ? { pricingPackage } : {}),

      calculation: serverCalculation,
      currency,
      internationalPricing: currency !== "PKR",
      ...(currency !== "PKR"
        ? {
            exchangeRate: exchangeSnapshot?.rates[currency],
            internationalCalculation,
          }
        : { internationalCalculation: serverCalculation }),
      disclaimerAccepted: true,
      adminNotes: `Submitted via online interactive budget calculator.${pricingPackage ? ` Selected package: ${pricingPackage}.` : ""}`,
    };

    const savedInquiry = DataStore.createInquiry(newInquiry);
    await notifyAdminOfSubmission({
      type: "Project inquiry",
      reference: savedInquiry.id,
      customerName: savedInquiry.customerName,
      customerEmail: savedInquiry.email,
      customerPhone: savedInquiry.phone,
      details: [
        `Business: ${savedInquiry.businessName || "Not provided"}`,
        `Project types: ${savedInquiry.projectTypes.join(", ")}`,
        `Estimated budget: ${savedInquiry.calculation.estimatedTotal} PKR`,
        `Country: ${savedInquiry.cityCountry || "Not provided"}`,
      ].join("\n"),
    });

    return NextResponse.json({
      success: true,
      inquiry: savedInquiry,
      referenceId: savedInquiry.id,
      message: "Project inquiry submitted successfully! Durrani Web Developers will review your requirements.",
    });
  } catch (error) {
    console.error("Inquiry submission failed", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error && /exchange[ -]rate/i.test(error.message)
          ? error.message
          : "Failed to process inquiry submission",
      },
      { status: error instanceof Error && /exchange[ -]rate/i.test(error.message) ? 503 : 500 }
    );
  }
}
