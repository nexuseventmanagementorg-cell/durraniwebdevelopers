import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { NextRequest } from "next/server";
import { GET, PATCH, POST } from "../src/app/api/admin/workforce/sales-leads/route";
import * as SalesLeadRoute from "../src/app/api/admin/workforce/sales-leads/route";
import { signToken } from "../src/lib/auth";
import {
  addSalesLeadResearch,
  calculateSalesLeadScore,
  createSalesLead,
  DWD_SALES_SERVICES,
  reviewSalesLead,
  SALES_LEAD_FINDER_AGENT_ID,
  salesLeadDuplicateKeys,
  SalesLeadValidationError,
  validateSalesLeadRecord,
  type SalesLeadCreateInput,
} from "../src/lib/sales-leads";
import { DataStore } from "../src/lib/store";
import { SalesLeadStorageError } from "../src/lib/sales-lead-storage";
import { DWD_WORKFORCE_AGENTS } from "../src/lib/workforce-agents";
import type { SalesLeadRecord } from "../src/lib/types";

function createInput(overrides: Partial<SalesLeadCreateInput> = {}): SalesLeadCreateInput {
  return {
    businessName: "Example Business",
    country: "Pakistan",
    city: "Lahore",
    industry: "Retail",
    officialWebsite: "https://example-business.test",
    publicBusinessEmail: "hello@example-business.test",
    publicBusinessPhone: "+92 300 1234567",
    potentialDwdService: "WEBSITE_REDESIGN",
    serviceCompatibility: "COMPATIBLE",
    marketSuitability: "SUITABLE",
    websiteAvailability: "ONLINE",
    websiteQuality: "NEEDS_IMPROVEMENT",
    websiteOpportunityNote: "Admin observed a broken mobile navigation menu.",
    researchNotes: "Manual review of public business pages.",
    evidence: [
      { claim: "BUSINESS_IDENTITY", sourceUrl: "https://registry.example/business/1", observation: "Business name and country listed." },
      { claim: "OFFICIAL_WEBSITE", sourceUrl: "https://example-business.test/about", observation: "Business website identifies the organization." },
      { claim: "BUSINESS_PROFILE", sourceUrl: "https://directory.example/companies/example", observation: "Independent profile lists the business and market." },
      { claim: "BUSINESS_EMAIL", sourceUrl: "https://example-business.test/contact", observation: "Public business email displayed." },
      { claim: "BUSINESS_PHONE", sourceUrl: "https://example-business.test/contact", observation: "Public business phone displayed." },
      { claim: "WEBSITE_ASSESSMENT", sourceUrl: "https://audit-notes.example/report/1", observation: "Admin recorded a mobile navigation issue." },
      { claim: "SERVICE_OPPORTUNITY", sourceUrl: "https://audit-notes.example/report/1", observation: "Admin recorded a redesign opportunity." },
    ],
    ...overrides,
  };
}

test("Proposed SQL matches storage contract and restricts table privileges", () => {
  const migration = readFileSync(join(process.cwd(), "supabase", "sales-leads.sql"), "utf8");
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.sales_leads/i);
  assert.match(migration, /CHECK \(business_name ~ '\[\^\[:space:\]\]' AND char_length\(business_name\) <= 160\)/i);
  assert.match(migration, /CHECK \(country ~ '\[\^\[:space:\]\]' AND char_length\(country\) <= 100\)/i);
  assert.match(migration, /CHECK \(jsonb_typeof\(lead_data\) = 'object'\)/i);
  for (const field of ["id", "businessName", "country", "verificationStatus", "qualificationStatus", "createdAt", "updatedAt"]) {
    assert.ok(migration.includes(`lead_data->'${field}'`), `SQL must validate JSON field ${field}.`);
  }
  assert.match(migration, /CHECK \(updated_at >= created_at\)/i);
  assert.match(migration, /CREATE INDEX IF NOT EXISTS public\.idx_sales_leads_domain\s+ON public\.sales_leads \(normalized_domain\)/i);
  assert.doesNotMatch(migration, /CREATE UNIQUE INDEX[^;]*normalized_domain/i);
  assert.match(migration, /ALTER TABLE public\.sales_leads ENABLE ROW LEVEL SECURITY/i);
  assert.match(migration, /REVOKE ALL ON TABLE public\.sales_leads FROM PUBLIC, anon, authenticated/i);
  assert.match(migration, /GRANT SELECT, INSERT, UPDATE ON TABLE public\.sales_leads TO service_role/i);
  assert.doesNotMatch(migration, /GRANT[^;]*DELETE/i);
});

