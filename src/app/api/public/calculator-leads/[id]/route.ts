import { NextRequest, NextResponse } from "next/server";
import { DataStore } from "@/lib/store";
import {
  calculateBudget,
  getChargeableAddonIds,
  getPricingPackageConfig,
  isPricingPackageId,
} from "@/lib/constants";
import { getExchangeRateSnapshot } from "@/lib/exchange-rates";
import { getRegionalPricingConfig, isCurrencyCode } from "@/lib/currency";
import type { CurrencyCode } from "@/lib/currency";
import {
  getBeginnerBudgetPlan,
  isBeginnerBudgetBand,
  isBeginnerProjectGoal,
} from "@/lib/calculator-guide";
import type { BeginnerBudgetBand, BeginnerProjectGoal } from "@/lib/calculator-guide";
import { validateCalculatorLeadContact, verifyCalculatorLeadToken } from "@/lib/calculator-lead-security";
import { CalculatorLeadStorageError, getCalculatorLeadById, updateCalculatorLead } from "@/lib/calculator-lead-storage";
import type { CalculatorLead } from "@/lib/types";

function shortText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function stringList(value: unknown, maxItems = 40, maxLength = 120): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.flatMap((item) =>
    typeof item === "string" && item.trim() ? [item.trim().slice(0, maxLength)] : []
  ))).slice(0, maxItems);
}

