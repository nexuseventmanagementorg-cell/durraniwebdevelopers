import { randomUUID } from "node:crypto";
import {
  calculateCreativeQuote,
  CREATIVE_CATEGORIES,
  IMAGE_TYPES,
} from "@/lib/creative-studio";
import type {
  CreativeEstimateLine,
  CreativeEstimateStatus,
  CreativeInquiry,
  CreativeQuoteInput,
  CreativeStudioConfig,
  CreativeStudioEstimate,
} from "@/lib/creative-studio";

type EstimateCustomer = CreativeInquiry["customer"];
type EstimateProject = Pick<
  CreativeInquiry["project"],
  "brief" | "vision" | "languages" | "referenceFiles"
>;

export interface CreativeStudioEstimateInput {
  inquiryId: string;
  input: CreativeQuoteInput;
  config: CreativeStudioConfig;
  customer: EstimateCustomer;
  project: EstimateProject;
  estimateId?: string;
  calculatedAt?: string;
}

export function isCreativeEstimateAdjustmentAllowed(
  inquiry: Pick<CreativeInquiry, "status" | "customerQuoteApprovedAt" | "paymentVerifiedAt">
): boolean {
  return !inquiry.customerQuoteApprovedAt &&
    !inquiry.paymentVerifiedAt &&
    ["NEW_INQUIRY", "UNDER_REVIEW", "NEEDS_MORE_INFORMATION", "QUOTATION_PREPARED"]
      .includes(inquiry.status);
}

export function isSupportedCreativeService(input: CreativeQuoteInput): boolean {
  const category = CREATIVE_CATEGORIES.find((item) => item.id === input.categoryId);
  if (!category) return false;
  if (input.projectKind === "image") {
    return IMAGE_TYPES.some((item) => item === input.subcategory);
  }
  if (input.projectKind !== "video" && input.projectKind !== "mvp") return false;
  return category.items.some((item) => item === input.subcategory);
}

function normalizeRequirement(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function findUnselectedMentionedAddons(
  brief: string,
  selectedIds: string[],
  config: CreativeStudioConfig
): string[] {
  const normalizedBrief = ` ${normalizeRequirement(brief)} `;
  const selected = new Set(selectedIds);
  return config.addons
    .filter((addon) => addon.enabled && !selected.has(addon.id))
    .filter((addon) => {
      const name = normalizeRequirement(addon.name);
      const id = normalizeRequirement(addon.id);
      return (name.length >= 5 && normalizedBrief.includes(` ${name} `)) ||
        (id.length >= 5 && normalizedBrief.includes(` ${id} `));
    })
    .map((addon) => `${addon.name} is mentioned in the brief but was not selected from the priced services.`);
}

function getMissingInformation(
  input: CreativeQuoteInput,
  customer: EstimateCustomer,
  project: EstimateProject
): string[] {
  const missing: string[] = [];
  const wordCount = project.brief.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount < 8) missing.push("A more detailed project brief");
  if (!project.vision.trim()) missing.push("Visual direction or creative vision");
  if (!Object.values(project.languages).some((language) => language.trim())) {
    missing.push("Preferred production language");
  }
  if (["Business", "Agency", "Brand", "Enterprise"].includes(customer.customerType) &&
      !customer.company.trim()) {
    missing.push("Business or brand name");
  }
  if (input.projectKind === "video" && input.durationSeconds <= 0) {
    missing.push("Video duration");
  }
  if (input.projectKind === "image" && input.imageCount <= 0) {
    missing.push("Image quantity");
  }
  return missing;
}

function toEstimateLines(
  input: CreativeQuoteInput,
  quote: ReturnType<typeof calculateCreativeQuote>
): CreativeEstimateLine[] {
  const quantity = input.projectKind === "image"
    ? input.imageCount
    : input.projectKind === "video"
      ? input.durationSeconds
      : 1;
  const quantityUnit = input.projectKind === "image"
    ? "image"
    : input.projectKind === "video"
      ? "second"
      : "project";
  const lines: CreativeEstimateLine[] = [{
    id: "service-base",
    label: input.projectKind === "image"
      ? "Image production base"
      : input.projectKind === "mvp"
        ? "Custom project scope"
        : "Video production base",
    amount: quote.base,
    kind: "base",
    quantity,
    unit: quantityUnit,
  }];
  const adjustments: Array<[string, string, number]> = [
    ["category", "Category adjustment", quote.categoryCharge],
    ["complexity", "Complexity adjustment", quote.complexityCharge],
    ["quality", "Quality adjustment", quote.qualityCharge],
    ["aspect-ratio", "Aspect-ratio adjustment", quote.aspectRatioCharge],
  ];
  for (const [id, label, amount] of adjustments) {
    if (amount !== 0) lines.push({ id, label, amount, kind: "adjustment" });
  }
  for (const addon of quote.addonCharges) {
    lines.push({ id: addon.id, label: addon.label, amount: addon.amount, kind: "addon" });
  }
  return lines;
}

