import {
  calculateBudget,
  DEFAULT_PRICING_CONFIG,
  ECOMMERCE_PACKAGES,
  getChargeableAddonIds,
  getPricingPackageConfig,
  isEcommerceProjectType,
  isPricingPackageId,
  isSaasProjectType,
  SAAS_PACKAGES,
} from "@/lib/constants";
import {
  getBusinessAddonCatalog,
  getBusinessAddonDetectionRules,
  inferBusinessCategoryForLabels,
} from "@/lib/business-addon-catalog";
import {
  getRegionalPricingConfig,
  isCurrencyCode,
  type CurrencyCode,
  type ExchangeRates,
} from "@/lib/currency";
import { reviewInquiryScope } from "@/lib/inquiry-review";
import type {
  Inquiry,
  InquiryScopeEstimate,
  ScopePricingPackageId,
  PricingRuleConfig,
} from "@/lib/types";

export const INQUIRY_SCOPE_ESTIMATE_VERSION = "inquiry-scope-v1";

export interface InquiryScopeSelection {
  packageId: ScopePricingPackageId | null;
  addonIds: string[];
}

const PACKAGE_LABELS: Record<ScopePricingPackageId, string> = {
  package_1: "Package 1 — Without Client Admin",
  package_2: "Package 2 — With Client Admin",
  ecommerce_starter: ECOMMERCE_PACKAGES.ecommerce_starter.label,
  ecommerce_business: ECOMMERCE_PACKAGES.ecommerce_business.label,
  ecommerce_advanced: ECOMMERCE_PACKAGES.ecommerce_advanced.label,
  saas_starter: SAAS_PACKAGES.saas_starter.label,
  saas_business: SAAS_PACKAGES.saas_business.label,
  saas_enterprise: SAAS_PACKAGES.saas_enterprise.label,
};

const ADDON_MATCHERS: Array<{ id: string; pattern: RegExp }> = [
  { id: "property_filters", pattern: /\b(advanced property filters?|property listing filters?|filter(?:ing)? (?:properties|property listings) by|property listing page.{0,60}advanced filters?)\b/i },
  { id: "theme_switcher", pattern: /\b(dark\s*\/\s*light (?:mode|theme)|dark and light (?:mode|theme)|theme switcher|switch(?:ing)? (?:between )?themes|toggle (?:between )?dark and light)\b/i },
  { id: "cms", pattern: /\b(content management system|cms|edit (?:website )?(?:pages|content|text|banners|images) without code)\b/i },
  { id: "advanced_seo", pattern: /\b(advanced seo|technical seo setup|structured data|canonical urls?)\b/i },
  { id: "multilingual_support", pattern: /\b(multi[- ]language|multiple languages|language switch(?:er|ing))\b/i },
  { id: "email_notifications", pattern: /\b(email notifications?|automated email alerts?)\b/i },
  { id: "admin_dashboard", pattern: /\b(client admin|admin dashboard|staff dashboard|owner dashboard|manage (?:products|orders|inventory|website data) from (?:a|the) dashboard)\b/i },
  { id: "user_accounts", pattern: /\b(user registration|customer accounts?|user login|member accounts?)\b/i },
  { id: "payment_gateway", pattern: /\b(payment gateway|online payments?|card payments?|checkout payments?)\b/i },
  { id: "api_integration", pattern: /\b(api integration|integrate with (?:an )?external (?:service|system|provider))\b/i },
  { id: "custom_advanced_feature", pattern: /\b(custom advanced feature|bespoke workflow|third[- ]party api hookup|customized algorithm)\b/i },
];

