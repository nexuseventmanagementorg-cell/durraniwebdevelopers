import {
  calculateBudget,
  DEFAULT_PRICING_CONFIG,
  getChargeableAddonIds,
  getAddonPriceForPackage,
} from "./constants";
import type {
  ExistingFeatureScope,
  WebsiteEstimateResult,
  WebsiteScopeMode,
} from "./website-estimator";
import type { AddonOption } from "./types";

export type MarketplaceRequirementKey =
  | "productCount"
  | "productVariants"
  | "sellerPortal"
  | "inventoryWarehouses"
  | "searchRecommendations"
  | "checkoutPaymentsRefunds"
  | "shippingFulfillment"
  | "customerAccountsLoyalty"
  | "adminSecurityAudit"
  | "trafficAvailability"
  | "mobileIntegrations";

export type MarketplaceRequirementAnswers = Record<MarketplaceRequirementKey, string>;

const REQUIREMENT_ADDON_IDS: Partial<Record<MarketplaceRequirementKey, string[]>> = {
  productVariants: ["advanced_product_management"],
  sellerPortal: ["vendor_management", "commission_payouts"],
  inventoryWarehouses: ["inventory_management", "multi_warehouse"],
  searchRecommendations: ["search_filter_sort", "smart_search", "ai_product_recommendations"],
  checkoutPaymentsRefunds: ["payment_gateway", "order_invoice_management"],
  shippingFulfillment: ["shipping_rules", "order_tracking"],
  customerAccountsLoyalty: ["user_accounts", "product_reviews", "loyalty_rewards"],
  adminSecurityAudit: ["role_permissions", "platform_audit_monitoring", "audit_trail"],
  mobileIntegrations: ["api_integration"],
};

const SCOPE_PRICING_OPTION_IDS: Partial<Record<WebsiteScopeMode, string[]>> = {
  basic_informational: ["package_1", "package_2"],
  standard_ecommerce: ["ecommerce_starter", "ecommerce_business"],
  advanced_ecommerce: ["ecommerce_advanced"],
  saas_platform: ["saas_starter", "saas_business", "saas_enterprise"],
};

export function getPricingOptionIdsForScope(scope: WebsiteScopeMode): string[] {
  return SCOPE_PRICING_OPTION_IDS[scope] || [];
}

export function isManualQuoteScope(scope: WebsiteScopeMode): boolean {
  return scope === "multi_vendor_marketplace" ||
    scope === "enterprise_marketplace" ||
    scope === "custom_review";
}

export function getRequirementAddonIds(answers: MarketplaceRequirementAnswers): string[] {
  return Array.from(new Set(
    Object.entries(answers)
      .filter(([, answer]) => answer === "yes")
      .flatMap(([key]) => REQUIREMENT_ADDON_IDS[key as MarketplaceRequirementKey] || [])
  ));
}

