import { NextRequest, NextResponse } from "next/server";
import { estimateWebsite } from "@/lib/website-estimator";
import { checkRateLimit } from "@/lib/rateLimit";
import { getRegionalPricingConfig, isCurrencyCode } from "@/lib/currency";
import { getExchangeRateSnapshot } from "@/lib/exchange-rates";
import { DataStore } from "@/lib/store";
import { calculateBudget } from "@/lib/constants";

export const runtime = "nodejs";
export const maxDuration = 20;

export async function POST(request: NextRequest) {
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimit = checkRateLimit(`website-estimate:${clientIp}`, 5, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: "Aap ne bohat si scans kar li hain. Thori dair baad dobara koshish karein." },
      { status: 429, headers: { "Retry-After": String(rateLimit.resetInSec) } }
    );
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 4096) {
    return NextResponse.json(
      { success: false, error: "Request bohat bara hai. Sirf aik website URL bhejein." },
      { status: 413 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Request JSON format mein nahi hai." },
      { status: 400 }
    );
  }

  const url = typeof body === "object" && body !== null && "url" in body
    ? body.url
    : undefined;
  const requestedCurrency = typeof body === "object" && body !== null && "currency" in body
    ? body.currency
    : "PKR";
  if (typeof url !== "string" || !url.trim()) {
    return NextResponse.json(
      { success: false, error: "Scan karne ke liye website URL enter karein." },
      { status: 400 }
    );
  }
  if (!isCurrencyCode(requestedCurrency)) {
    return NextResponse.json(
      { success: false, error: "Please select a supported project currency." },
      { status: 400 }
    );
  }

  try {
    const snapshot = requestedCurrency === "PKR" ? null : await getExchangeRateSnapshot();
    const estimate = await estimateWebsite(
      url.trim(),
      requestedCurrency,
      snapshot?.rates || { PKR: 1 },
      snapshot?.updatedAt,
      undefined,
      DataStore.getPricingConfig()
    );
    const sourceHost = new URL(estimate.url).hostname.toLowerCase();
    const historicalProject = DataStore.getPortfolio(false).find((project) => {
      if (
        !project.clientConsentForBudget ||
        project.budgetLabel !== "Actual Project Fee" ||
        !project.approvedPublicBudget ||
        !project.demoUrl
      ) return false;
      return new URL(project.demoUrl).hostname.toLowerCase() === sourceHost;
    });
    if (historicalProject?.approvedPublicBudget) {
      if (
        !estimate.pricingPackage &&
        (historicalProject.adminPanelIncluded || historicalProject.includedAddonIds?.length)
      ) {
        const currencyRates = snapshot?.rates || { PKR: 1 };
        const pricingConfig = getRegionalPricingConfig(
          DataStore.getPricingConfig(),
          requestedCurrency,
          currencyRates
        );
        const knownScopeCalculation = calculateBudget(
          historicalProject.adminPanelIncluded ? "client_admin" : "none",
          historicalProject.includedAddonIds || [],
          pricingConfig
        );
        estimate.adminPanel = historicalProject.adminPanelIncluded === true;
        if (estimate.adminPanel) {
          estimate.suggestedPricingOptionId = "package_2";
        }
        estimate.basePackage = estimate.adminPanel
          ? "Package 2: Client Admin Panel"
          : "Package 1: Durrani-Managed";
        estimate.basePrice = knownScopeCalculation.basePrice;
        estimate.addons = knownScopeCalculation.selectedAddonDetails.map((addon) => ({
          id: addon.id,
          title: addon.label,
          price: addon.price,
          billingPeriod: addon.billingPeriod,
        }));
        estimate.monthlyAddonTotal = knownScopeCalculation.monthlyAddonTotal;
        estimate.estimatedTotal = knownScopeCalculation.estimatedTotal;
        estimate.assumptions = estimate.assumptions.filter(
          (assumption) => !assumption.startsWith("Client admin panel public page")
        );
        estimate.assumptions.unshift(
          "This website matches a published Durrani Web Developers project record. The new-build estimate uses that project's documented client-admin and add-on scope; the original fee shown separately is the historical Pakistan price."
        );
        if (historicalProject.adminPanelIncluded) {
          const adminFeature = estimate.features.find((feature) => feature.addonId === "admin_dashboard");
          if (adminFeature) {
            adminFeature.evidenceStatus = "owner_confirmed";
            adminFeature.explanation = "The original completed project included client-admin panel support, used here for the comparable new-build estimate.";
            adminFeature.evidence = "Verified project scope record; not detected from the public pages.";
          } else {
            estimate.features.push({
              id: "confirmed-admin-panel",
              title: "Client admin panel (confirmed project scope)",
              explanation: "The original completed project included client-admin panel support, used here for the comparable new-build estimate.",
              evidence: "Verified project scope record; not detected from the public pages.",
              evidenceStatus: "owner_confirmed",
              sourcePages: [],
              addonId: "admin_dashboard",
            });
          }
        }
      }
      const rate = requestedCurrency === "PKR" ? 1 : snapshot?.rates[requestedCurrency];
      if (rate) {
        estimate.historicalProjectReference = {
          title: historicalProject.title,
          amountPKR: historicalProject.approvedPublicBudget,
          convertedAmount: Math.round(historicalProject.approvedPublicBudget * rate * 100) / 100,
          currency: requestedCurrency,
        };
      }
    }
    return NextResponse.json({ success: true, estimate });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Website scan nahi ho saki. URL check karke dobara koshish karein.";
    const status = error instanceof Error && /exchange[ -]rate/i.test(error.message) ? 503 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
