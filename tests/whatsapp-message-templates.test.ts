import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { NextRequest } from "next/server";
import { GET as getTemplates, PUT as putTemplate } from "../src/app/api/admin/whatsapp-templates/route";
import { DEFAULT_CREATIVE_STUDIO_CONFIG } from "../src/lib/creative-studio";
import type { CreativeInquiry } from "../src/lib/creative-studio";
import type { Inquiry } from "../src/lib/types";
import { signToken } from "../src/lib/auth";
import {
  buildWhatsAppTemplateLink,
  createTemplatePreviewValues,
  getCreativeInquiryTemplateValues,
  getWebsiteInquiryTemplateValues,
  getWhatsAppReadyReplyOptions,
  renderWhatsAppTemplate,
  validateWhatsAppTemplateContent,
  WHATSAPP_TEMPLATE_DEFAULTS,
} from "../src/lib/whatsapp-message-templates";
import {
  getWhatsAppTemplates,
  resetWhatsAppTemplate,
  saveWhatsAppTemplate,
} from "../src/lib/whatsapp-message-template-storage";

const websiteInquiry: Inquiry = {
  id: "DW-123456",
  createdAt: "2026-10-30T12:00:00.000Z",
  updatedAt: "2026-10-30T12:00:00.000Z",
  status: "New Inquiry",
  customerName: "Ayesha Example",
  businessName: "Example Foods",
  email: "customer@example.test",
  phone: "+923001234567",
  cityCountry: "Lahore, Pakistan",
  preferredContact: "whatsapp",
  customerIntro: "",
  projectTypes: ["E-commerce website"],
  problemToSolve: "Accept online orders",
  targetAudience: "Local customers",
  productsServices: "Packaged food",
  inspirationUrl: "https://example.test/shop",
  isNewOrUpgrade: "new",
  preferredLaunchDate: "6 weeks",
  expectedBudgetRange: "PKR 100,000–150,000",
  displayFixedOnly: false,
  needsProductCatalog: true,
  productFeatures: ["variants"],
  acceptOrdersOnline: true,
  orderFeatures: ["cart", "checkout"],
  needsReviewsOrAccounts: false,
  adminPanelType: "client_admin",
  adminFeatures: ["Manage orders"],
  selectedAddons: ["seo_setup"],
  calculation: {
    basePrice: 100_000,
    adminFee: 0,
    addonsTotal: 0,
    selectedAddonDetails: [],
    monthlyAddonTotal: 0,
    contingencyAmount: 0,
    estimatedTotal: 100_000,
    advanceAmount: 25_000,
    remainingBalance: 75_000,
    installmentsCount: 3,
    regularInstallment: 25_000,
    finalInstallment: 25_000,
    dailyCost: 0,
  },
  disclaimerAccepted: true,
};

const creativeInquiry: CreativeInquiry = {
  id: "CS-123456",
  createdAt: "2026-10-30T12:00:00.000Z",
  updatedAt: "2026-10-30T12:00:00.000Z",
  status: "NEW_INQUIRY",
  customer: {
    name: "Brand Example",
    email: "creative@example.test",
    whatsapp: "+447700900123",
    country: "United Kingdom",
    customerType: "Brand",
    company: "Example Skincare",
    preferredDeliveryDate: "",
  },
  project: {
    country: "United Kingdom",
    currency: "GBP",
    projectKind: "image",
    categoryId: "business",
    subcategory: "Product Photography",
    durationSeconds: 60,
    imageCount: 10,
    complexity: "premium",
    quality: "4K",
    aspectRatio: "4:5",
    languageCount: 1,
    addonIds: [],
    style: "Clean luxury",
    vision: "",
    brief: "Create a premium product campaign.",
    languages: {},
    resolution: "4K",
    referenceFiles: [],
  },
  quote: {
    currency: "GBP",
    total: 250,
    base: 250,
    categoryCharge: 0,
    complexityCharge: 0,
    qualityCharge: 0,
    aspectRatioCharge: 0,
    addonCharges: [],
    requiresManualReview: false,
    reason: null,
    delivery: "4–6 working days",
    featureFilmReview: false,
  },
  quoteSnapshot: DEFAULT_CREATIVE_STUDIO_CONFIG,
  adminNotes: "",
  activity: [],
};

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