function safeLocale(value: unknown, fallback: string): string {
  const locale = shortText(value, 32);
  return /^[a-z]{2}(?:-[a-zA-Z0-9]{2,8})*$/.test(locale) ? locale : fallback;
}

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const leadId = context.params.id;
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!verifyCalculatorLeadToken(leadId, token)) {
    return NextResponse.json({ success: false, error: "This calculator session is no longer valid. Save a new lead to continue." }, { status: 401 });
  }

  try {
    const current = await getCalculatorLeadById(leadId);
    if (!current) return NextResponse.json({ success: false, error: "Calculator lead not found." }, { status: 404 });

    const body = await request.json();
    const profileValue = body.profile;
    const profile = typeof profileValue === "object" && profileValue !== null && !Array.isArray(profileValue)
      ? profileValue as Record<string, unknown>
      : {};
    const input = body.questionnaire ?? current.questionnaire;
    if (typeof input !== "object" || input === null || Array.isArray(input)) {
      return NextResponse.json({ success: false, error: "Calculator answers are required." }, { status: 400 });
    }
    const answers = input as Record<string, unknown>;
    const email = shortText(profile.email, 254).toLowerCase() || shortText(answers.email, 254).toLowerCase() || current.email;
    const phone = shortText(profile.phone, 32) || shortText(answers.phone, 32) || current.phone;
    const name = shortText(profile.name, 120) || shortText(answers.customerName, 120) || current.name;
    const contactError = validateCalculatorLeadContact({ email, phone, contactConsent: true });
    if (contactError) return NextResponse.json({ success: false, error: contactError }, { status: 400 });

    const currency: CurrencyCode = isCurrencyCode(profile.currency)
      ? profile.currency
      : isCurrencyCode(answers.currency)
        ? answers.currency
        : isCurrencyCode(current.currency) ? current.currency : "PKR";
    const exchangeSnapshot = currency === "PKR"
      ? { rates: { PKR: 1 }, updatedAt: new Date().toISOString() }
      : await getExchangeRateSnapshot();
    if (currency !== "PKR" && !exchangeSnapshot.rates[currency]) {
      return NextResponse.json({ success: false, error: `A current ${currency} exchange rate is unavailable.` }, { status: 503 });
    }

    const language: CalculatorLead["language"] = profile.language === "roman-ur" || answers.language === "roman-ur"
      ? "roman-ur"
      : profile.language === "en" || answers.language === "en" ? "en" : current.language;
    const locale = safeLocale(profile.locale || answers.locale, current.locale);
    const goal: BeginnerProjectGoal = isBeginnerProjectGoal(profile.goal)
      ? profile.goal
      : isBeginnerProjectGoal(answers.goal)
        ? answers.goal
        : isBeginnerProjectGoal(current.goal) ? current.goal : "not-sure";
    const budgetBand: BeginnerBudgetBand = isBeginnerBudgetBand(profile.budgetBand)
      ? profile.budgetBand
      : isBeginnerBudgetBand(answers.budgetBand)
        ? answers.budgetBand
        : isBeginnerBudgetBand(current.budgetBand) ? current.budgetBand : "not-sure";
    const pricingConfig = DataStore.getPricingConfig();
    const pricingPackage = isPricingPackageId(answers.pricingPackage) ? answers.pricingPackage : null;
    const packageConfig = pricingPackage
      ? getPricingPackageConfig(pricingConfig, pricingPackage)
      : pricingConfig;
    const regionalConfig = currency === "PKR"
      ? packageConfig
      : getRegionalPricingConfig(packageConfig, currency, exchangeSnapshot.rates);
    const adminPanelType = answers.adminPanelType === "client_admin" ? "client_admin" : "none";
    const selectedAddons = stringList(answers.selectedAddons, 100)
      .filter((id) => Object.hasOwn(pricingConfig.addons, id));
    const chargeableAddons = getChargeableAddonIds(selectedAddons, pricingPackage, adminPanelType);
    const calculation = calculateBudget(adminPanelType, chargeableAddons, regionalConfig);

    const questionnaire: Record<string, unknown> = {
      customerName: name,
      businessName: shortText(answers.businessName, 160),
      email,
      phone,
      cityCountry: shortText(answers.cityCountry, 120),
      preferredContact: ["whatsapp", "email", "phone"].includes(String(answers.preferredContact)) ? answers.preferredContact : "whatsapp",
      customerIntro: shortText(answers.customerIntro, 1000),
      projectTypes: stringList(answers.projectTypes, 12),
      problemToSolve: shortText(answers.problemToSolve, 3000),
      targetAudience: shortText(answers.targetAudience, 1200),
      productsServices: shortText(answers.productsServices, 1600),
      inspirationUrl: shortText(answers.inspirationUrl, 500),
      isNewOrUpgrade: answers.isNewOrUpgrade === "upgrade" ? "upgrade" : "new",
      preferredLaunchDate: shortText(answers.preferredLaunchDate, 100),
      expectedBudgetRange: shortText(answers.expectedBudgetRange, 160),
      displayFixedOnly: answers.displayFixedOnly === true,
      needsProductCatalog: answers.needsProductCatalog === true,
      productFeatures: stringList(answers.productFeatures),
      acceptOrdersOnline: answers.acceptOrdersOnline === true,
      orderFeatures: stringList(answers.orderFeatures),
      needsReviewsOrAccounts: answers.needsReviewsOrAccounts === true,
      adminPanelType,
      adminFeatures: stringList(answers.adminFeatures),
      selectedAddons,
      customFeatureNotes: shortText(answers.customFeatureNotes, 2000),
      pricingPackage,
      currency,
      language,
      locale,
      internationalPricing: currency !== "PKR",
      exchangeRate: currency === "PKR" ? 1 : exchangeSnapshot.rates[currency],
      exchangeRateUpdatedAt: exchangeSnapshot.updatedAt,
      disclaimerAccepted: answers.disclaimerAccepted === true,
      calculation,
    };
    const plan = getBeginnerBudgetPlan(goal, budgetBand, currency, exchangeSnapshot.rates, language);
    const updated = await updateCalculatorLead(leadId, {
      name,
      email,
      phone,
      userDescription: shortText(profile.userDescription, 1200) || current.userDescription,
      progressStep: typeof profile.progressStep === "number"
        ? Math.max(current.progressStep, Math.min(7, Math.trunc(profile.progressStep)))
        : current.progressStep,
      language,
      locale,
      currency,
      goal,
      budgetBand,
      recommendation: {
        title: plan.title,
        projectType: plan.projectType,
        calculation: plan.calculation,
        included: plan.included,
        notIncluded: plan.notIncluded,
      },
      questionnaire,
    });
    if (!updated) return NextResponse.json({ success: false, error: "Calculator lead not found." }, { status: 404 });

    return NextResponse.json({ success: true, savedAt: updated.updatedAt });
  } catch (error) {
    if (error instanceof CalculatorLeadStorageError) {
      return NextResponse.json({ success: false, error: "Lead answers could not be saved right now." }, { status: 503 });
    }
    console.error("Calculator lead update failed", error);
    return NextResponse.json({ success: false, error: "Lead answers could not be saved." }, { status: 503 });
  }
}