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
import { isValidCreativeStudioConfig } from "../src/lib/creative-studio-storage";
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
    languageCount: 1,
    addonIds: [],
    ...overrides,
  };
}

function validInquiryForm(file?: File): FormData {
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
    brief: "A test project brief for Creative Studio validation.",
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