test("Agent 6 uses the original registry role and does not add a workforce role", () => {
  assert.equal(SALES_LEAD_FINDER_AGENT_ID, "sales-lead-finder");
  assert.equal(DWD_WORKFORCE_AGENTS.length, 50);
  const role = DWD_WORKFORCE_AGENTS.find((agent) => agent.avatar === SALES_LEAD_FINDER_AGENT_ID);
  assert.equal(role?.role, "Sales Lead Finder");
  assert.deepEqual(DWD_SALES_SERVICES, [
    "BUSINESS_WEBSITE", "CORPORATE_WEBSITE", "ECOMMERCE_WEBSITE", "CUSTOM_WEB_APPLICATION",
    "WEBSITE_REDESIGN", "LANDING_PAGE", "BOOKING_SYSTEM", "BUSINESS_AUTOMATION",
    "OTHER_VERIFIED_DWD_SERVICE",
  ]);
});

test("Manual intake validates required identifiers and leaves unknown data explicit", () => {
  const lead = createSalesLead({
    businessName: "  International Example  ",
    country: "Canada",
  }, "admin@example.test");
  assert.equal(lead.businessName, "International Example");
  assert.equal(lead.country, "Canada");
  assert.equal(lead.city, null);
  assert.equal(lead.officialWebsite, null);
  assert.equal(lead.publicBusinessEmail, null);
  assert.equal(lead.publicBusinessPhone, null);
  assert.equal(lead.verificationStatus, "UNVERIFIED");
  assert.equal(lead.buyingIntent, "UNKNOWN");
  assert.equal(lead.qualificationStatus, "RESEARCH_REQUIRED");
  assert.ok(lead.missingInformation.includes("Official website"));
  assert.throws(() => createSalesLead({ businessName: " ", country: "Pakistan" }, "admin@example.test"), SalesLeadValidationError);
  assert.throws(() => createSalesLead({
    businessName: "Example", country: "Pakistan", officialWebsite: "javascript:alert(1)",
  }, "admin@example.test"), /HTTP or HTTPS/);
  assert.throws(() => createSalesLead({
    businessName: "Example", country: "Pakistan", evidence: [
      { claim: "BUSINESS_IDENTITY", sourceUrl: "http://127.0.0.1/private", observation: "Local address is not public." },
    ],
  }, "admin@example.test"), /public HTTP or HTTPS/);
  assert.throws(() => createSalesLead({
    businessName: "Example", country: "Pakistan", potentialDwdService: "NEXUS_PROPERTY_NETWORK" as never,
  }, "admin@example.test"), /supported DWD service/);
});

test("Verification requires human review and independent public sources", () => {
  const noEvidence = createSalesLead({ businessName: "No Sources", country: "Pakistan" }, "admin@example.test");
  assert.throws(() =>
    reviewSalesLead(noEvidence, "VERIFIED", "admin@example.test", "Reviewed the business."),
    /requires human-reviewed business identity evidence/
  );
  const oneSource = createSalesLead({
    businessName: "One Source",
    country: "Pakistan",
    evidence: [{ claim: "BUSINESS_IDENTITY", sourceUrl: "https://directory.example/business", observation: "Identity shown." }],
  }, "admin@example.test");
  assert.throws(() =>
    reviewSalesLead(oneSource, "VERIFIED", "admin@example.test", "Reviewed the business."),
    /at least two public domains/
  );
  assert.throws(() =>
    reviewSalesLead(noEvidence, "PARTIALLY_VERIFIED", "admin@example.test", "Reviewed the business."),
    /at least one recorded evidence source/
  );
});

