import { randomUUID } from "node:crypto";
import { isIP } from "node:net";
import type { SalesLeadRecord } from "@/lib/types";
import {
  DWD_SALES_SERVICES,
  type SalesLeadEvidenceClaim,
  type SalesLeadEvidenceInput,
  type SalesLeadQualification,
  type SalesLeadScoreItem,
  type SalesLeadService,
  type SalesLeadVerificationStatus,
} from "@/lib/sales-lead-contract";

export { DWD_SALES_SERVICES } from "@/lib/sales-lead-contract";
export type {
  SalesLeadEvidenceClaim,
  SalesLeadEvidenceInput,
  SalesLeadQualification,
  SalesLeadService,
  SalesLeadVerificationStatus,
} from "@/lib/sales-lead-contract";
export const SALES_LEAD_FINDER_AGENT_ID = "sales-lead-finder";
export const SALES_LEAD_HISTORY_LIMIT = 100;

export interface SalesLeadEvidence extends SalesLeadEvidenceInput {
  id: string;
  capturedAt: string;
  reviewStatus: "UNREVIEWED" | "REVIEWED" | "REJECTED";
  reviewedAt: string | null;
  reviewedBy: string | null;
}

export interface SalesLeadCreateInput {
  businessName: string;
  country: string;
  city?: string | null;
  industry?: string | null;
  officialWebsite?: string | null;
  publicBusinessEmail?: string | null;
  publicBusinessPhone?: string | null;
  publicBusinessSocialProfile?: string | null;
  potentialDwdService?: SalesLeadService | null;
  serviceCompatibility?: "UNKNOWN" | "COMPATIBLE" | "NOT_COMPATIBLE";
  marketSuitability?: "UNKNOWN" | "SUITABLE" | "NOT_SUITABLE";
  websiteAvailability?: "UNKNOWN" | "ONLINE" | "UNAVAILABLE";
  websiteQuality?: "UNKNOWN" | "ADEQUATE" | "NEEDS_IMPROVEMENT";
  websiteOpportunityNote?: string | null;
  researchNotes?: string;
  evidence?: SalesLeadEvidenceInput[];
}

export class SalesLeadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SalesLeadValidationError";
  }
}

function normalizedOptional(value: string | null | undefined, maxLength: number): string | null {
  if (value === undefined || value === null || !value.trim()) return null;
  const result = value.trim();
  if (result.length > maxLength) throw new SalesLeadValidationError("One of the lead fields is too long.");
  return result;
}

function validateSourceUrl(value: string): string {
  if (value.length > 2048) throw new SalesLeadValidationError("Evidence URLs must be 2048 characters or fewer.");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new SalesLeadValidationError("Evidence sources must be absolute HTTP or HTTPS URLs.");
  }
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const ipv4 = hostname.split(".").map(Number);
  const privateIpv4 = isIP(hostname) === 4 && (
    ipv4[0] === 0 || ipv4[0] === 10 || ipv4[0] === 127 || ipv4[0] >= 224 ||
    (ipv4[0] === 169 && ipv4[1] === 254) ||
    (ipv4[0] === 172 && ipv4[1] >= 16 && ipv4[1] <= 31) ||
    (ipv4[0] === 192 && ipv4[1] === 168)
  );
  const privateIpv6 = isIP(hostname) === 6 && (
    hostname === "::" || hostname === "::1" ||
    hostname.startsWith("fc") || hostname.startsWith("fd") ||
    /^fe[89ab]/.test(hostname) || hostname.startsWith("::ffff:")
  );
  if (!["http:", "https:"].includes(url.protocol) || !hostname || url.username || url.password ||
      hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") ||
      hostname.endsWith(".internal") || hostname === "host.docker.internal" || privateIpv4 || privateIpv6) {
    throw new SalesLeadValidationError("Evidence sources must be public HTTP or HTTPS URLs without embedded credentials.");
  }
  return url.toString();
}