export function calculateReviewedWebsiteEstimate(
  estimate: WebsiteEstimateResult,
  scopeMode: WebsiteScopeMode,
  selectedNewBuildAddons: string[],
  featureScopes: Record<string, ExistingFeatureScope>,
  ownerConfirmedAddons: string[],
  selectedPricingOptionId = estimate.suggestedPricingOptionId
) {
  const requestedAddonIds = scopeMode === "unselected"
    ? []
    : scopeMode === "existing_site"
    ? [
        ...estimate.features
          .filter((feature) => featureScopes[feature.id] === "new" && feature.addonId)
          .map((feature) => feature.addonId as string),
        ...ownerConfirmedAddons,
      ]
    : selectedNewBuildAddons;
  const selectedPricingOption = estimate.pricingOptions.find(
    (option) => option.id === selectedPricingOptionId
  );
  const isPricedScope = scopeMode === "basic_informational" ||
    scopeMode === "standard_ecommerce" ||
    scopeMode === "advanced_ecommerce" ||
    scopeMode === "saas_platform";
  const pricingPackage = scopeMode === "standard_ecommerce" ||
    scopeMode === "advanced_ecommerce" ||
    scopeMode === "saas_platform"
    ? selectedPricingOption?.pricingPackage
    : null;
  const adminPanelType = isPricedScope
    ? selectedPricingOption?.adminPanelType || "none"
    : "none";
  const chargeableAddonIds = getChargeableAddonIds(
    requestedAddonIds,
    pricingPackage,
    adminPanelType
  );
  const basePrice = isPricedScope
    ? selectedPricingOption?.basePrice || 0
    : 0;
  const basePriceWithAdmin = isPricedScope
    ? selectedPricingOption?.basePriceWithAdmin || 0
    : 0;
  const addons = {
    ...Object.fromEntries(
      Object.entries(DEFAULT_PRICING_CONFIG.addons).map(([id, addon]) => [
        id,
        { ...addon, enabled: false },
      ])
    ),
    ...Object.fromEntries(
      estimate.addonCatalog.map((addon) => [
        addon.id,
        {
          ...DEFAULT_PRICING_CONFIG.addons[addon.id],
          id: addon.id,
          label: addon.title,
          description: addon.description,
          price: scopeMode !== "existing_site" && estimate.currency === "PKR" && addon.basePrice !== undefined
            ? getAddonPriceForPackage(
                { ...DEFAULT_PRICING_CONFIG.addons[addon.id], price: addon.basePrice },
                pricingPackage
              )
            : addon.price,
          billingPeriod: addon.billingPeriod,
          enabled: true,
        },
      ])
    ),
  };
  const calculation = calculateBudget(adminPanelType, chargeableAddonIds, {
    ...DEFAULT_PRICING_CONFIG,
    baseWithoutAdmin: basePrice,
    baseWithAdmin: basePriceWithAdmin,
    addons,
  });
  return {
    calculation,
    chargeableAddonIds,
    adminPanelType,
    basePackage: scopeMode === "existing_site"
      ? "Existing site — remaining work"
      : isManualQuoteScope(scopeMode)
        ? "Custom quotation required"
        : selectedPricingOption?.label || estimate.basePackage,
    requiresCustomQuote: isManualQuoteScope(scopeMode),
    pricedAddonsOneTimeTotal: calculation.selectedAddonDetails
      .filter((addon) => addon.billingPeriod !== "monthly")
      .reduce(
      (total, addon) => total + addon.price,
      0
    ),
    unpricedRepairs: estimate.features.filter(
      (feature) => featureScopes[feature.id] === "repair"
    ),
  };
}

export function getDetectedAddonCandidateIds(
  estimate: WebsiteEstimateResult
): string[] {
  const enabledAddonIds = new Set(estimate.addonCatalog.map((addon) => addon.id));
  return Array.from(new Set(
    [
      ...(estimate.matchedTemplateId ? [] : estimate.features.map((feature) => feature.addonId)),
      ...estimate.addons.map((addon) => addon.id),
    ].filter((addonId): addonId is string => Boolean(addonId && enabledAddonIds.has(addonId)))
  ));
}

export function calculateSelectableWebsiteEstimate(
  estimate: WebsiteEstimateResult,
  selectedAddonIds: string[]
) {
  const selectedPricingOption = estimate.pricingOptions.find(
    (option) => option.id === (estimate.pricingPackage || estimate.suggestedPricingOptionId)
  );
  const chargeableAddonIds = getChargeableAddonIds(
    selectedAddonIds,
    selectedPricingOption?.pricingPackage,
    selectedPricingOption?.adminPanelType
  );
  const detectedAddonPrices = new Map(
    estimate.addons.map((addon) => [addon.id, addon.price])
  );
  const addons = {
    ...DEFAULT_PRICING_CONFIG.addons,
    ...Object.fromEntries(
      estimate.addonCatalog.map((addon) => {
        const existingAddon = DEFAULT_PRICING_CONFIG.addons[addon.id];
        const catalogOption: AddonOption = {
          ...existingAddon,
          id: addon.id,
          label: addon.title,
          description: addon.description,
          category: existingAddon?.category || "custom",
          price: detectedAddonPrices.get(addon.id) ?? addon.price,
          enabled: true,
          billingPeriod: addon.billingPeriod || "one_time",
        };
        return [addon.id, catalogOption];
      })
    ),
  };
  const calculation = calculateBudget("none", chargeableAddonIds, {
    ...DEFAULT_PRICING_CONFIG,
    baseWithoutAdmin: estimate.basePrice,
    baseWithAdmin: estimate.basePrice,
    contingencyPercentage: estimate.contingencyPercentage || 0,
    addons,
  });
  const estimatedMaximumTotal = selectedPricingOption?.maximumPrice === undefined
    ? undefined
    : (() => {
        const maximumSubtotal = calculation.estimatedTotal -
          calculation.contingencyAmount +
          selectedPricingOption.maximumPrice -
          calculation.basePrice;
        const contingency = Math.round(
          maximumSubtotal * (estimate.contingencyPercentage || 0) / 100
        );
        return maximumSubtotal + contingency;
      })();

  return {
    calculation,
    chargeableAddonIds,
    estimatedMaximumTotal,
  };
}
