import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/auth";
import {
  addSalesLeadResearch,
  createSalesLead,
  reviewSalesLead,
  SalesLeadValidationError,
  salesLeadDuplicateKeys,
  validateSalesLeadRecord,
  type SalesLeadCreateInput,
  type SalesLeadEvidenceClaim,
  type SalesLeadEvidenceInput,
  type SalesLeadService,
  type SalesLeadVerificationStatus,
} from "@/lib/sales-leads";
import {
  createSalesLeadRecord,
  getSalesLeads,
  SalesLeadStorageError,
  updateSalesLeadRecord,
} from "@/lib/sales-lead-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CREATE_FIELDS = new Set([
  "businessName", "country", "city", "industry", "officialWebsite", "publicBusinessEmail",
  "publicBusinessPhone", "publicBusinessSocialProfile", "potentialDwdService",
  "serviceCompatibility", "marketSuitability", "websiteAvailability", "websiteQuality",
  "websiteOpportunityNote", "researchNotes", "evidence",
]);
const EVIDENCE_CLAIMS: SalesLeadEvidenceClaim[] = [
  "BUSINESS_IDENTITY", "OFFICIAL_WEBSITE", "BUSINESS_PROFILE", "BUSINESS_EMAIL",
  "BUSINESS_PHONE", "BUSINESS_SOCIAL_PROFILE", "WEBSITE_ASSESSMENT", "INDUSTRY",
  "SERVICE_OPPORTUNITY", "OTHER",
];
const SERVICES: Array<SalesLeadService | null> = [
  "BUSINESS_WEBSITE", "CORPORATE_WEBSITE", "ECOMMERCE_WEBSITE", "CUSTOM_WEB_APPLICATION",
  "WEBSITE_REDESIGN", "LANDING_PAGE", "BOOKING_SYSTEM", "BUSINESS_AUTOMATION",
  "OTHER_VERIFIED_DWD_SERVICE", null,
];
const REVIEW_STATUSES: SalesLeadVerificationStatus[] = [
  "VERIFIED", "PARTIALLY_VERIFIED", "OUTDATED", "REJECTED",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseEvidence(value: unknown): SalesLeadEvidenceInput[] {
  if (!Array.isArray(value) || value.some((item) =>
    !isRecord(item) ||
    Object.keys(item).some((key) => !["claim", "sourceUrl", "observation"].includes(key)) ||
    !EVIDENCE_CLAIMS.includes(item.claim as SalesLeadEvidenceClaim) ||
    typeof item.sourceUrl !== "string" ||
    typeof item.observation !== "string"
  )) {
    throw new SalesLeadValidationError("Evidence references must contain a supported claim, source URL, and observation.");
  }
  return value.map((item) => {
    if (!isRecord(item) ||
        typeof item.claim !== "string" || !EVIDENCE_CLAIMS.includes(item.claim as SalesLeadEvidenceClaim) ||
        typeof item.sourceUrl !== "string" || typeof item.observation !== "string") {
      throw new SalesLeadValidationError("Evidence references must contain a supported claim, source URL, and observation.");
    }
    return {
      claim: item.claim as SalesLeadEvidenceClaim,
      sourceUrl: item.sourceUrl,
      observation: item.observation,
    };
  });
}

function parseCreateInput(value: unknown): SalesLeadCreateInput {
  if (!isRecord(value) || Object.keys(value).some((key) => !CREATE_FIELDS.has(key)) ||
      typeof value.businessName !== "string" || typeof value.country !== "string") {
    throw new SalesLeadValidationError("Provide only supported lead intake fields, including business name and country.");
  }
  const optionalString = (key: string): string | null | undefined => {
    if (value[key] !== undefined && value[key] !== null && typeof value[key] !== "string") {
      throw new SalesLeadValidationError(`${key} must be text or null.`);
    }
    return typeof value[key] === "string" ? value[key] as string : value[key] as null | undefined;
  };
  const optionalFields = [
    "city", "industry", "officialWebsite", "publicBusinessEmail", "publicBusinessPhone",
    "publicBusinessSocialProfile", "websiteOpportunityNote", "researchNotes",
  ];
  for (const key of optionalFields) optionalString(key);
  const enumValue = (key: string, values: readonly string[]): string | null | undefined => {
    const item = value[key];
    if (item === undefined || item === null) return item;
    if (typeof item !== "string" || !values.includes(item)) {
      throw new SalesLeadValidationError(`${key} contains an unsupported value.`);
    }
    return item;
  };
  const potentialDwdService = enumValue("potentialDwdService", SERVICES.filter((item): item is SalesLeadService => item !== null));
  const evidence = value.evidence === undefined ? undefined : parseEvidence(value.evidence);
  return {
    businessName: value.businessName,
    country: value.country,
    city: optionalString("city"),
    industry: optionalString("industry"),
    officialWebsite: optionalString("officialWebsite"),
    publicBusinessEmail: optionalString("publicBusinessEmail"),
    publicBusinessPhone: optionalString("publicBusinessPhone"),
    publicBusinessSocialProfile: optionalString("publicBusinessSocialProfile"),
    potentialDwdService: potentialDwdService as SalesLeadService | null | undefined,
    serviceCompatibility: enumValue("serviceCompatibility", ["UNKNOWN", "COMPATIBLE", "NOT_COMPATIBLE"]) as SalesLeadCreateInput["serviceCompatibility"],
    marketSuitability: enumValue("marketSuitability", ["UNKNOWN", "SUITABLE", "NOT_SUITABLE"]) as SalesLeadCreateInput["marketSuitability"],
    websiteAvailability: enumValue("websiteAvailability", ["UNKNOWN", "ONLINE", "UNAVAILABLE"]) as SalesLeadCreateInput["websiteAvailability"],
    websiteQuality: enumValue("websiteQuality", ["UNKNOWN", "ADEQUATE", "NEEDS_IMPROVEMENT"]) as SalesLeadCreateInput["websiteQuality"],
    websiteOpportunityNote: optionalString("websiteOpportunityNote"),
    researchNotes: optionalString("researchNotes") || undefined,
    evidence,
  };
}

function errorResponse(error: unknown) {
  if (error instanceof SalesLeadValidationError) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
  if (error instanceof SalesLeadStorageError) {
    return NextResponse.json({ success: false, error: error.message }, { status: 503 });
  }
  console.error("Sales lead request failed", error);
  return NextResponse.json({ success: false, error: "The sales lead request could not be completed." }, { status: 500 });
}

export async function GET(request: NextRequest) {
  if (!getAdminFromRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const leads = (await getSalesLeads()).map((lead) => validateSalesLeadRecord(lead));
    const keyCounts = new Map<string, number>();
    for (const lead of leads) {
      for (const key of salesLeadDuplicateKeys(lead)) keyCounts.set(key, (keyCounts.get(key) || 0) + 1);
    }
    return NextResponse.json({
      success: true,
      searchAdapterAvailable: false,
      liveDiscoveryStatus: "UNAVAILABLE",
      communicationEnabled: false,
      leads: leads.map((lead) => ({
        ...lead,
        duplicateWarnings: salesLeadDuplicateKeys(lead)
          .filter((key) => (keyCounts.get(key) || 0) > 1)
          .map((key) => key.startsWith("domain:")
            ? `A record has the same normalized domain (${key.slice("domain:".length)}). Review identity; no records were merged.`
            : "A record has the same normalized business name and country. Review identity; no records were merged."),
      })),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const admin = getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "A valid JSON request is required." }, { status: 400 });
  }
  try {
    const input = parseCreateInput(body);
    const lead = createSalesLead(input, admin.email);
    const saved = await createSalesLeadRecord(lead);
    return NextResponse.json({
      success: true,
      lead: saved,
      message: "Manual research intake saved as unverified. No live search or external communication occurred.",
      searchAdapterAvailable: false,
      communicationEnabled: false,
    }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  const admin = getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "A valid JSON request is required." }, { status: 400 });
  }
  if (isRecord(body) && body.action === "research_update") {
    if (Object.keys(body).some((key) => !["id", "action", "details", "evidence"].includes(key)) ||
        typeof body.id !== "string" || body.id.length > 100 ||
        typeof body.details !== "string") {
      return NextResponse.json({ success: false, error: "A lead ID, research note, and new evidence are required." }, { status: 400 });
    }
    try {
      const evidence = parseEvidence(body.evidence);
      const leads = await getSalesLeads();
      const stored = leads.find((lead) => lead.id === body.id);
      if (!stored) return NextResponse.json({ success: false, error: "Sales lead not found." }, { status: 404 });
      const current = validateSalesLeadRecord(stored);
      const updated = addSalesLeadResearch(current, evidence, body.details, admin.email);
      const saved = await updateSalesLeadRecord(current.id, updated, admin.email);
      if (!saved) return NextResponse.json({ success: false, error: "Sales lead not found." }, { status: 404 });
      return NextResponse.json({
        success: true,
        lead: validateSalesLeadRecord(saved),
        message: "Research update saved. Prior evidence review was invalidated; review the refreshed source set before verification.",
        communicationEnabled: false,
      }, { headers: { "Cache-Control": "private, no-store" } });
    } catch (error) {
      return errorResponse(error);
    }
  }
  if (!isRecord(body) || Object.keys(body).some((key) => !["id", "action", "verificationStatus", "details"].includes(key)) ||
      typeof body.id !== "string" || body.id.length > 100 ||
      body.action !== "review" ||
      typeof body.verificationStatus !== "string" ||
      !REVIEW_STATUSES.includes(body.verificationStatus as SalesLeadVerificationStatus) ||
      typeof body.details !== "string") {
    return NextResponse.json({ success: false, error: "A lead ID, supported review status, and review note are required." }, { status: 400 });
  }
  try {
    const leads = await getSalesLeads();
    const stored = leads.find((lead) => lead.id === body.id);
    if (!stored) return NextResponse.json({ success: false, error: "Sales lead not found." }, { status: 404 });
    const current = validateSalesLeadRecord(stored);
    const reviewedEvidence = current.evidence.map((item) => ({
      ...item,
      reviewStatus: "REVIEWED" as const,
      reviewedAt: new Date().toISOString(),
      reviewedBy: admin.email,
    }));
    const prepared = { ...current, evidence: reviewedEvidence };
    const result = reviewSalesLead(prepared, body.verificationStatus as SalesLeadVerificationStatus, admin.email, body.details as string);
    const saved = await updateSalesLeadRecord(current.id, result, admin.email);
    if (!saved) return NextResponse.json({ success: false, error: "Sales lead not found." }, { status: 404 });
    return NextResponse.json({
      success: true,
      lead: validateSalesLeadRecord(saved),
      communicationEnabled: false,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