test("website and Creative Studio maps use only their own inquiry records", () => {
  const websiteValues = getWebsiteInquiryTemplateValues(websiteInquiry);
  const creativeValues = getCreativeInquiryTemplateValues(creativeInquiry);

  assert.equal(websiteValues.customer_name, "Ayesha Example");
  assert.equal(websiteValues.website_type, "- E-commerce website");
  assert.match(String(websiteValues.project_description), /Accept online orders/);
  assert.equal(creativeValues.customer_name, "Brand Example");
  assert.equal(creativeValues.service_category, "Business & commercial / Product Photography");
  assert.equal(creativeValues.deliverables, "10 AI-generated images");
  assert.equal(creativeValues.target_audience, "Not provided");
  assert.notEqual(String(websiteValues.customer_name), String(creativeValues.customer_name));

  const websiteReplies = getWhatsAppReadyReplyOptions("website_development", websiteValues, {
    name: "Website Custom",
    content: "Website details for {customer_name}: {project_description}",
  });
  const creativeReplies = getWhatsAppReadyReplyOptions("creative_studio", creativeValues);
  assert.ok(websiteReplies.length >= 4);
  assert.ok(creativeReplies.length >= 4);
  assert.match(websiteReplies[0].message, /Ayesha Example/);
  assert.match(websiteReplies[0].message, /DW-123456/);
  assert.match(creativeReplies[0].message, /Brand Example/);
  assert.match(creativeReplies[0].message, /CS-123456/);
  const customReply = websiteReplies.find((reply) => reply.id === "saved_custom");
  assert.equal(customReply?.label, "Inquiry details: Website Custom");
  assert.match(customReply?.message || "", /Website details for Ayesha Example/);
  assert.ok(!creativeReplies.some((reply) => reply.id === "saved_custom"));
});

test("template rendering preserves formatting, handles missing values, and validates variables", () => {
  const content = "Hello {customer_name}\nBrief:\n{project_description}\nBudget: {budget}";
  const rendered = renderWhatsAppTemplate(content, {
    customer_name: "Customer & Co.",
    project_description: "First line\nSecond line",
    budget: null,
  });

  assert.equal(rendered, "Hello Customer & Co.\nBrief:\nFirst line\nSecond line\nBudget: Not provided");
  assert.equal(
    validateWhatsAppTemplateContent("website_development", "{unknown_secret}"),
    "Unsupported template variable: {unknown_secret}"
  );
  assert.equal(validateWhatsAppTemplateContent("creative_studio", "Broken {project_title"), "Template contains an incomplete variable placeholder.");
  assert.equal(
    validateWhatsAppTemplateContent(
      "website_development",
      WHATSAPP_TEMPLATE_DEFAULTS.website_development.content
    ),
    null
  );
  assert.equal(
    validateWhatsAppTemplateContent(
      "creative_studio",
      WHATSAPP_TEMPLATE_DEFAULTS.creative_studio.content
    ),
    null
  );
  assert.equal(
    renderWhatsAppTemplate("{customer_name}", createTemplatePreviewValues("creative_studio")),
    "Not provided"
  );
});

test("WhatsApp links encode symbols and line breaks and address the selected customer's phone", () => {
  const message = "Line 1 & details\nLine 2? yes";
  const link = buildWhatsAppTemplateLink(websiteInquiry.phone, message);
  assert.ok(link);
  assert.equal(new URL(link).pathname, "/923001234567");
  assert.equal(new URL(link).searchParams.get("text"), message);
  assert.equal(buildWhatsAppTemplateLink("not a phone", message), null);
  assert.equal(buildWhatsAppTemplateLink("03001234567", message), null);
});

