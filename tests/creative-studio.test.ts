import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import {
  calculateCreativeQuote,
  CREATIVE_ADDON_NAMES,
  CREATIVE_CATEGORIES,
  DEFAULT_CREATIVE_STUDIO_CONFIG,
  getCreativeInquiryTransitions,
  VIDEO_DURATIONS,
} from "../src/lib/creative-studio";
import type { CreativeQuoteInput, CreativeStudioConfig } from "../src/lib/creative-studio";
import {
  calculateCreativeStudioEstimate,
  isCreativeEstimateAdjustmentAllowed,
} from "../src/lib/creative-studio-estimate";
import {
  createCreativeInquiryId,
  createCreativeTrackingToken,
  isValidCreativeStudioConfig,
} from "../src/lib/creative-studio-storage";
import { isValidCreativeReferenceFile } from "../src/lib/creative-reference-files";
import { GET as getAdminCreativeInquiries } from "../src/app/api/admin/creative-studio/route";
import { POST as submitCreativeInquiry } from "../src/app/api/public/creative-studio/inquiries/route";

function input(overrides: Partial<CreativeQuoteInput> = {}): CreativeQuoteInput {
  return {
    country: "Pakistan",
    currency: "PKR",
    projectKind: "video",
    categoryId: "social",
    subcategory: "Instagram Reels",
    durationSeconds: 60,
    imageCount: 1,
    complexity: "standard",
    quality: "1080p",
    aspectRatio: "9:16",
    languageCount: 1,
    addonIds: [],
    ...overrides,
  };
}

function estimateFor(
  quoteInput: CreativeQuoteInput = input(),
  config: CreativeStudioConfig = DEFAULT_CREATIVE_STUDIO_CONFIG,
  overrides: {
    brief?: string;
    vision?: string;
    languages?: Record<string, string>;
    customerType?: string;
    company?: string;
  } = {}
) {
  return calculateCreativeStudioEstimate({
    inquiryId: "DAC-2026-123456",
    estimateId: "DAC-2026-123456-original",
    calculatedAt: "2026-01-01T00:00:00.000Z",
    input: quoteInput,
    config,
    customer: {
      name: "Test Customer",
      email: "customer@example.test",
      whatsapp: "+923001234567",
      country: "Pakistan",
      customerType: overrides.customerType || "Individual",
      company: overrides.company || "",
      preferredDeliveryDate: "",
    },
    project: {
      brief: overrides.brief || "Create a promotional video for a local business launch campaign.",
      vision: overrides.vision ?? "Bright, modern commercial visuals.",
      languages: overrides.languages || { video: "English" },
      referenceFiles: [],
    },
  });
}

function validInquiryForm(file?: File, brief = "A test project brief for Creative Studio validation."): FormData {
  const form = new FormData();
  form.set("customer", JSON.stringify({
    name: "Test Customer",
    email: "customer@example.test",
    whatsapp: "+923001234567",
    country: "Pakistan",
    customerType: "Individual",
  }));
  form.set("project", JSON.stringify({
    quoteInput: input({ durationSeconds: 30 }),
    brief,
    vision: "",
    style: "Cinematic",
    languages: { video: "English" },
    resolution: "1080p",
    aspectRatio: "9:16",
  }));
  if (file) form.append("references", file);
  return form;
}

function requestWithForm(form: FormData): NextRequest {
  return new NextRequest("http://localhost/api/public/creative-studio/inquiries", {
    method: "POST",
    headers: {
      "x-forwarded-for": `192.0.2.${Math.floor(Math.random() * 250) + 1}`,
    },
    body: form,
  });
}

test("the configured duration choices cover the specified 10-second to 150-minute range", () => {
  assert.equal(VIDEO_DURATIONS[0].seconds, 10);
  assert.equal(VIDEO_DURATIONS.at(-1)?.seconds, 9000);
  assert.deepEqual(VIDEO_DURATIONS.map(({ seconds }) => seconds), [
    10, 20, 30, 40, 50, 60, 120, 180, 300, 600, 900, 1200, 1500,
    1800, 2700, 3600, 5400, 7200, 9000,
  ]);
});