function packageForInquiry(inquiry: Inquiry, content: string): ScopePricingPackageId | null {
  if (inquiry.pricingPackage && isPricingPackageId(inquiry.pricingPackage)) {
    return inquiry.pricingPackage;
  }
  const explicitPackage = content.match(/\b(ecommerce|e-commerce|saas)[\s-]+(starter|business|advanced|enterprise)\b/i);
  if (explicitPackage) {
    const key = `${explicitPackage[1].toLowerCase().replace("-", "")}_${explicitPackage[2].toLowerCase()}`;
    if (isPricingPackageId(key)) return key;
  }
  const projectTypes = inquiry.projectTypes || [];
  const isSaas = projectTypes.some(isSaasProjectType) ||
    /\b(saas|subscription software|multi[- ]tenant platform)\b/i.test(content);
  if (isSaas) {
    if (/\b(saas enterprise|enterprise saas|enterprise platform|large[- ]scale saas)\b/i.test(content)) {
      return "saas_enterprise";
    }
    if (/\b(saas business|business saas)\b/i.test(content)) return "saas_business";
    return "saas_starter";
  }

  const isEcommerce = projectTypes.some(isEcommerceProjectType) ||
    /\b(e[- ]commerce|online store|online shop|shopping cart|product checkout)\b/i.test(content) ||
    (/\b(restaurant|cafe|food shop|bakery)\b/i.test(content) &&
      /\b(online ordering|order online|cart|checkout)\b/i.test(content));
  if (isEcommerce) return "ecommerce_starter";

  const isWebsite = /\b(website|web site|homepage|home page|landing page|online presence|business site|property listing)\b/i.test(content) ||
    projectTypes.some((type) => /\b(website|web site|site design)\b/i.test(type));
  const customSoftwareRequest = /\b(crm|booking platform|appointment (?:booking )?system|inventory management system|custom software|custom platform)\b/i.test(content);
  if (!isWebsite || customSoftwareRequest) return null;
  return inquiry.adminPanelType === "client_admin" ? "package_2" : "package_1";
}

function getPackageConfig(
  config: PricingRuleConfig,
  packageId: ScopePricingPackageId
): { config: PricingRuleConfig; basePrice: number; maximumPrice?: number } {
  if (packageId === "package_1") {
    return { config, basePrice: config.baseWithoutAdmin };
  }
  if (packageId === "package_2") {
    return { config, basePrice: config.baseWithAdmin };
  }
  const packageConfig = getPricingPackageConfig(config, packageId);
  const packageDetails = packageId in ECOMMERCE_PACKAGES
    ? ECOMMERCE_PACKAGES[packageId as keyof typeof ECOMMERCE_PACKAGES]
    : SAAS_PACKAGES[packageId as keyof typeof SAAS_PACKAGES];
  return {
    config: packageConfig,
    basePrice: packageDetails.basePrice,
    ...("maximumPrice" in packageDetails ? { maximumPrice: packageDetails.maximumPrice } : {}),
  };
}

function getRequestedAddonIds(content: string, inquiry: Inquiry, config: PricingRuleConfig): Set<string> {
  const ids = new Set<string>();
  const explicitlySelected = Array.isArray(inquiry.selectedAddons) ? inquiry.selectedAddons : [];
  for (const id of explicitlySelected) {
    if (config.addons[id]?.enabled) ids.add(id);
  }
  if (inquiry.adminPanelType === "client_admin" && config.addons.admin_dashboard?.enabled) {
    ids.add("admin_dashboard");
  }

  for (const matcher of ADDON_MATCHERS) {
    if (matcher.pattern.test(content) && config.addons[matcher.id]?.enabled) {
      ids.add(matcher.id);
    }
  }

  const categoryId = inferBusinessCategoryForLabels([
    ...(inquiry.projectTypes || []),
    inquiry.businessName,
    inquiry.productsServices,
    inquiry.problemToSolve,
  ]);
  if (categoryId) {
    const catalog = getBusinessAddonCatalog(config.addons);
    const matchingIds = new Set(
      getBusinessAddonDetectionRules()
        .filter((rule) => rule.categoryId === categoryId && rule.pattern.test(content))
        .map((rule) => rule.id)
    );
    for (const addon of catalog) {
      const labelPattern = new RegExp(
        `\\b${addon.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+")}\\b`,
        "i"
      );
      if (addon.categoryId === categoryId && (matchingIds.has(addon.id) || labelPattern.test(content))) {
        ids.add(addon.id);
      }
    }
  }
  return ids;
}

function hasMeaningfulScope(inquiry: Inquiry, content: string, packageId: ScopePricingPackageId | null): boolean {
  if (!content.trim()) return false;
  const providedDetails = [
    inquiry.problemToSolve,
    inquiry.targetAudience,
    inquiry.productsServices,
    inquiry.customFeatureNotes || "",
    inquiry.customerIntro || "",
  ].some((value) => value.trim().length > 0);
  const specificProjectType = (inquiry.projectTypes || []).some(
    (type) => type.trim() && !/^custom web application$/i.test(type.trim())
  );
  if (!providedDetails && !specificProjectType) return false;
  if (packageId && packageId !== "package_1" && packageId !== "package_2") return true;
  if (/\b(website|web site|web application|web app|homepage|home page|landing page|online presence|property listing|online store|e[- ]commerce|saas)\b/i.test(content)) {
    return true;
  }
  if ((inquiry.projectTypes || []).some((type) => isEcommerceProjectType(type) || isSaasProjectType(type))) {
    return true;
  }
  return /\b(crm|booking|appointment|inventory management|custom software|application|platform|portal)\b/i.test(content) &&
    !/^custom web application$/i.test((inquiry.projectTypes || []).join(" ").trim());
}