test("Verified lead scoring is explainable, source-bound, and does not imply purchase intent", () => {
  const intake = createSalesLead(createInput(), "researcher@example.test");
  const reviewed = reviewSalesLead(intake, "VERIFIED", "reviewer@example.test", "Reviewed the public registry, website, and cited business details.");
  assert.equal(reviewed.verificationStatus, "VERIFIED");
  assert.equal(reviewed.confidenceLevel, "HIGH");
  assert.equal(reviewed.qualificationStatus, "HIGH_POTENTIAL");
  assert.equal(reviewed.score, 100);
  assert.equal(reviewed.buyingIntent, "UNKNOWN");
  assert.ok(reviewed.scoringBreakdown.every((item) => item.maximum > 0 && item.explanation.length > 0));
  assert.ok(reviewed.scoringBreakdown.every((item) => item.evidenceIds.every((id) => reviewed.evidence.some((evidence) => evidence.id === id))));
  assert.ok(reviewed.scoringBreakdown.some((item) => item.key === "informationFreshness" && item.points === 5));
  assert.equal(reviewed.reviewHistory.at(-1)?.actor, "reviewer@example.test");
  assert.equal(validateSalesLeadRecord(reviewed).id, reviewed.id);
  assert.throws(() => validateSalesLeadRecord({ ...reviewed, score: 1 }), /scoring data/);
  const score = calculateSalesLeadScore({ ...reviewed, marketSuitability: "NOT_SUITABLE" });
  assert.equal(score.qualification, "NOT_SUITABLE");
  const outdated = reviewSalesLead(reviewed, "OUTDATED", "reviewer@example.test", "Recent business details could not be reconfirmed.");
  assert.equal(outdated.qualificationStatus, "RESEARCH_REQUIRED");
  assert.equal(outdated.confidenceLevel, "LOW");
  assert.equal(outdated.scoringBreakdown.find((item) => item.key === "informationFreshness")?.points, 0);
});

test("New research evidence invalidates prior verification and is retained in history", () => {
  const verified = reviewSalesLead(
    createSalesLead(createInput(), "researcher@example.test"),
    "VERIFIED",
    "reviewer@example.test",
    "Reviewed public identity and business-profile sources."
  );
  const updated = addSalesLeadResearch(
    verified,
    [{ claim: "INDUSTRY", sourceUrl: "https://industry-directory.example/business/1", observation: "The public profile identifies a retail business." }],
    "Added a new industry source for follow-up review.",
    "researcher@example.test"
  );
  assert.equal(updated.verificationStatus, "UNVERIFIED");
  assert.equal(updated.verificationDate, null);
  assert.ok(updated.evidence.every((item) => item.reviewStatus === "UNREVIEWED"));
  assert.equal(updated.reviewHistory.at(-1)?.action, "RESEARCH_UPDATED");
  assert.throws(() => addSalesLeadResearch(
    updated,
    [{ claim: "INDUSTRY", sourceUrl: "https://industry-directory.example/business/1", observation: "Duplicate source." }],
    "Attempted to add duplicate evidence.",
    "researcher@example.test"
  ), /duplicate claim\/source/);
});

test("Duplicate detection warns on normalized domains and business identifiers without merging", () => {
  const first = createSalesLead({ businessName: "Example Co.", country: "Pakistan", officialWebsite: "https://www.example.test/" }, "admin@example.test");
  const second = createSalesLead({ businessName: "Different Name", country: "Canada", officialWebsite: "http://example.test/contact" }, "admin@example.test");
  const firstKeys = salesLeadDuplicateKeys(first);
  const secondKeys = salesLeadDuplicateKeys(second);
  assert.ok(firstKeys.some((key) => secondKeys.includes(key) && key.startsWith("domain:")));
  assert.notEqual(first.id, second.id);
});