function validateEmail(value: string | null): void {
  if (value && (value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) {
    throw new SalesLeadValidationError("Enter a valid public business email address or leave it unknown.");
  }
}

function validatePhone(value: string | null): void {
  if (!value) return;
  const digits = value.replace(/\D/g, "");
  if (value.length > 32 || !/^\+?[\d\s().-]+$/.test(value) || digits.length < 7 || digits.length > 15) {
    throw new SalesLeadValidationError("Enter a valid public business phone number or leave it unknown.");
  }
}

function validateEvidenceInputs(evidence: SalesLeadEvidenceInput[] = []): SalesLeadEvidence[] {
  if (!Array.isArray(evidence) || evidence.length > 50) {
    throw new SalesLeadValidationError("A research entry may contain at most 50 evidence references.");
  }
  const seen = new Set<string>();
  return evidence.map((item) => {
    if (!item || !item.sourceUrl || !item.observation ||
        !["BUSINESS_IDENTITY", "OFFICIAL_WEBSITE", "BUSINESS_PROFILE", "BUSINESS_EMAIL", "BUSINESS_PHONE", "BUSINESS_SOCIAL_PROFILE", "WEBSITE_ASSESSMENT", "INDUSTRY", "SERVICE_OPPORTUNITY", "OTHER"].includes(item.claim)) {
      throw new SalesLeadValidationError("Each evidence reference needs a supported claim, source URL, and research observation.");
    }
    const sourceUrl = validateSourceUrl(item.sourceUrl.trim());
    const observation = item.observation.trim();
    if (observation.length < 3 || observation.length > 1000) {
      throw new SalesLeadValidationError("Evidence observations must contain 3 to 1000 characters.");
    }
    const key = `${item.claim}:${sourceUrl.toLowerCase()}`;
    if (seen.has(key)) throw new SalesLeadValidationError("Duplicate evidence references are not allowed.");
    seen.add(key);
    return {
      id: randomUUID(),
      claim: item.claim,
      sourceUrl,
      observation,
      capturedAt: new Date().toISOString(),
      reviewStatus: "UNREVIEWED",
      reviewedAt: null,
      reviewedBy: null,
    };
  });
}

function makeDomain(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function salesLeadDuplicateKeys(lead: Pick<SalesLeadRecord, "businessName" | "country" | "officialWebsite">): string[] {
  const name = Array.from(lead.businessName.trim().toLocaleLowerCase())
    .filter((character) => character.toLocaleLowerCase() !== character.toLocaleUpperCase() || /\d/.test(character))
    .join("")
    .replace(/\s+/g, " ");
  const keys = [`business:${name}:${lead.country.trim().toLocaleLowerCase()}`];
  const domain = makeDomain(lead.officialWebsite);
  if (domain) keys.push(`domain:${domain}`);
  return keys;
}

function hasCurrentReviewedEvidence(lead: SalesLeadRecord, claim: SalesLeadEvidenceClaim): SalesLeadEvidence[] {
  return lead.evidence.filter((item) =>
    item.claim === claim &&
    item.reviewStatus === "REVIEWED" &&
    item.reviewedAt !== null &&
    item.reviewedBy !== null
  );
}

function hasIndependentVerifiedBusinessSource(lead: SalesLeadRecord): boolean {
  const identityDomains = new Set(
    hasCurrentReviewedEvidence(lead, "BUSINESS_IDENTITY")
      .map((item) => makeDomain(item.sourceUrl))
      .filter(Boolean)
  );
  const candidateSources = hasCurrentReviewedEvidence(lead, "BUSINESS_PROFILE")
    .concat(hasCurrentReviewedEvidence(lead, "OFFICIAL_WEBSITE").filter((item) =>
      makeDomain(item.sourceUrl) === makeDomain(lead.officialWebsite)
    ));
  return candidateSources.some((item) => {
    const domain = makeDomain(item.sourceUrl);
    return Boolean(domain && Array.from(identityDomains).some((identityDomain) => identityDomain !== domain));
  });
}

export function calculateSalesLeadScore(lead: SalesLeadRecord): {
  score: number;
  breakdown: SalesLeadScoreItem[];
  qualification: SalesLeadQualification;
  confidence: "LOW" | "MEDIUM" | "HIGH";
} {
  const verifiedEvidence = lead.evidence.filter((item) => item.reviewStatus === "REVIEWED");
  const evidenceDomains = new Set(verifiedEvidence.map((item) => makeDomain(item.sourceUrl)).filter(Boolean));
  const identityEvidence = hasCurrentReviewedEvidence(lead, "BUSINESS_IDENTITY");
  const identityDomains = new Set(identityEvidence.map((item) => makeDomain(item.sourceUrl)).filter(Boolean));
  const identitySources = hasCurrentReviewedEvidence(lead, "BUSINESS_PROFILE")
  .concat(hasCurrentReviewedEvidence(lead, "OFFICIAL_WEBSITE").filter((item) =>
    makeDomain(item.sourceUrl) === makeDomain(lead.officialWebsite)
  ))
  .filter((item) => !identityDomains.has(makeDomain(item.sourceUrl)));
  const emailEvidence = lead.publicBusinessEmail ? hasCurrentReviewedEvidence(lead, "BUSINESS_EMAIL") : [];
  const phoneEvidence = lead.publicBusinessPhone ? hasCurrentReviewedEvidence(lead, "BUSINESS_PHONE") : [];
  const serviceEvidence = hasCurrentReviewedEvidence(lead, "SERVICE_OPPORTUNITY");
  const marketEvidence = hasCurrentReviewedEvidence(lead, "BUSINESS_PROFILE");
  const opportunityEvidence = hasCurrentReviewedEvidence(lead, "WEBSITE_ASSESSMENT")
    .concat(serviceEvidence);
  const opportunityObserved = lead.websiteAssessment.quality === "NEEDS_IMPROVEMENT" ||
    lead.websiteAssessment.availability === "UNAVAILABLE";

  const breakdown: SalesLeadScoreItem[] = [
    {
      key: "authenticity",
      label: "Business authenticity",
      points: lead.verificationStatus === "VERIFIED" ? 25 : lead.verificationStatus === "PARTIALLY_VERIFIED" ? 12 : 0,
      maximum: 25,
      explanation: lead.verificationStatus === "VERIFIED" ? "Human review accepted the minimum identity evidence." : "Identity evidence has not passed the complete human verification gate.",
      evidenceIds: [...identityEvidence, ...identitySources].map((item) => item.id),
    },
    {
      key: "serviceCompatibility",
      label: "DWD service compatibility",
      points: lead.serviceCompatibility === "COMPATIBLE" && lead.potentialDwdService && serviceEvidence.length ? 20 : 0,
      maximum: 20,
      explanation: lead.serviceCompatibility === "COMPATIBLE" && lead.potentialDwdService && serviceEvidence.length
        ? `Admin-assessed fit for ${lead.potentialDwdService.replace(/_/g, " ")}.`
        : "A compatible DWD service has not been established with reviewed opportunity evidence.",
      evidenceIds: serviceEvidence.map((item) => item.id),
    },
    {
      key: "websiteOpportunity",
      label: "Website opportunity",
      points: opportunityObserved && opportunityEvidence.length > 0 ? 15 : 0,
      maximum: 15,
      explanation: opportunityObserved && opportunityEvidence.length > 0
        ? `Admin recorded a website ${lead.websiteAssessment.availability === "UNAVAILABLE" ? "availability" : "quality"} opportunity with reviewed evidence.`
        : "A supported website opportunity has not been recorded.",
      evidenceIds: opportunityEvidence.map((item) => item.id),
    },
    {
      key: "marketSuitability",
      label: "Market suitability",
      points: lead.marketSuitability === "SUITABLE" && marketEvidence.length ? 10 : 0,
      maximum: 10,
      explanation: lead.marketSuitability === "SUITABLE" && marketEvidence.length
        ? "Admin marked this national or international market suitable; no budget or intent is inferred."
        : "Market suitability is unknown, unsupported, or marked unsuitable.",
      evidenceIds: marketEvidence.map((item) => item.id),
    },
    {
      key: "evidenceQuality",
      label: "Evidence quality",
      points: lead.verificationStatus === "OUTDATED" ? 0 : evidenceDomains.size >= 2 ? 15 : evidenceDomains.size === 1 ? 8 : 0,
      maximum: 15,
      explanation: `${verifiedEvidence.length} human-reviewed references across ${evidenceDomains.size} distinct public domains.`,
      evidenceIds: verifiedEvidence.map((item) => item.id),
    },
    {
      key: "contactVerification",
      label: "Public business contact verification",
      points: (emailEvidence.length ? 5 : 0) + (phoneEvidence.length ? 5 : 0),
      maximum: 10,
      explanation: `${emailEvidence.length ? "Business email verified" : "Business email unknown/unverified"}; ${phoneEvidence.length ? "business phone verified" : "business phone unknown/unverified"}.`,
      evidenceIds: [...emailEvidence, ...phoneEvidence].map((item) => item.id),
    },
    {
      key: "informationFreshness",
      label: "Information freshness",
      points: lead.verificationStatus === "VERIFIED" ? 5 : lead.verificationStatus === "PARTIALLY_VERIFIED" ? 3 : 0,
      maximum: 5,
      explanation: lead.verificationStatus === "OUTDATED"
        ? "An administrator marked the research outdated; re-review is required."
        : lead.verificationDate
          ? `Last human review recorded ${lead.verificationDate.slice(0, 10)}; recency is not independently checked.`
          : "No human verification date is recorded.",
      evidenceIds: verifiedEvidence.map((item) => item.id),
    },
  ];
  const score = breakdown.reduce((sum, item) => sum + item.points, 0);
  const qualification: SalesLeadQualification = lead.marketSuitability === "NOT_SUITABLE" ||
    lead.serviceCompatibility === "NOT_COMPATIBLE"
    ? "NOT_SUITABLE"
    : lead.verificationStatus === "OUTDATED" || lead.verificationStatus === "REJECTED"
      ? "RESEARCH_REQUIRED"
    : score >= 75 ? "HIGH_POTENTIAL"
      : score >= 50 ? "MEDIUM_POTENTIAL"
        : score >= 25 ? "LOW_POTENTIAL"
          : "RESEARCH_REQUIRED";
  const confidence = lead.verificationStatus === "OUTDATED" || lead.verificationStatus === "REJECTED" ? "LOW"
    : lead.verificationStatus === "VERIFIED" && evidenceDomains.size >= 2 ? "HIGH"
    : lead.verificationStatus === "PARTIALLY_VERIFIED" || evidenceDomains.size > 0 ? "MEDIUM"
      : "LOW";
  return { score, breakdown, qualification, confidence };
}

function cleanLead(input: SalesLeadCreateInput): Omit<SalesLeadRecord, "id" | "createdAt" | "updatedAt" | "reviewHistory"> {
  const businessName = input.businessName.trim();
  const country = input.country.trim();
  if (!businessName || businessName.length > 160 || !country || country.length > 100) {
    throw new SalesLeadValidationError("Business name and country are required and must be within supported lengths.");
  }
  const officialWebsite = normalizedOptional(input.officialWebsite, 2048);
  if (officialWebsite) validateSourceUrl(officialWebsite);
  const publicBusinessEmail = normalizedOptional(input.publicBusinessEmail, 254);
  validateEmail(publicBusinessEmail);
  const publicBusinessPhone = normalizedOptional(input.publicBusinessPhone, 32);
  validatePhone(publicBusinessPhone);
  const publicBusinessSocialProfile = normalizedOptional(input.publicBusinessSocialProfile, 2048);
  if (publicBusinessSocialProfile) validateSourceUrl(publicBusinessSocialProfile);
  if (input.potentialDwdService && !(DWD_SALES_SERVICES as readonly string[]).includes(input.potentialDwdService)) {
    throw new SalesLeadValidationError("Choose a supported DWD service. Nexus Property Network is outside this workflow.");
  }
  const serviceCompatibility = input.serviceCompatibility || "UNKNOWN";
  const marketSuitability = input.marketSuitability || "UNKNOWN";
  const websiteAvailability = input.websiteAvailability || "UNKNOWN";
  const websiteQuality = input.websiteQuality || "UNKNOWN";
  if (!["UNKNOWN", "COMPATIBLE", "NOT_COMPATIBLE"].includes(serviceCompatibility) ||
      !["UNKNOWN", "SUITABLE", "NOT_SUITABLE"].includes(marketSuitability) ||
      !["UNKNOWN", "ONLINE", "UNAVAILABLE"].includes(websiteAvailability) ||
      !["UNKNOWN", "ADEQUATE", "NEEDS_IMPROVEMENT"].includes(websiteQuality)) {
    throw new SalesLeadValidationError("A lead assessment contains an unsupported status.");
  }
  const websiteOpportunityNote = normalizedOptional(input.websiteOpportunityNote, 2000);
  if ((websiteQuality === "NEEDS_IMPROVEMENT" || websiteAvailability === "UNAVAILABLE") && !websiteOpportunityNote) {
    throw new SalesLeadValidationError("Describe the observed website opportunity before marking it unavailable or in need of improvement.");
  }
  const evidence = validateEvidenceInputs(input.evidence);
  const researchNotes = input.researchNotes?.trim() || "";
  if (researchNotes.length > 5000) throw new SalesLeadValidationError("Research notes must be 5000 characters or fewer.");
  return {
    businessName,
    country,
    city: normalizedOptional(input.city, 120),
    industry: normalizedOptional(input.industry, 160),
    officialWebsite,
    publicBusinessEmail,
    publicBusinessPhone,
    publicBusinessSocialProfile,
    sourceUrls: Array.from(new Set(evidence.map((item) => item.sourceUrl))),
    evidence,
    verificationStatus: "UNVERIFIED",
    verificationDate: null,
    confidenceLevel: "LOW",
    websiteAssessment: {
      availability: websiteAvailability,
      quality: websiteQuality,
      opportunityNote: websiteOpportunityNote,
      sourceEvidenceIds: evidence
        .filter((item) => item.claim === "WEBSITE_ASSESSMENT" || item.claim === "SERVICE_OPPORTUNITY")
        .map((item) => item.id),
    },
    potentialDwdService: input.potentialDwdService || null,
    serviceCompatibility,
    marketSuitability,
    qualificationStatus: "RESEARCH_REQUIRED",
    score: 0,
    scoringBreakdown: [],
    buyingIntent: "UNKNOWN",
    researchNotes,
    missingInformation: [
      ...(!input.industry?.trim() ? ["Industry"] : []),
      ...(!officialWebsite ? ["Official website"] : []),
      ...(!publicBusinessEmail ? ["Public business email"] : []),
      ...(!publicBusinessPhone ? ["Public business phone"] : []),
      ...(!input.potentialDwdService ? ["Potential DWD service"] : []),
      ...(!evidence.length ? ["Public source evidence"] : []),
    ],
  };
}

export function createSalesLead(input: SalesLeadCreateInput, actor: string, now = new Date().toISOString()): SalesLeadRecord {
  const lead = {
    id: `sales-lead-${randomUUID()}`,
    ...cleanLead(input),
    createdAt: now,
    updatedAt: now,
    reviewHistory: [{
      id: randomUUID(),
      action: "INTAKE_RECORDED" as const,
      actor,
      at: now,
      details: "Manually entered research record. No live search or external communication was performed.",
    }],
  } as SalesLeadRecord;
  return recalculateSalesLead(lead);
}

export function recalculateSalesLead(lead: SalesLeadRecord): SalesLeadRecord {
  const calculated = calculateSalesLeadScore(lead);
  return {
    ...lead,
    score: calculated.score,
    scoringBreakdown: calculated.breakdown,
    qualificationStatus: calculated.qualification,
    confidenceLevel: calculated.confidence,
  };
}

export function addSalesLeadResearch(
  lead: SalesLeadRecord,
  evidenceInput: SalesLeadEvidenceInput[],
  details: string,
  actor: string,
  now = new Date().toISOString()
): SalesLeadRecord {
  const normalizedDetails = details.trim();
  if (normalizedDetails.length < 5 || normalizedDetails.length > 2000) {
    throw new SalesLeadValidationError("A research update note of 5 to 2000 characters is required.");
  }
  if (lead.reviewHistory.length >= SALES_LEAD_HISTORY_LIMIT) {
    throw new SalesLeadValidationError("The lead review history is full; archive this lead before further research.");
  }
  const addedEvidence = validateEvidenceInputs(evidenceInput);
  if (!addedEvidence.length) {
    throw new SalesLeadValidationError("A research update must include at least one new evidence reference.");
  }
  const existingEvidenceKeys = new Set(lead.evidence.map((item) => `${item.claim}:${item.sourceUrl.toLowerCase()}`));
  if (addedEvidence.some((item) => existingEvidenceKeys.has(`${item.claim}:${item.sourceUrl.toLowerCase()}`))) {
    throw new SalesLeadValidationError("The research update contains a duplicate claim/source reference.");
  }
  const existingEvidence = lead.evidence.map((item) => ({
    ...item,
    reviewStatus: "UNREVIEWED" as const,
    reviewedAt: null,
    reviewedBy: null,
  }));
  const allEvidence = [...existingEvidence, ...addedEvidence];
  return recalculateSalesLead({
    ...lead,
    evidence: allEvidence,
    sourceUrls: Array.from(new Set(allEvidence.map((item) => item.sourceUrl))),
    verificationStatus: "UNVERIFIED",
    verificationDate: null,
    updatedAt: now,
    missingInformation: lead.missingInformation.filter((item) => item !== "Public source evidence"),
    reviewHistory: [...lead.reviewHistory, {
      id: randomUUID(),
      action: "RESEARCH_UPDATED",
      actor,
      at: now,
      details: normalizedDetails,
    }],
  });
}

export function reviewSalesLead(
  lead: SalesLeadRecord,
  verificationStatus: SalesLeadVerificationStatus,
  actor: string,
  details: string,
  now = new Date().toISOString()
): SalesLeadRecord {
  if (!["PARTIALLY_VERIFIED", "VERIFIED", "OUTDATED", "REJECTED"].includes(verificationStatus)) {
    throw new SalesLeadValidationError("Choose a supported human review status.");
  }
  const normalizedDetails = details.trim();
  if (normalizedDetails.length < 5 || normalizedDetails.length > 2000) {
    throw new SalesLeadValidationError("A review note of 5 to 2000 characters is required.");
  }
  if (verificationStatus === "VERIFIED") {
    const reviewedEvidence = lead.evidence.map((item) => ({
      ...item,
      reviewStatus: "REVIEWED" as const,
      reviewedAt: now,
      reviewedBy: actor,
    }));
    const reviewed = { ...lead, evidence: reviewedEvidence };
    const domains = new Set(reviewedEvidence.map((item) => makeDomain(item.sourceUrl)).filter(Boolean));
    const hasIndependentBusinessSource = hasIndependentVerifiedBusinessSource(reviewed);
    if (domains.size < 2 || !hasIndependentBusinessSource) {
      throw new SalesLeadValidationError(
        "Verification requires human-reviewed business identity evidence and an independent official-site or business-profile source from at least two public domains."
      );
    }
    return appendReview({
      ...reviewed,
      verificationStatus,
      verificationDate: now,
      sourceUrls: Array.from(new Set(reviewedEvidence.map((item) => item.sourceUrl))),
    }, actor, verificationStatus, normalizedDetails, now);
  }
  if (verificationStatus === "PARTIALLY_VERIFIED" && lead.evidence.length === 0) {
    throw new SalesLeadValidationError("Partial verification requires at least one recorded evidence source.");
  }
  const evidence = verificationStatus === "REJECTED"
    ? lead.evidence.map((item) => ({ ...item, reviewStatus: "REJECTED" as const, reviewedAt: now, reviewedBy: actor }))
    : lead.evidence;
  return appendReview({
    ...lead,
    evidence,
    verificationStatus,
    verificationDate: now,
  }, actor, verificationStatus, normalizedDetails, now);
}

function appendReview(
  lead: SalesLeadRecord,
  actor: string,
  action: SalesLeadVerificationStatus,
  details: string,
  now: string
): SalesLeadRecord {
  if (lead.reviewHistory.length >= SALES_LEAD_HISTORY_LIMIT) {
    throw new SalesLeadValidationError("The lead review history is full; archive this lead before further review.");
  }
  return recalculateSalesLead({
    ...lead,
    updatedAt: now,
    reviewHistory: [...lead.reviewHistory, {
      id: randomUUID(),
      action: action as Exclude<SalesLeadVerificationStatus, "UNVERIFIED">,
      actor,
      at: now,
      details,
    }],
  });
}

export function validateSalesLeadRecord(value: unknown): SalesLeadRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new SalesLeadValidationError("The saved sales lead is malformed.");
  }
  const lead = value as SalesLeadRecord;
  if (!/^sales-lead-[0-9a-f-]{36}$/i.test(lead.id) ||
      typeof lead.businessName !== "string" || !lead.businessName.trim() ||
      typeof lead.country !== "string" || !lead.country.trim() ||
      !Array.isArray(lead.evidence) || !Array.isArray(lead.sourceUrls) ||
      !Array.isArray(lead.reviewHistory) || lead.reviewHistory.length > SALES_LEAD_HISTORY_LIMIT ||
      !["UNVERIFIED", "PARTIALLY_VERIFIED", "VERIFIED", "OUTDATED", "REJECTED"].includes(lead.verificationStatus) ||
      !["HIGH_POTENTIAL", "MEDIUM_POTENTIAL", "LOW_POTENTIAL", "RESEARCH_REQUIRED", "NOT_SUITABLE"].includes(lead.qualificationStatus) ||
      lead.buyingIntent !== "UNKNOWN") {
    throw new SalesLeadValidationError("The saved sales lead is malformed or has an unsupported status.");
  }
  if (lead.verificationStatus === "VERIFIED" && !lead.verificationDate) {
    throw new SalesLeadValidationError("A verified lead must have a human review timestamp.");
  }
  for (const item of lead.evidence) {
    validateSourceUrl(item.sourceUrl);
    if (!item.observation.trim() || !item.capturedAt ||
        !["UNREVIEWED", "REVIEWED", "REJECTED"].includes(item.reviewStatus)) {
      throw new SalesLeadValidationError("The saved sales lead contains malformed evidence.");
    }
  }
  if (lead.verificationStatus === "VERIFIED") {
    const reviewedEvidence = lead.evidence.filter((item) =>
      item.reviewStatus === "REVIEWED" && item.reviewedAt && item.reviewedBy
    );
    const reviewedDomains = new Set(reviewedEvidence.map((item) => makeDomain(item.sourceUrl)).filter(Boolean));
    const independentSourceFound = hasIndependentVerifiedBusinessSource(lead);
    const matchingReview = lead.reviewHistory.some((entry) =>
      entry.action === "VERIFIED" && entry.at === lead.verificationDate && Boolean(entry.actor.trim())
    );
    if (reviewedDomains.size < 2 || !independentSourceFound || !matchingReview) {
      throw new SalesLeadValidationError("The saved verified lead lacks the required human-reviewed independent evidence.");
    }
  }
  const recalculated = recalculateSalesLead(lead);
  if (lead.score !== recalculated.score ||
      JSON.stringify(lead.scoringBreakdown) !== JSON.stringify(recalculated.scoringBreakdown) ||
      lead.qualificationStatus !== recalculated.qualificationStatus ||
      lead.confidenceLevel !== recalculated.confidenceLevel) {
    throw new SalesLeadValidationError("The saved sales lead scoring data does not match its evidence and assessments.");
  }
  return lead;
}