function getBusinessBasePackage(packageId: ScopePricingPackageId): boolean {
  return packageId === "package_1" || packageId === "package_2";
}

export function calculateInquiryScopeEstimate(
  inquiry: Inquiry,
  pricingConfig: PricingRuleConfig = DEFAULT_PRICING_CONFIG,
  options: {
    selection?: InquiryScopeSelection;
    exchangeRate?: number;
    usdExchangeRate?: number;
    now?: string;
  } = {}
): InquiryScopeEstimate {
  const config = pricingConfig;
  const content = [
    ...(inquiry.projectTypes || []),
    inquiry.problemToSolve,
    inquiry.targetAudience,
    inquiry.productsServices,
    inquiry.customFeatureNotes || "",
    inquiry.customerIntro || "",
    ...(inquiry.adminFeatures || []),
    ...(inquiry.selectedAddons || []),
  ].filter(Boolean).join(" ");
  const initialPackageId = packageForInquiry(inquiry, content);
  const packageId = options.selection ? options.selection.packageId : initialPackageId;
  const missingDetails = reviewInquiryScope(inquiry, options.now).missingDetails;
  const reviewReasons: string[] = [];
  const hasScope = hasMeaningfulScope(inquiry, content, packageId);
  const isKnownWebsite = /\b(website|web site|web application|web app|homepage|home page|landing page|online presence|property listing)\b/i.test(content);
  const isComplexCustomSoftware = /\b(crm|booking platform|appointment platform|inventory management system|custom software|custom platform)\b/i.test(content);
  const adminDashboardRequested = inquiry.adminPanelType === "client_admin" ||
    (inquiry.selectedAddons || []).includes("admin_dashboard") ||
    (ADDON_MATCHERS.find((matcher) => matcher.id === "admin_dashboard")?.pattern.test(content) || false);
  const addonIds = options.selection
    ? Array.from(new Set(options.selection.addonIds))
    : Array.from(getRequestedAddonIds(content, inquiry, config));
  const selectedAddons = addonIds.filter((id) => config.addons[id]?.enabled);
  const projectHasKnownPrice = packageId !== null && (
    getBusinessBasePackage(packageId) ||
    packageId in ECOMMERCE_PACKAGES ||
    packageId in SAAS_PACKAGES
  );
  const selectedAdminPanel = packageId === "package_2";

  if (!hasScope) {
    reviewReasons.push("Insufficient information for a scope-based estimate.");
  }
  if ((inquiry.selectedAddons || []).some((id) => !config.addons[id]?.enabled)) {
    reviewReasons.push("One or more customer-selected add-ons are inactive or unpublished and were excluded from this estimate.");
  }
  if (!projectHasKnownPrice && hasScope) {
    reviewReasons.push("No published starting package is mapped to this service; admin pricing review is required.");
  }
  if (isComplexCustomSoftware) {
    reviewReasons.push("Custom application workflows need a manual scope review.");
  }
  if (inquiry.customFeatureNotes?.trim()) {
    reviewReasons.push("Custom requirements must be scoped before confirming a quotation.");
  }
  if (packageId === "ecommerce_advanced") {
    reviewReasons.push("The published E-Commerce Advanced package is a range; confirm the final scope and amount.");
  }
  if (selectedAddons.some((id) => config.addons[id]?.requiresCustomQuote)) {
    reviewReasons.push("At least one requested add-on requires a custom quotation.");
  }

  let calculation: InquiryScopeEstimate["calculation"] = null;
  let regionalCalculation: InquiryScopeEstimate["regionalCalculation"];
  let selectedConfig = config;
  let basePrice = 0;
  let packageLabel: string | null = packageId ? PACKAGE_LABELS[packageId] : null;
  let chargeableAddons: string[] = [];
  let includedAddons: string[] = [];
  let maximumPrice: number | undefined;
  let regionalMaximumPrice: number | undefined;

  if (hasScope && projectHasKnownPrice && packageId) {
    const packageData = getPackageConfig(config, packageId);
    selectedConfig = packageData.config;
    basePrice = packageData.basePrice;
    maximumPrice = packageData.maximumPrice;
    if (getBusinessBasePackage(packageId)) {
      selectedConfig = {
        ...config,
        baseWithoutAdmin: packageId === "package_1" ? config.baseWithoutAdmin : config.baseWithAdmin,
        baseWithAdmin: packageId === "package_1" ? config.baseWithoutAdmin : config.baseWithAdmin,
      };
    }
    const packageAdminType = selectedAdminPanel ? "client_admin" : "none";
    chargeableAddons = getChargeableAddonIds(selectedAddons, packageId === "package_1" || packageId === "package_2" ? null : packageId, packageAdminType);
    includedAddons = selectedAddons.filter((id) => !chargeableAddons.includes(id));
    calculation = calculateBudget(packageAdminType, chargeableAddons, selectedConfig);
    if (packageId === "package_1" || packageId === "package_2") {
      calculation = {
        ...calculation,
        basePrice,
        adminFee: packageId === "package_2" ? config.baseWithAdmin - config.baseWithoutAdmin : 0,
        estimatedTotal: basePrice + calculation.addonsTotal + calculation.contingencyAmount,
        advanceAmount: Math.min(config.advanceDefault, basePrice + calculation.addonsTotal + calculation.contingencyAmount),
        remainingBalance: Math.max(0, basePrice + calculation.addonsTotal + calculation.contingencyAmount - config.advanceDefault),
      };
    }

    const currency: CurrencyCode = isCurrencyCode(inquiry.currency) ? inquiry.currency : "PKR";
    const exchangeRate = options.exchangeRate ?? inquiry.exchangeRate;
    const usdExchangeRate = options.usdExchangeRate ?? inquiry.usdExchangeRate ??
      (currency === "USD" ? exchangeRate : undefined);
    const regionalRates: ExchangeRates = {
      [currency]: exchangeRate,
      ...(usdExchangeRate ? { USD: usdExchangeRate } : {}),
    };
    if (currency !== "PKR") {
      if (exchangeRate && Number.isFinite(exchangeRate) && exchangeRate > 0) {
        try {
          const regionalConfig = getRegionalPricingConfig(selectedConfig, currency, regionalRates);
          regionalCalculation = calculateBudget(packageAdminType, chargeableAddons, regionalConfig);
          if (packageId === "package_1" || packageId === "package_2") {
            const regionalBase = packageId === "package_2" ? regionalConfig.baseWithAdmin : regionalConfig.baseWithoutAdmin;
            regionalCalculation = {
              ...regionalCalculation,
              basePrice: regionalBase,
              adminFee: packageId === "package_2" ? regionalConfig.baseWithAdmin - regionalConfig.baseWithoutAdmin : 0,
              estimatedTotal: regionalBase + regionalCalculation.addonsTotal + regionalCalculation.contingencyAmount,
              advanceAmount: Math.min(regionalConfig.advanceDefault, regionalBase + regionalCalculation.addonsTotal + regionalCalculation.contingencyAmount),
            };
          }
        } catch {
          reviewReasons.push("Regional currency conversion is unavailable; review the exchange rate before quoting.");
        }
      } else {
        reviewReasons.push("Regional currency conversion is unavailable; review the exchange rate before quoting.");
      }
    }
    if (maximumPrice !== undefined) {
      const maximumBasePrice = maximumPrice;
      const maxConfig = { ...selectedConfig, baseWithoutAdmin: maximumBasePrice, baseWithAdmin: maximumBasePrice };
      const maxCalculation = calculateBudget("none", chargeableAddons, maxConfig);
      maximumPrice = maxCalculation.estimatedTotal;
      if (regionalCalculation) {
        const currency = inquiry.currency as CurrencyCode;
        const regionalMaxConfig = getRegionalPricingConfig(maxConfig, currency, regionalRates);
        regionalMaximumPrice = calculateBudget("none", chargeableAddons, regionalMaxConfig).estimatedTotal;
      }
    }
  }

  if (adminDashboardRequested && packageId === "package_1") {
    reviewReasons.push("The current Package 1 selection does not include a client-managed dashboard.");
  }
  const recommendedPackage = adminDashboardRequested && packageId === "package_1"
    ? {
        id: "package_2" as const,
        label: PACKAGE_LABELS.package_2,
        reason: "The requirements mention a client-managed dashboard; review Package 2 against the current Package 1 selection.",
      }
    : undefined;

  const lines: InquiryScopeEstimate["lines"] = [];
  if (calculation && packageId && packageLabel) {
    lines.push({ id: packageId, label: packageLabel, amount: calculation.basePrice, kind: "base" });
    for (const id of chargeableAddons) {
      const addon = selectedConfig.addons[id];
      const selectedDetail = calculation.selectedAddonDetails.find((detail) => detail.id === id);
      if (addon && selectedDetail) {
        lines.push({
          id,
          label: addon.label,
          amount: selectedDetail.price,
          kind: "addon",
          ...((addon.billingPeriod === "monthly" || addon.requiresCustomQuote)
            ? {
                note: [
                  addon.billingPeriod === "monthly" ? "Recurring monthly; not included in one-time total" : "",
                  addon.requiresCustomQuote ? "Requires custom quotation" : "",
                ].filter(Boolean).join("; "),
              }
            : {}),
        });
      }
    }
    for (const id of includedAddons) {
      const addon = selectedConfig.addons[id];
      if (addon) lines.push({ id, label: addon.label, amount: 0, kind: "included", note: "Included in the selected package" });
    }
  }
  if (/\b(lead capture|contact form|inquiry form|contact us form)\b/i.test(content)) {
    lines.push({ id: "included_lead_capture", label: "Contact / lead capture form", amount: 0, kind: "included", note: "Included in the published starting website package" });
  }
  if (/\b(dark mode|luxe|gold accents?|cinematic|premium design|visual style)\b/i.test(content) &&
      !ADDON_MATCHERS.find((matcher) => matcher.id === "theme_switcher")?.pattern.test(content)) {
    lines.push({ id: "design_preference", label: "Visual design preference", amount: 0, kind: "included", note: "Design direction only; no theme-switching add-on inferred" });
  }

  const unmatchedRequestedFeatures = isComplexCustomSoftware || Boolean(inquiry.customFeatureNotes?.trim());
  if (unmatchedRequestedFeatures && !reviewReasons.some((reason) => reason.includes("manual scope review"))) {
    reviewReasons.push("Some requested custom functionality is not priced by a verified catalog entry.");
  }
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const detectedAddonCount = selectedAddons.length;
  const confidence: InquiryScopeEstimate["confidence"] = !hasScope || wordCount <= 8
    ? "low"
    : detectedAddonCount > 0 || wordCount > 25
      ? "medium"
      : missingDetails.length === 0
        ? "high"
        : "medium";

  const regionalUnavailable = isCurrencyCode(inquiry.currency) && inquiry.currency !== "PKR" && !regionalCalculation;
  const estimateStatus: InquiryScopeEstimate["estimateStatus"] = !hasScope
    ? "insufficient_information"
    : !projectHasKnownPrice || reviewReasons.length > 0
      ? "admin_review_required"
      : "preliminary_estimate";
  const includedFeatures = lines.filter((line) => line.kind === "included").map((line) => line.label);

  return {
    engineVersion: INQUIRY_SCOPE_ESTIMATE_VERSION,
    estimatedAt: options.now || new Date().toISOString(),
    pricingPackageId: packageId,
    packageLabel,
    selectedAddonIds: selectedAddons,
    currency: regionalUnavailable ? "PKR" : (isCurrencyCode(inquiry.currency) ? inquiry.currency : "PKR"),
    ...(options.exchangeRate ?? inquiry.exchangeRate
      ? { exchangeRate: options.exchangeRate ?? inquiry.exchangeRate }
      : {}),
    calculation,
    ...(regionalCalculation ? { regionalCalculation } : {}),
    ...(maximumPrice !== undefined ? { maximumEstimatedTotal: maximumPrice } : {}),
    ...(regionalMaximumPrice !== undefined ? { regionalMaximumEstimatedTotal: regionalMaximumPrice } : {}),
    lines,
    matchedFeatures: lines.filter((line) => line.kind !== "base").map((line) => line.label),
    includedFeatures,
    missingDetails,
    reviewReasons: Array.from(new Set(reviewReasons)),
    ...(recommendedPackage ? { recommendedPackage } : {}),
    confidence,
    estimateStatus,
    scopeStatus: missingDetails.length ? "needs_follow_up" : "ready_for_quotation",
    pricingSnapshot: {
      basePrice,
      addonPrices: Object.fromEntries(
        selectedAddons.map((id) => [id, selectedConfig.addons[id]?.price || 0])
      ),
    },
  };
}
