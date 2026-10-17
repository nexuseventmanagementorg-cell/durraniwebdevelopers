import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getBeginnerBudgetPlan, isBeginnerBudgetBand, isBeginnerProjectGoal } from "@/lib/calculator-guide";
import { getExchangeRateSnapshot } from "@/lib/exchange-rates";
import { isCurrencyCode } from "@/lib/currency";
import type { CurrencyCode } from "@/lib/currency";
import { checkRateLimit } from "@/lib/rateLimit";
import { createCalculatorLeadToken, validateCalculatorLeadContact } from "@/lib/calculator-lead-security";
import { CalculatorLeadStorageError, createCalculatorLead } from "@/lib/calculator-lead-storage";
import type { CalculatorLead } from "@/lib/types";

function shortText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: NextRequest) {
  const ip = request.ip || request.headers.get("x-forwarded-for") || "client";
  const rateLimit = checkRateLimit(`calculator_lead_${ip}`, 8, 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: `Please wait ${rateLimit.resetInSec} seconds before saving another plan.` },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const email = shortText(body.email, 254).toLowerCase();
    const phone = shortText(body.phone, 32);
    const name = shortText(body.name, 120);
    const contactError = validateCalculatorLeadContact({
      email,
      phone,
      contactConsent: body.contactConsent === true,
    });
    if (contactError) {
      return NextResponse.json({ success: false, error: contactError }, { status: 400 });
    }
    if (!isBeginnerProjectGoal(body.goal) || !isBeginnerBudgetBand(body.budgetBand)) {
      return NextResponse.json({ success: false, error: "Please choose a project goal and budget range." }, { status: 400 });
    }
    if (body.currency !== undefined && !isCurrencyCode(body.currency)) {
      return NextResponse.json({ success: false, error: "Please choose a supported currency." }, { status: 400 });
    }

    const currency: CurrencyCode = isCurrencyCode(body.currency) ? body.currency : "PKR";
    const exchangeSnapshot = currency === "PKR" ? { rates: { PKR: 1 }, updatedAt: new Date().toISOString() } : await getExchangeRateSnapshot();
    if (currency !== "PKR" && !exchangeSnapshot.rates[currency]) {
      return NextResponse.json({ success: false, error: `A current ${currency} exchange rate is unavailable.` }, { status: 503 });
    }
    const language = body.language === "roman-ur" ? "roman-ur" : "en";
    const localeValue = shortText(body.locale, 32);
    const locale = /^[a-z]{2}(?:-[a-zA-Z0-9]{2,8})*$/.test(localeValue) ? localeValue : "en-US";
    const goal = body.goal;
    const budgetBand = body.budgetBand;
    const plan = getBeginnerBudgetPlan(goal, budgetBand, currency, exchangeSnapshot.rates, language);
    const now = new Date().toISOString();
    const lead: CalculatorLead = {
      id: `LD-${crypto.randomUUID()}`,
      name,
      email,
      phone,
      language,
      locale,
      currency,
      goal,
      budgetBand,
      userDescription: shortText(body.userDescription, 1200),
      progressStep: 0,
      recommendation: {
        title: plan.title,
        projectType: plan.projectType,
        calculation: plan.calculation,
        included: plan.included,
        notIncluded: plan.notIncluded,
      },
      questionnaire: {},
      contactConsentAt: now,
      status: "New",
      adminNotes: "",
      createdAt: now,
      updatedAt: now,
    };
    await createCalculatorLead(lead);

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      updateToken: createCalculatorLeadToken(lead.id),
      savedAt: lead.createdAt,
      recommendation: lead.recommendation,
    });
  } catch (error) {
    if (error instanceof CalculatorLeadStorageError) {
      return NextResponse.json(
        { success: false, error: "We couldn't save your plan just now. You can still continue to the calculator without saving a lead." },
        { status: 503 }
      );
    }
    console.error("Calculator lead creation failed", error);
    return NextResponse.json({ success: false, error: "Your plan could not be saved. Please try again." }, { status: 503 });
  }
}