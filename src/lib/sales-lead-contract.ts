export const DWD_SALES_SERVICES = [
  "BUSINESS_WEBSITE",
  "CORPORATE_WEBSITE",
  "ECOMMERCE_WEBSITE",
  "CUSTOM_WEB_APPLICATION",
  "WEBSITE_REDESIGN",
  "LANDING_PAGE",
  "BOOKING_SYSTEM",
  "BUSINESS_AUTOMATION",
  "OTHER_VERIFIED_DWD_SERVICE",
] as const;

export type SalesLeadService = typeof DWD_SALES_SERVICES[number];
export type SalesLeadVerificationStatus =
  | "UNVERIFIED"
  | "PARTIALLY_VERIFIED"
  | "VERIFIED"
  | "OUTDATED"
  | "REJECTED";
export type SalesLeadQualification =
  | "HIGH_POTENTIAL"
  | "MEDIUM_POTENTIAL"
  | "LOW_POTENTIAL"
  | "RESEARCH_REQUIRED"
  | "NOT_SUITABLE";
export type SalesLeadEvidenceClaim =
  | "BUSINESS_IDENTITY"
  | "OFFICIAL_WEBSITE"
  | "BUSINESS_PROFILE"
  | "BUSINESS_EMAIL"
  | "BUSINESS_PHONE"
  | "BUSINESS_SOCIAL_PROFILE"
  | "WEBSITE_ASSESSMENT"
  | "INDUSTRY"
  | "SERVICE_OPPORTUNITY"
  | "OTHER";

export interface SalesLeadEvidenceInput {
  claim: SalesLeadEvidenceClaim;
  sourceUrl: string;
  observation: string;
}

export interface SalesLeadScoreItem {
  key: "authenticity" | "serviceCompatibility" | "websiteOpportunity" | "marketSuitability" | "evidenceQuality" | "contactVerification" | "informationFreshness";
  label: string;
  points: number;
  maximum: number;
  explanation: string;
  evidenceIds: string[];
}