test("saving either category does not overwrite the other and reset restores only that category", async () => {
  const directory = await mkdtemp(join(tmpdir(), "dwd-whatsapp-template-test-"));
  const dataFile = join(directory, "templates.json");
  try {
    await withEnvironment(
      {
        NODE_ENV: "test",
        WHATSAPP_TEMPLATE_DATA_FILE: dataFile,
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        SUPABASE_SERVICE_ROLE_KEY: undefined,
      },
      async () => {
        const websiteSaved = await saveWhatsAppTemplate(
          "website_development",
          { name: "Website Custom", content: "Website {customer_name}" },
          "test-admin"
        );
        assert.equal(websiteSaved.name, "Website Custom");

        const creativeSaved = await saveWhatsAppTemplate(
          "creative_studio",
          { name: "Creative Custom", content: "Creative {project_title}" },
          "test-admin"
        );
        assert.equal(creativeSaved.name, "Creative Custom");

        const templates = await getWhatsAppTemplates();
        assert.equal(templates.find((item) => item.category === "website_development")?.content, "Website {customer_name}");
        assert.equal(templates.find((item) => item.category === "creative_studio")?.content, "Creative {project_title}");

        const resetWebsite = await resetWhatsAppTemplate("website_development");
        assert.equal(resetWebsite.content, WHATSAPP_TEMPLATE_DEFAULTS.website_development.content);
        const afterReset = await getWhatsAppTemplates();
        assert.equal(afterReset.find((item) => item.category === "creative_studio")?.content, "Creative {project_title}");
        assert.equal(
          afterReset.find((item) => item.category === "website_development")?.content,
          WHATSAPP_TEMPLATE_DEFAULTS.website_development.content
        );
      }
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("authenticated template API validates variables and persists categories independently", async () => {
  const directory = await mkdtemp(join(tmpdir(), "dwd-whatsapp-template-api-test-"));
  const dataFile = join(directory, "templates.json");
  try {
    await withEnvironment(
      {
        NODE_ENV: "test",
        SESSION_SECRET: "isolated-whatsapp-template-test-session-secret",
        WHATSAPP_TEMPLATE_DATA_FILE: dataFile,
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        SUPABASE_SERVICE_ROLE_KEY: undefined,
      },
      async () => {
        const cookie = `dwd_admin_session=${signToken({ email: "test-admin", timestamp: Date.now() })}`;
        const invalid = await putTemplate(new NextRequest("http://localhost/api/admin/whatsapp-templates", {
          method: "PUT",
          headers: { "content-type": "application/json", cookie },
          body: JSON.stringify({
            category: "website_development",
            name: "Invalid",
            content: "Bad {unknown_variable}",
          }),
        }));
        assert.equal(invalid.status, 400);

        const save = await putTemplate(new NextRequest("http://localhost/api/admin/whatsapp-templates", {
          method: "PUT",
          headers: { "content-type": "application/json", cookie },
          body: JSON.stringify({
            category: "creative_studio",
            name: "Custom Creative",
            content: "Creative {project_title}",
          }),
        }));
        assert.equal(save.status, 200);

        const get = await getTemplates(new NextRequest("http://localhost/api/admin/whatsapp-templates", {
          headers: { cookie },
        }));
        const result = await get.json();
        assert.equal(result.templates.find((item: { category: string }) => item.category === "creative_studio").content, "Creative {project_title}");
        assert.equal(result.templates.find((item: { category: string }) => item.category === "website_development").content, WHATSAPP_TEMPLATE_DEFAULTS.website_development.content);

        const reset = await putTemplate(new NextRequest("http://localhost/api/admin/whatsapp-templates", {
          method: "PUT",
          headers: { "content-type": "application/json", cookie },
          body: JSON.stringify({ category: "creative_studio", reset: true }),
        }));
        assert.equal(reset.status, 200);
      }
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("template management API rejects unauthenticated reads and writes", async () => {
  const getResponse = await getTemplates(new NextRequest("http://localhost/api/admin/whatsapp-templates"));
  const putResponse = await putTemplate(new NextRequest("http://localhost/api/admin/whatsapp-templates", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ category: "website_development", reset: true }),
  }));
  assert.equal(getResponse.status, 401);
  assert.equal(putResponse.status, 401);
});