test("video quotes prorate the country rate and round to the nearest hundred", () => {
  const tenSeconds = calculateCreativeQuote(input({ durationSeconds: 10 }), DEFAULT_CREATIVE_STUDIO_CONFIG);
  const thirtySeconds = calculateCreativeQuote(input({ durationSeconds: 30 }), DEFAULT_CREATIVE_STUDIO_CONFIG);
  const oneMinute = calculateCreativeQuote(input(), DEFAULT_CREATIVE_STUDIO_CONFIG);

  assert.equal(tenSeconds.base, 1700);
  assert.equal(tenSeconds.total, 1700);
  assert.equal(thirtySeconds.base, 5000);
  assert.equal(thirtySeconds.total, 5000);
  assert.equal(oneMinute.base, 10000);
  assert.equal(oneMinute.total, 10000);
});

test("complexity, resolution, and aspect ratio all affect the video estimate", () => {
  const standard = calculateCreativeQuote(input(), DEFAULT_CREATIVE_STUDIO_CONFIG);
  const advanced = calculateCreativeQuote(input({ complexity: "advanced" }), DEFAULT_CREATIVE_STUDIO_CONFIG);
  const premiumResolution = calculateCreativeQuote(input({ quality: "4K" }), DEFAULT_CREATIVE_STUDIO_CONFIG);
  const horizontal = calculateCreativeQuote(input({ aspectRatio: "16:9" }), DEFAULT_CREATIVE_STUDIO_CONFIG);
  const customRatio = calculateCreativeQuote(input({ aspectRatio: "4:3" }), DEFAULT_CREATIVE_STUDIO_CONFIG);

  assert.equal(standard.total, 10000);
  assert.equal(advanced.total, 15000);
  assert.equal(premiumResolution.total, 15000);
  assert.equal(horizontal.total, 11000);
  assert.equal(customRatio.total, 11500);
  assert.equal(horizontal.aspectRatioCharge, 1000);
});

test("long video estimates use the configured Pakistan per-minute rate", () => {
  const thirtyMinutes = calculateCreativeQuote(input({
    durationSeconds: 1800,
  }), DEFAULT_CREATIVE_STUDIO_CONFIG);

  assert.equal(thirtyMinutes.base, 300000);
  assert.equal(thirtyMinutes.total, 300000);
});

test("configured fixed add-ons are included in the server-calculable estimate", () => {
  const addon = DEFAULT_CREATIVE_STUDIO_CONFIG.addons[0];
  const config: CreativeStudioConfig = {
    ...DEFAULT_CREATIVE_STUDIO_CONFIG,
    addons: DEFAULT_CREATIVE_STUDIO_CONFIG.addons.map((item, index) =>
      index === 0 ? { ...item, billingUnit: "fixed", price: 250 } : item
    ),
  };
  const quote = calculateCreativeQuote(input({ addonIds: [addon.id] }), config);

  assert.equal(quote.addonCharges[0].amount, 300);
  assert.equal(quote.total, 10300);
});

test("an unsupported country and currency combination requires manual review", () => {
  const quote = calculateCreativeQuote(input({
    country: "United States",
    currency: "USD",
  }), DEFAULT_CREATIVE_STUDIO_CONFIG);

  assert.equal(quote.total, null);
  assert.equal(quote.requiresManualReview, true);
});

test("category and complexity multipliers compose on the base amount", () => {
  const config: CreativeStudioConfig = {
    ...DEFAULT_CREATIVE_STUDIO_CONFIG,
    categoryMultipliers: { ...DEFAULT_CREATIVE_STUDIO_CONFIG.categoryMultipliers, film: 2 },
    complexityMultipliers: { ...DEFAULT_CREATIVE_STUDIO_CONFIG.complexityMultipliers, advanced: 1.5 },
  };
  const quote = calculateCreativeQuote(input({
    categoryId: "film",
    subcategory: "Short Films",
    complexity: "advanced",
  }), config);

  assert.equal(quote.base, 10000);
  assert.equal(quote.categoryCharge, 10000);
  assert.equal(quote.complexityCharge, 10000);
  assert.equal(quote.total, 30000);
});

test("missing country and image rates require a manual quote", () => {
  const unknownCountry = calculateCreativeQuote(input({
    country: "Japan",
    currency: "JPY",
  }), DEFAULT_CREATIVE_STUDIO_CONFIG);
  const unpricedImage = calculateCreativeQuote(input({
    projectKind: "image",
    subcategory: "Social Media Images",
  }), DEFAULT_CREATIVE_STUDIO_CONFIG);

  assert.equal(unknownCountry.total, null);
  assert.equal(unknownCountry.requiresManualReview, true);
  assert.equal(unpricedImage.total, null);
  assert.equal(unpricedImage.base, null);
});

