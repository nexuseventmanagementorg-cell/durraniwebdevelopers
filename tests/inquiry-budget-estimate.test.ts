import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { PATCH as patchAdminInquiry } from "../src/app/api/admin/inquiries/route";
import { signToken } from "../src/lib/auth";
import {
  calculateBudget,
  DEFAULT_PRICING_CONFIG,
} from "../src/lib/constants";
import { calculateInquiryScopeEstimate } from "../src/lib/inquiry-budget-estimate";
import { DataStore } from "../src/lib/store";
import type { Inquiry, PricingRuleConfig } from "../src/lib/types";

function makeInquiry(overrides: Partial<Inquiry> = {}): Inquiry {
  return {
    id: "MSG-337899",
    createdAt: "2026-10-28T04:25:53.000Z",
    updatedAt: "2026-10-28T04:25:53.000Z",
    status: "New Inquiry",
    customerName: "Example Customer",
    businessName: "",
    email: "customer@example.test",
    phone: "+923001234567",
    cityCountry: "Pakistan",
    preferredContact: "whatsapp",
    customerIntro: "",
    projectTypes: ["Custom web application"],
    problemToSolve: "",
    targetAudience: "",
    productsServices: "",
    inspirationUrl: "",
    isNewOrUpgrade: "new",
    preferredLaunchDate: "",
    expectedBudgetRange: "",
    displayFixedOnly: false,
    needsProductCatalog: false,
    productFeatures: [],
    acceptOrdersOnline: false,
    orderFeatures: [],
    needsReviewsOrAccounts: false,
    adminPanelType: "none",
    adminFeatures: [],
    selectedAddons: [],
    calculation: calculateBudget("none", []),
    disclaimerAccepted: true,
    ...overrides,
  };
}

function withAddonPrice(
  addonId: string,
  price: number,
  config: PricingRuleConfig = DEFAULT_PRICING_CONFIG
): PricingRuleConfig {
  return {
    ...config,
    addons: {
      ...config.addons,
      [addonId]: { ...config.addons[addonId], price },
    },
  };
}

async function withEnvironment(
  values: Record<string, string | undefined>,
  run: () => Promise<void>
): Promise<void> {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(values)) {
    previous.set(key, process.env[key]);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    await run();
  } finally {
    previous.forEach((value, key) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
  }
}

test("MSG-337899 luxury real estate brief gets Package 1 plus published property filters only", () => {
  const inquiry = makeInquiry({
    problemToSolve: "I want a premium website for my Luxury Real Estate business. I need a stunning home page with a cinematic hero section, a property listing page with advanced filters, and a high-end lead capture form. Please use a Dark Mode Luxe theme with gold accents and target wealthy investors.",
  });
  const estimate = calculateInquiryScopeEstimate(inquiry, DEFAULT_PRICING_CONFIG, {
    now: "2026-11-02T00:00:00.000Z",
  });

  assert.equal(estimate.pricingPackageId, "package_1");
  assert.equal(estimate.calculation?.basePrice, 35_000);
  assert.deepEqual(estimate.selectedAddonIds, ["property_filters"]);
  assert.equal(estimate.calculation?.estimatedTotal, 45_000);
  assert.equal(estimate.estimateStatus, "preliminary_estimate");
  assert.equal(estimate.scopeStatus, "needs_follow_up");
  assert.equal(estimate.confidence, "medium");
  assert.deepEqual(estimate.missingDetails, [
    "Business or brand name",
    "Target audience",
    "Products or services for launch",
    "Preferred launch date",
  ]);
  assert.ok(estimate.includedFeatures.includes("Contact / lead capture form"));
  assert.ok(estimate.includedFeatures.includes("Visual design preference"));
  assert.ok(!estimate.selectedAddonIds.includes("theme_switcher"));
});

