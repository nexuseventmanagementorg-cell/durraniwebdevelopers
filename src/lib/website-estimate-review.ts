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

export function calculateReviewedWebsiteEstimate(
  estimate: WebsiteEstimateResult,
  scopeMode: WebsiteScopeMode,
  selectedNewBuildAddons: string[],
  featureScopes: Record<string, ExistingFeatureScope>,
  ownerConfirmedAddons: string[],
  selectedPricingOptionId = estimate.suggestedPricingOptionId
) {
  const requestedAddonIds = scopeMode === "existing_site"
    ? [
        ...estimate.features
          .filter((feature) => featureScopes[feature.id] === "new" && feature.addonId)
          .map((feature) => feature.addonId as string),
        ...ownerConfirmedAddons,
      ]
    : selectedNewBuildAddons;
  const selectedPricingOption = estimate.pricingOptions.find(
    (option) => option.id === selectedPricingOptionId
  ) || estimate.pricingOptions[0];
  const pricingPackage = scopeMode === "new_build"
    ? selectedPricingOption?.pricingPackage
    : null;
  const adminPanelType = scopeMode === "new_build"
    ? selectedPricingOption?.adminPanelType || "none"
    : "none";
  const chargeableAddonIds = getChargeableAddonIds(
    requestedAddonIds,
    pricingPackage,
    adminPanelType
  );
  const basePrice = scopeMode === "new_build"
    ? selectedPricingOption?.basePrice || 0
    : 0;
  const basePriceWithAdmin = scopeMode === "new_build"
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
          price: scopeMode === "new_build" && estimate.currency === "PKR" && addon.basePrice !== undefined
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
      : selectedPricingOption?.label || estimate.basePackage,
    unpricedRepairs: estimate.features.filter(
      (feature) => featureScopes[feature.id] === "repair"
    ),
  };
}

export function getDefaultNewBuildAddonIds(
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