test("custom add-ons are deduplicated and require a manual quote", () => {
  const addonId = DEFAULT_CREATIVE_STUDIO_CONFIG.addons.find(
    (addon) => addon.name === CREATIVE_ADDON_NAMES[0]
  )!.id;
  const quote = calculateCreativeQuote(input({
    addonIds: [addonId, addonId],
  }), DEFAULT_CREATIVE_STUDIO_CONFIG);

  assert.equal(quote.addonCharges.length, 1);
  assert.equal(quote.addonCharges[0].amount, null);
  assert.equal(quote.total, null);
});

test("estimate snapshots reuse verified pricing and capture a complete line breakdown", () => {
  const estimate = estimateFor();

  assert.equal(estimate.estimatedTotal, 10000);
  assert.equal(estimate.subtotal, 10000);
  assert.equal(estimate.currency, "PKR");
  assert.equal(estimate.pricingCatalogVersion, DEFAULT_CREATIVE_STUDIO_CONFIG.version);
  assert.equal(estimate.status, "ESTIMATED");
  assert.equal(estimate.confidence, "HIGH");
  assert.deepEqual(estimate.lines.map((line) => [line.id, line.amount]), [["service-base", 10000]]);
  assert.equal(estimate.matchedPackage, null);
});

test("estimate snapshot quantity, resolution, aspect ratio, and complexity use the existing calculator", () => {
  const advanced = estimateFor(input({
    durationSeconds: 120,
    complexity: "advanced",
    quality: "4K",
    aspectRatio: "16:9",
  }));
  const directQuote = calculateCreativeQuote(input({
    durationSeconds: 120,
    complexity: "advanced",
    quality: "4K",
    aspectRatio: "16:9",
  }), DEFAULT_CREATIVE_STUDIO_CONFIG);

  assert.equal(advanced.quantity.value, 120);
  assert.equal(advanced.estimatedTotal, directQuote.total);
  assert.equal(advanced.estimatedTotal, 49500);
  assert.deepEqual(advanced.lines.map((line) => line.id), [
    "service-base", "complexity", "quality", "aspect-ratio",
  ]);
});

test("unpriced image services, MVP scope, and custom add-ons never become numeric totals", () => {
  const image = estimateFor(input({ projectKind: "image", subcategory: "Product Images" }));
  const mvp = estimateFor(input({
    projectKind: "mvp",
    categoryId: "ai-development",
    subcategory: "SaaS Product Prototype",
  }));
  const customAddon = estimateFor(input({
    addonIds: [DEFAULT_CREATIVE_STUDIO_CONFIG.addons[0].id],
  }));

  assert.equal(image.estimatedTotal, null);
  assert.equal(image.status, "ADMIN_REVIEW_REQUIRED");
  assert.equal(mvp.estimatedTotal, null);
  assert.equal(mvp.status, "ADMIN_REVIEW_REQUIRED");
  assert.equal(customAddon.estimatedTotal, null);
  assert.equal(customAddon.status, "ADMIN_REVIEW_REQUIRED");
  assert.ok(customAddon.unpricedRequirements.length > 0);
});

test("mentioned but unselected add-ons and invalid service IDs are flagged for review", () => {
  const mentionedAddon = estimateFor(input(), DEFAULT_CREATIVE_STUDIO_CONFIG, {
    brief: "Please include AI voiceover and captions in this video project scope.",
  });
  const invalidAddon = estimateFor(input({ addonIds: ["not-in-catalog"] }));
  const invalidService = estimateFor(input({ subcategory: "Made-up deliverable" }));

  assert.equal(mentionedAddon.estimatedTotal, null);
  assert.match(mentionedAddon.unpricedRequirements.join(" "), /mentioned in the brief/);
  assert.equal(invalidAddon.estimatedTotal, null);
  assert.match(invalidAddon.unpricedRequirements.join(" "), /not available/);
  assert.equal(invalidService.status, "INSUFFICIENT_INFORMATION");
  assert.equal(invalidService.estimatedTotal, null);
});

test("missing scope detail is identified without changing the catalog-calculated amount", () => {
  const estimate = estimateFor(input(), DEFAULT_CREATIVE_STUDIO_CONFIG, {
    vision: "",
    languages: {},
  });

  assert.equal(estimate.estimatedTotal, 10000);
  assert.equal(estimate.status, "NEEDS_FOLLOW_UP");
  assert.deepEqual(estimate.missingInformation, [
    "Visual direction or creative vision",
    "Preferred production language",
  ]);
});