test("dark visual styling is free while an explicit dark/light theme toggle uses the published add-on", () => {
  const stylingOnly = calculateInquiryScopeEstimate(makeInquiry({
    projectTypes: ["Business website"],
    problemToSolve: "Build a website with a dark luxury visual design and gold accents.",
  }));
  const themeToggle = calculateInquiryScopeEstimate(makeInquiry({
    projectTypes: ["Business website"],
    problemToSolve: "Build a website with a dark and light mode toggle so visitors can switch themes.",
  }));

  assert.equal(stylingOnly.calculation?.estimatedTotal, 35_000);
  assert.ok(!stylingOnly.selectedAddonIds.includes("theme_switcher"));
  assert.equal(themeToggle.calculation?.estimatedTotal, 45_000);
  assert.ok(themeToggle.selectedAddonIds.includes("theme_switcher"));
});

test("a requested client dashboard under Package 1 uses the live published add-on price and recommends Package 2", () => {
  const estimate = calculateInquiryScopeEstimate(makeInquiry({
    projectTypes: ["Business website"],
    problemToSolve: "Build a business website with a client admin dashboard.",
  }));

  assert.equal(estimate.pricingPackageId, "package_1");
  assert.deepEqual(estimate.selectedAddonIds, ["admin_dashboard"]);
  assert.equal(estimate.calculation?.estimatedTotal, 45_000);
  assert.equal(estimate.recommendedPackage?.id, "package_2");
});

test("Package 2 includes admin dashboard functionality without charging the add-on twice", () => {
  const estimate = calculateInquiryScopeEstimate(makeInquiry({
    adminPanelType: "client_admin",
    projectTypes: ["Business website"],
    problemToSolve: "Build a business website with a client admin dashboard.",
  }));

  assert.equal(estimate.pricingPackageId, "package_2");
  assert.equal(estimate.calculation?.basePrice, 45_000);
  assert.equal(estimate.calculation?.estimatedTotal, 45_000);
  assert.ok(estimate.includedFeatures.includes("Admin Dashboard"));
});

test("vague website inquiries receive a low-confidence starting estimate and follow-up status", () => {
  const estimate = calculateInquiryScopeEstimate(makeInquiry({
    projectTypes: ["Business website"],
    problemToSolve: "I need a website.",
  }));

  assert.equal(estimate.calculation?.estimatedTotal, 35_000);
  assert.equal(estimate.estimateStatus, "preliminary_estimate");
  assert.equal(estimate.confidence, "low");
  assert.equal(estimate.scopeStatus, "needs_follow_up");
});

test("empty or fallback-only inquiries do not show a fabricated zero quotation", () => {
  const estimate = calculateInquiryScopeEstimate(makeInquiry());

  assert.equal(estimate.calculation, null);
  assert.equal(estimate.estimateStatus, "insufficient_information");
  assert.ok(estimate.reviewReasons.includes("Insufficient information for a scope-based estimate."));
});

test("CRM and custom software without a published package require admin review, not a guessed base price", () => {
  for (const projectType of ["CRM", "Booking and appointment system", "Inventory management", "Custom software"]) {
    const estimate = calculateInquiryScopeEstimate(makeInquiry({
      projectTypes: [projectType],
      problemToSolve: `We need a custom ${projectType} for our team.`,
    }));
    assert.equal(estimate.calculation, null, `${projectType} should not receive a guessed website price`);
    assert.equal(estimate.estimateStatus, "admin_review_required");
    assert.ok(estimate.reviewReasons.some((reason) => reason.includes("No published starting package")));
  }
});