test("Admin lead APIs enforce authentication, validation, review history, duplicates, and no communications", async () => {
  const url = "http://localhost/api/admin/workforce/sales-leads";
  assert.equal((await GET(new NextRequest(url))).status, 401);
  assert.equal((await POST(new NextRequest(url, { method: "POST", body: "{}" }))).status, 401);
  assert.equal((await PATCH(new NextRequest(url, { method: "PATCH", body: "{}" }))).status, 401);
  assert.equal("DELETE" in SalesLeadRoute, false);

  const previousSecret = process.env.SESSION_SECRET;
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const originalGet = DataStore.getSalesLeads;
  const originalCreate = DataStore.createSalesLead;
  const originalUpdate = DataStore.updateSalesLead;
  const records: SalesLeadRecord[] = [];
  DataStore.getSalesLeads = () => [...records];
  DataStore.createSalesLead = (lead) => {
    records.unshift(lead);
    return lead;
  };
  DataStore.updateSalesLead = (id, lead) => {
    const index = records.findIndex((item) => item.id === id);
    if (index < 0) return null;
    records[index] = lead;
    return lead;
  };
  process.env.SESSION_SECRET = "test-session-secret-with-more-than-thirty-two-bytes";
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    const token = signToken({ email: "sales-admin@example.test", timestamp: Date.now() });
    const headers = { "Content-Type": "application/json", cookie: `dwd_admin_session=${token}` };
    const invalidSession = await GET(new NextRequest(url, {
      headers: { cookie: "dwd_admin_session=forged.non-admin" },
    }));
    assert.equal(invalidSession.status, 401);
    assert.match(await invalidSession.text(), /Unauthorized/);

    const badInput = await POST(new NextRequest(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...createInput(), extraClientField: "forged" }),
    }));
    assert.equal(badInput.status, 400);

    const first = await POST(new NextRequest(url, {
      method: "POST",
      headers,
      body: JSON.stringify(createInput()),
    }));
    assert.equal(first.status, 201);
    const firstBody = await first.json();
    assert.equal(firstBody.lead.verificationStatus, "UNVERIFIED");
    assert.equal(firstBody.searchAdapterAvailable, false);
    assert.equal(firstBody.communicationEnabled, false);

    const duplicate = await POST(new NextRequest(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ businessName: "Another Company", country: "Canada", officialWebsite: "https://www.example-business.test/" }),
    }));
    assert.equal(duplicate.status, 201);

    const read = await GET(new NextRequest(url, { headers }));
    assert.equal(read.status, 200);
    assert.equal(read.headers.get("Cache-Control"), "private, no-store");
    const readBody = await read.json();
    assert.equal(readBody.liveDiscoveryStatus, "UNAVAILABLE");
    assert.equal(readBody.communicationEnabled, false);
    assert.ok(readBody.leads.some((lead: SalesLeadRecord & { duplicateWarnings: string[] }) => lead.duplicateWarnings.length > 0));
    const selectedLead = readBody.leads.find((lead: SalesLeadRecord) => lead.publicBusinessEmail === "hello@example-business.test");
    assert.ok(selectedLead, "Public contact facts are available only in the authenticated admin response.");
    assert.equal(selectedLead.buyingIntent, "UNKNOWN");

    const review = await PATCH(new NextRequest(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        id: firstBody.lead.id,
        action: "review",
        verificationStatus: "VERIFIED",
        details: "Reviewed official site and independent public registry evidence.",
      }),
    }));
    assert.equal(review.status, 200);
    const reviewBody = await review.json();
    assert.equal(reviewBody.lead.verificationStatus, "VERIFIED");
    assert.equal(reviewBody.lead.reviewHistory.at(-1).actor, "sales-admin@example.test");
    assert.equal(reviewBody.communicationEnabled, false);
  } finally {
    DataStore.getSalesLeads = originalGet;
    DataStore.createSalesLead = originalCreate;
    DataStore.updateSalesLead = originalUpdate;
    if (previousSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSecret;
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
  }
});

test("Sales lead API fails safely when its configured database backend is unavailable", async () => {
  const url = "http://localhost/api/admin/workforce/sales-leads";
  const previousSecret = process.env.SESSION_SECRET;
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const originalGet = DataStore.getSalesLeads;
  DataStore.getSalesLeads = () => {
    throw new SalesLeadStorageError("Sales lead database unavailable.");
  };
  process.env.SESSION_SECRET = "test-session-secret-with-more-than-thirty-two-bytes";
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    const token = signToken({ email: "sales-admin@example.test", timestamp: Date.now() });
    const response = await GET(new NextRequest(url, {
      headers: { cookie: `dwd_admin_session=${token}` },
    }));
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      success: false,
      error: "Sales lead database unavailable.",
    });
  } finally {
    DataStore.getSalesLeads = originalGet;
    if (previousSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSecret;
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
  }
});