test("estimate adjustment remains separate from the original and locks after quote approval or payment", () => {
  const original = estimateFor();
  const adjusted = estimateFor(input({ durationSeconds: 120 }));
  const inquiry = {
    status: "UNDER_REVIEW" as const,
    originalEstimate: original,
    adminEstimateAdjustment: {
      estimate: adjusted,
      reason: "Customer confirmed a longer deliverable.",
      adjustedAt: "2026-01-02T00:00:00.000Z",
      adjustedBy: "admin@example.test",
    },
  };
  const lockedByApproval = {
    ...inquiry,
    status: "AWAITING_PAYMENT" as const,
    customerQuoteApprovedAt: "2026-01-03T00:00:00.000Z",
  };
  const lockedByPayment = {
    ...inquiry,
    status: "PAYMENT_RECEIVED" as const,
    paymentVerifiedAt: "2026-01-04T00:00:00.000Z",
  };

  assert.equal(isCreativeEstimateAdjustmentAllowed(inquiry), true);
  assert.equal(isCreativeEstimateAdjustmentAllowed(lockedByApproval), false);
  assert.equal(isCreativeEstimateAdjustmentAllowed(lockedByPayment), false);
  assert.equal(inquiry.originalEstimate.estimatedTotal, 10000);
  assert.equal(inquiry.adminEstimateAdjustment.estimate.estimatedTotal, 20000);
});

test("feature-film selections retain an indicative amount and require review", () => {
  const quote = calculateCreativeQuote(input({
    categoryId: "film",
    subcategory: "Feature Films",
    durationSeconds: 5400,
  }), DEFAULT_CREATIVE_STUDIO_CONFIG);

  assert.equal(quote.base, 900000);
  assert.equal(quote.total, 2700000);
  assert.equal(quote.featureFilmReview, true);
  assert.equal(quote.requiresManualReview, true);
});

test("150-minute feature film estimates use feature-film pricing and require review", () => {
  const quote = calculateCreativeQuote(input({
    categoryId: "film",
    subcategory: "Feature Films",
    durationSeconds: 9000,
  }), DEFAULT_CREATIVE_STUDIO_CONFIG);

  assert.equal(quote.base, 1500000);
  assert.equal(quote.total, 4500000);
  assert.equal(quote.featureFilmReview, true);
  assert.equal(quote.requiresManualReview, true);
});

test("category options and add-on catalog are populated", () => {
  assert.equal(CREATIVE_CATEGORIES.length, 11);
  assert.equal(CREATIVE_ADDON_NAMES.length, 30);
});

test("inquiry status transitions cannot skip approval and production stages", () => {
  assert.deepEqual(getCreativeInquiryTransitions("NEW_INQUIRY"), [
    "UNDER_REVIEW", "NEEDS_MORE_INFORMATION", "ON_HOLD", "CANCELLED",
  ]);
  assert.deepEqual(getCreativeInquiryTransitions("ADMIN_APPROVED"), [
    "READY_FOR_PRODUCTION", "ON_HOLD", "CANCELLED",
  ]);
  assert.deepEqual(getCreativeInquiryTransitions("QUALITY_REVIEW"), [
    "REVISION_REQUESTED", "APPROVED_FOR_DELIVERY", "ON_HOLD", "CANCELLED",
  ]);
  assert.deepEqual(getCreativeInquiryTransitions("ON_HOLD", "IN_PRODUCTION"), [
    "IN_PRODUCTION", "CANCELLED",
  ]);
  assert.deepEqual(getCreativeInquiryTransitions("COMPLETED"), []);
  assert.deepEqual(getCreativeInquiryTransitions("CANCELLED"), []);
});

test("pricing configuration validation rejects malformed records without throwing", () => {
  assert.equal(isValidCreativeStudioConfig(DEFAULT_CREATIVE_STUDIO_CONFIG), true);
  assert.equal(isValidCreativeStudioConfig({
    ...DEFAULT_CREATIVE_STUDIO_CONFIG,
    aspectRatioMultipliers: undefined,
  }), true);
  assert.equal(isValidCreativeStudioConfig({
    ...DEFAULT_CREATIVE_STUDIO_CONFIG,
    countries: [null],
  }), false);
  assert.equal(isValidCreativeStudioConfig({
    ...DEFAULT_CREATIVE_STUDIO_CONFIG,
    addons: [{}, {}],
  }), false);
});