function getExplanation(
  input: CreativeQuoteInput,
  config: CreativeStudioConfig,
  quote: ReturnType<typeof calculateCreativeQuote>,
  subtotal: number | null
): string {
  const rate = config.countries.find((item) =>
    item.country.toLowerCase() === input.country.trim().toLowerCase() &&
    item.currency === input.currency
  );
  if (quote.base === null) {
    return quote.reason || "No verified base price is configured for this service and country.";
  }
  const rateAmount = input.projectKind === "image" ? rate?.imagePerImage : rate?.videoPerMinute;
  const units = input.projectKind === "image"
    ? `${input.imageCount} image(s)`
    : `${input.durationSeconds / 60} minute(s)`;
  const basis = input.projectKind === "image"
    ? `${formatAmount(rateAmount ?? 0, input.currency)} per image x ${units}`
    : `${formatAmount(rateAmount ?? 0, input.currency)} per minute x ${units}`;
  if (quote.requiresManualReview) {
    return `${basis}; priced items subtotal ${subtotal === null ? "unavailable" : formatAmount(subtotal, input.currency)}. ${quote.reason || "Manual production review is required."}`;
  }
  return `${basis}; configured category, complexity, quality, aspect-ratio and selected add-on charges are applied using Creative Studio pricing catalog v${config.version}. This is preliminary, not a confirmed quotation.`;
}

function formatAmount(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString("en")}`;
}

function getStatus(
  serviceSupported: boolean,
  quote: ReturnType<typeof calculateCreativeQuote>,
  unpricedRequirements: string[],
  missingInformation: string[]
): CreativeEstimateStatus {
  if (!serviceSupported) return "INSUFFICIENT_INFORMATION";
  if (quote.requiresManualReview || unpricedRequirements.length > 0) {
    return "ADMIN_REVIEW_REQUIRED";
  }
  const briefOnlyNeedsMoreDetail = missingInformation.length > 0 &&
    missingInformation.every((item) => item === "A more detailed project brief");
  if (briefOnlyNeedsMoreDetail && quote.total !== null) return "PRELIMINARY";
  if (missingInformation.length > 0) return "NEEDS_FOLLOW_UP";
  if (quote.total === null) return "ADMIN_REVIEW_REQUIRED";
  return "ESTIMATED";
}

export function calculateCreativeStudioEstimate({
  inquiryId,
  input,
  config,
  customer,
  project,
  estimateId = randomUUID(),
  calculatedAt = new Date().toISOString(),
}: CreativeStudioEstimateInput): CreativeStudioEstimate {
  const serviceSupported = isSupportedCreativeService(input);
  const calculatedQuote = calculateCreativeQuote(input, config);
  const mentionedAddons = findUnselectedMentionedAddons(project.brief, input.addonIds, config);
  const invalidAddons = input.addonIds
    .filter((id) => !config.addons.some((addon) => addon.id === id && addon.enabled))
    .map((id) => `Selected service "${id}" is not available in the verified pricing catalog.`);
  const scopeNeedsReview = !serviceSupported || invalidAddons.length > 0 || mentionedAddons.length > 0;
  const quote = scopeNeedsReview
    ? {
        ...calculatedQuote,
        total: null,
        requiresManualReview: true,
        reason: !serviceSupported
          ? "The selected service does not match the verified Creative Studio catalog."
          : invalidAddons[0] || mentionedAddons[0],
      }
    : calculatedQuote;
  const unpricedRequirements = Array.from(new Set([
    ...(quote.reason && quote.requiresManualReview ? [quote.reason] : []),
    ...quote.addonCharges
      .filter((addon) => addon.amount === null)
      .map((addon) => `${addon.label} has no verified fixed price and requires a custom quotation.`),
    ...mentionedAddons,
    ...invalidAddons,
  ]));
  const missingInformation = getMissingInformation(input, customer, project);
  const lines = toEstimateLines(input, quote);
  const subtotal = quote.base === null
    ? null
    : lines.reduce((total, line) => total + (line.amount ?? 0), 0);
  const status = getStatus(
    serviceSupported,
    quote,
    unpricedRequirements,
    missingInformation
  );
  const wordCount = project.brief.trim().split(/\s+/).filter(Boolean).length;
  const confidence: CreativeStudioEstimate["confidence"] =
    status === "ADMIN_REVIEW_REQUIRED" || status === "INSUFFICIENT_INFORMATION" || wordCount < 8
      ? "LOW"
      : missingInformation.length > 0 || unpricedRequirements.length > 0
        ? "MEDIUM"
        : "HIGH";
  const category = CREATIVE_CATEGORIES.find((item) => item.id === input.categoryId);
  const quantity = input.projectKind === "image"
    ? { value: input.imageCount, unit: "images" }
    : input.projectKind === "video"
      ? { value: input.durationSeconds, unit: "seconds" }
      : { value: 1, unit: "project" };

  return {
    estimateId,
    inquiryId,
    calculatedAt,
    pricingCatalogVersion: config.version,
    currency: input.currency,
    input: { ...input, addonIds: [...input.addonIds] },
    selectedService: `${category?.label || "Unmatched service"} — ${input.subcategory}`,
    matchedPackage: null,
    matchedDeliverables: serviceSupported ? [input.subcategory] : [],
    quantity,
    lines,
    includedFeatures: quote.addonCharges
      .filter((addon) => addon.amount !== null)
      .map((addon) => addon.label),
    unpricedRequirements: serviceSupported
      ? unpricedRequirements
      : ["The selected service does not match the verified Creative Studio catalog."],
    subtotal,
    estimatedTotal: quote.total,
    quote,
    status,
    confidence,
    missingInformation,
    explanation: serviceSupported
      ? getExplanation(input, config, quote, subtotal)
      : "No verified catalog service matches the submitted selection. Confirm the scope before pricing.",
  };
}