test("e-commerce package selection and package-included add-ons avoid duplicate charges", () => {
  const packageSpecificConfig: PricingRuleConfig = {
    ...DEFAULT_PRICING_CONFIG,
    addons: {
      ...DEFAULT_PRICING_CONFIG.addons,
      property_filters: {
        ...DEFAULT_PRICING_CONFIG.addons.property_filters,
        category: "ecommerce",
        price: 10_000,
      },
    },
  };
  const starter = calculateInquiryScopeEstimate(makeInquiry({
    projectTypes: ["E-commerce store"],
    problemToSolve: "Launch an online store with product checkout.",
    pricingPackage: "ecommerce_starter",
    selectedAddons: ["admin_dashboard", "supabase_db", "payment_gateway"],
  }), packageSpecificConfig);
  const business = calculateInquiryScopeEstimate(makeInquiry({
    projectTypes: ["E-commerce store"],
    problemToSolve: "Launch an online store with advanced property filters.",
    pricingPackage: "ecommerce_business",
  }), packageSpecificConfig);

  assert.equal(starter.calculation?.estimatedTotal, 100_000);
  assert.deepEqual(starter.calculation?.selectedAddonDetails, []);
  assert.ok(starter.includedFeatures.includes("Admin Dashboard"));
  assert.equal(business.calculation?.estimatedTotal, 162_500);
  assert.equal(business.pricingSnapshot.addonPrices.property_filters, 12_500);
});

test("E-Commerce Advanced retains its published starting range and requests admin review", () => {
  const estimate = calculateInquiryScopeEstimate(makeInquiry({
    projectTypes: ["E-commerce store"],
    problemToSolve: "Launch an online store.",
    pricingPackage: "ecommerce_advanced",
  }));

  assert.equal(estimate.calculation?.estimatedTotal, 200_000);
  assert.equal(estimate.maximumEstimatedTotal, 300_000);
  assert.equal(estimate.estimateStatus, "admin_review_required");
});

test("SaaS package choices use the published package rates", () => {
  const starter = calculateInquiryScopeEstimate(makeInquiry({
    projectTypes: ["SaaS"],
    problemToSolve: "Build a SaaS platform.",
  }));
  const business = calculateInquiryScopeEstimate(makeInquiry({
    projectTypes: ["SaaS"],
    problemToSolve: "Build a SaaS business platform.",
    pricingPackage: "saas_business",
  }));
  const enterprise = calculateInquiryScopeEstimate(makeInquiry({
    projectTypes: ["SaaS"],
    problemToSolve: "Build a SaaS enterprise platform.",
    pricingPackage: "saas_enterprise",
  }));

  assert.equal(starter.calculation?.estimatedTotal, 250_000);
  assert.equal(business.calculation?.estimatedTotal, 500_000);
  assert.equal(enterprise.calculation?.estimatedTotal, 1_000_000);
});

test("admin dashboard add-on and dynamic published prices use the current pricing configuration", () => {
  const config = withAddonPrice("property_filters", 12_500, {
    ...DEFAULT_PRICING_CONFIG,
    baseWithoutAdmin: 40_000,
  });
  const estimate = calculateInquiryScopeEstimate(makeInquiry({
    projectTypes: ["Real estate business website"],
    problemToSolve: "Build a property listing website with advanced property filters.",
  }), config);

  assert.equal(estimate.calculation?.basePrice, 40_000);
  assert.equal(estimate.calculation?.selectedAddonDetails[0]?.price, 12_500);
  assert.equal(estimate.calculation?.estimatedTotal, 52_500);
});

test("international estimates use the existing doubled-base and fixed regional add-on conversion rules", () => {
  const estimate = calculateInquiryScopeEstimate(makeInquiry({
    projectTypes: ["Real estate website"],
    problemToSolve: "Build a real estate website with advanced property filters.",
    currency: "USD",
    internationalPricing: true,
    exchangeRate: 0.00036,
  }));

  assert.equal(estimate.calculation?.estimatedTotal, 45_000);
  assert.equal(estimate.regionalCalculation?.basePrice, 25.2);
  assert.equal(estimate.regionalCalculation?.selectedAddonDetails[0]?.price, 100);
  assert.equal(estimate.regionalCalculation?.estimatedTotal, 125.2);
  assert.equal(estimate.currency, "USD");
});