test("public inquiry endpoint rejects malformed form data without reporting success", async () => {
  const request = new NextRequest("http://localhost/api/public/creative-studio/inquiries", {
    method: "POST",
    headers: {
      "content-type": "multipart/form-data; boundary=invalid",
      "x-forwarded-for": `192.0.2.${Math.floor(Math.random() * 250) + 1}`,
    },
    body: "not a multipart form",
  });

  const response = await submitCreativeInquiry(request);
  const result = await response.json();

  assert.equal(response.status, 400);
  assert.equal(result.success, false);
});

test("Creative Studio submission retry keys produce a stable private inquiry ID and tracking token", () => {
  const key = "0e8d8a28-c5ef-4f4e-b13b-a9e57588d2a4";
  const firstId = createCreativeInquiryId(key);
  const firstToken = createCreativeTrackingToken(key);

  assert.match(firstId, /^DAC-\d{4}-[A-F0-9]{16}$/);
  assert.equal(createCreativeInquiryId(key), firstId);
  assert.match(firstToken, /^[A-Za-z0-9_-]{32,100}$/);
  assert.equal(createCreativeTrackingToken(key), firstToken);
  assert.notEqual(firstToken, key);
});

test("public inquiry endpoint rejects malformed add-on selections instead of silently dropping them", async () => {
  const form = validInquiryForm();
  const project = JSON.parse(String(form.get("project"))) as {
    quoteInput: Record<string, unknown>;
  };
  project.quoteInput.addonIds = ["professional-scriptwriting", 42];
  form.set("project", JSON.stringify(project));

  const response = await submitCreativeInquiry(requestWithForm(form));
  const result = await response.json();

  assert.equal(response.status, 400);
  assert.equal(result.success, false);
});

test("public inquiry endpoint requires a non-empty project brief of at least 10 characters", async () => {
  for (const brief of ["", "         ", "Too short"]) {
    const response = await submitCreativeInquiry(requestWithForm(validInquiryForm(undefined, brief)));
    const result = await response.json();

    assert.equal(response.status, 400);
    assert.equal(result.success, false);
  }
});

test("admin inquiry endpoint rejects unauthenticated requests", async () => {
  const request = new NextRequest("http://localhost/api/admin/creative-studio", {
    method: "GET",
  });

  const response = await getAdminCreativeInquiries(request);
  const result = await response.json();

  assert.equal(response.status, 401);
  assert.equal(result.success, false);
});

test("public inquiry endpoint rejects a file extension that conflicts with its MIME type", async () => {
  const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], "reference.png", {
    type: "image/jpeg",
  });
  const response = await submitCreativeInquiry(requestWithForm(validInquiryForm(file)));
  const result = await response.json();

  assert.equal(response.status, 400);
  assert.equal(result.success, false);
});

test("public inquiry endpoint enforces the 10 MiB reference-file limit", async () => {
  const file = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "large.jpg", {
    type: "image/jpeg",
  });
  const response = await submitCreativeInquiry(requestWithForm(validInquiryForm(file)));
  const result = await response.json();

  assert.equal(response.status, 413);
  assert.equal(result.success, false);
});

test("reference validation accepts scripts and documents only when extension and signature match", () => {
  assert.equal(isValidCreativeReferenceFile("scene.txt", "text/plain", new TextEncoder().encode("Scene 1: opening")), true);
  assert.equal(isValidCreativeReferenceFile("captions.srt", "application/x-subrip", new TextEncoder().encode("1\n00:00:00,000 --> 00:00:01,000\nHello")), true);
  assert.equal(isValidCreativeReferenceFile("script.pdf", "application/pdf", new TextEncoder().encode("%PDF-1.7")), true);
  assert.equal(isValidCreativeReferenceFile("script.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", new Uint8Array([0x50, 0x4b, 0x03, 0x04])), true);
  assert.equal(isValidCreativeReferenceFile("script.jpg", "text/plain", new TextEncoder().encode("Scene 1")), false);
  assert.equal(isValidCreativeReferenceFile("script.txt", "text/plain", new Uint8Array([0xff, 0xfe, 0x00])), false);
});

test("public inquiry endpoint rejects more than 20 reference files", async () => {
  const form = validInquiryForm();
  for (let index = 0; index < 21; index += 1) {
    form.append("references", new File(["reference"], `reference-${index}.txt`, { type: "text/plain" }));
  }
  const response = await submitCreativeInquiry(requestWithForm(form));
  const result = await response.json();

  assert.equal(response.status, 400);
  assert.equal(result.success, false);
});