test("missing exchange rates preserve the PKR audit amount and require admin review", () => {
  const estimate = calculateInquiryScopeEstimate(makeInquiry({
    projectTypes: ["Business website"],
    problemToSolve: "Build a business website.",
    currency: "EUR",
    internationalPricing: true,
  }));

  assert.equal(estimate.calculation?.estimatedTotal, 35_000);
  assert.equal(estimate.currency, "PKR");
  assert.equal(estimate.regionalCalculation, undefined);
  assert.equal(estimate.estimateStatus, "admin_review_required");
  assert.ok(estimate.reviewReasons.some((reason) => reason.includes("currency conversion is unavailable")));
});

test("adjusted estimates are recalculated independently without mutating customer-submitted pricing", () => {
  const inquiry = makeInquiry({
    projectTypes: ["Real estate website"],
    problemToSolve: "Build a real estate website with advanced property filters.",
    calculation: calculateBudget("none", []),
  });
  const originalCalculation = structuredClone(inquiry.calculation);
  const original = calculateInquiryScopeEstimate(inquiry);
  const adjusted = calculateInquiryScopeEstimate(inquiry, DEFAULT_PRICING_CONFIG, {
    selection: {
      packageId: "package_2",
      addonIds: [],
    },
  });

  assert.equal(original.calculation?.estimatedTotal, 45_000);
  assert.equal(adjusted.calculation?.estimatedTotal, 45_000);
  assert.equal(adjusted.pricingPackageId, "package_2");
  assert.deepEqual(inquiry.calculation, originalCalculation);
});

test("admin estimate saves keep customer prices separate and ignore client-supplied amounts", async () => {
  const inquiry = makeInquiry({
    projectTypes: ["Real estate website"],
    problemToSolve: "Build a real estate website with advanced property filters.",
  });
  let current = inquiry;
  const updates: Partial<Inquiry>[] = [];
  const originalGetPricingConfig = DataStore.getPricingConfig;
  const originalGetInquiryById = DataStore.getInquiryById;
  const originalUpdateInquiry = DataStore.updateInquiry;
  DataStore.getPricingConfig = () => DEFAULT_PRICING_CONFIG;
  DataStore.getInquiryById = () => current;
  DataStore.updateInquiry = (_id, patch) => {
    updates.push(patch);
    current = { ...current, ...patch };
    return current;
  };

  try {
    await withEnvironment({
      NODE_ENV: "test",
      SESSION_SECRET: "isolated-inquiry-estimate-test-secret",
      NEXT_PUBLIC_SUPABASE_URL: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
    }, async () => {
      const cookie = `dwd_admin_session=${signToken({ email: "test-admin", timestamp: Date.now() })}`;
      const response = await patchAdminInquiry(new NextRequest("http://localhost/api/admin/inquiries", {
        method: "PATCH",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({
          id: inquiry.id,
          scopeEstimateAdjustment: {
            packageId: "package_1",
            addonIds: ["property_filters"],
            estimatedTotal: 1,
            calculation: { estimatedTotal: 1 },
          },
        }),
      }));
      const result = await response.json();

      assert.equal(response.status, 200);
      assert.equal(result.inquiry.originalScopeEstimate.calculation.estimatedTotal, 45_000);
      assert.equal(result.inquiry.adminScopeEstimate.calculation.estimatedTotal, 45_000);
      assert.equal(result.inquiry.calculation.estimatedTotal, inquiry.calculation.estimatedTotal);
      assert.equal(updates.length, 1);
      assert.equal(updates[0].originalScopeEstimate?.pricingSnapshot.basePrice, 35_000);
      assert.equal(updates[0].adminScopeEstimate?.selectedAddonIds[0], "property_filters");

      current = { ...current, status: "Quotation Sent" };
      const locked = await patchAdminInquiry(new NextRequest("http://localhost/api/admin/inquiries", {
        method: "PATCH",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({
          id: inquiry.id,
          scopeEstimateAdjustment: { packageId: "package_2", addonIds: [] },
        }),
      }));
      assert.equal(locked.status, 409);
      assert.equal(updates.length, 1);
    });
  } finally {
    DataStore.getPricingConfig = originalGetPricingConfig;
    DataStore.getInquiryById = originalGetInquiryById;
    DataStore.updateInquiry = originalUpdateInquiry;
  }
});
