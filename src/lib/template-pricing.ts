import {
  DEFAULT_PRICING_CONFIG,
  ECOMMERCE_PACKAGES,
  getAddonPriceForPackage,
  getChargeableAddonIds,
  isPricingPackageId,
  SAAS_PACKAGES,
  type PricingPackageId,
} from "./constants";
import type { AddonOption, PortfolioProject, PricingRuleConfig } from "./types";

export interface TemplateRequestPlan {
  id: string;
  name: string;
  price: number;
  note: string;
  packageId?: PricingPackageId;
  adminPanelType: "none" | "client_admin";
}

export interface TemplateIncludedAddonTotals {
  oneTime: number;
  monthly: number;
}

export interface TemplatePriceBreakdown {
  plan: TemplateRequestPlan;
  includedAddons: Array<AddonOption & { includedPrice: number }>;
  oneTimeTotal: number;
  monthlyTotal: number;
  total: number;
}

const BASE_TEMPLATE_PLANS: TemplateRequestPlan[] = [
  { id: "without_admin", name: "Package 1 — Durrani-managed", price: 35000, note: "No client admin panel", adminPanelType: "none" },
  { id: "with_admin", name: "Package 2 — Client admin panel", price: 45000, note: "Manage website content through an admin panel", adminPanelType: "client_admin" },
  { id: "ecommerce_starter", name: ECOMMERCE_PACKAGES.ecommerce_starter.label, price: ECOMMERCE_PACKAGES.ecommerce_starter.basePrice, note: "Focused online store with essential shopping workflows", packageId: "ecommerce_starter", adminPanelType: "client_admin" },
  { id: "ecommerce_business", name: ECOMMERCE_PACKAGES.ecommerce_business.label, price: ECOMMERCE_PACKAGES.ecommerce_business.basePrice, note: "Online store with business essentials", packageId: "ecommerce_business", adminPanelType: "client_admin" },
  { id: "ecommerce_advanced", name: ECOMMERCE_PACKAGES.ecommerce_advanced.label, price: ECOMMERCE_PACKAGES.ecommerce_advanced.basePrice, note: `Starting price; scope may reach PKR ${ECOMMERCE_PACKAGES.ecommerce_advanced.maximumPrice.toLocaleString("en-PK")}`, packageId: "ecommerce_advanced", adminPanelType: "client_admin" },
  { id: "saas_starter", name: SAAS_PACKAGES.saas_starter.label, price: SAAS_PACKAGES.saas_starter.basePrice, note: "SaaS starting plan", packageId: "saas_starter", adminPanelType: "none" },
  { id: "saas_business", name: SAAS_PACKAGES.saas_business.label, price: SAAS_PACKAGES.saas_business.basePrice, note: "SaaS business plan", packageId: "saas_business", adminPanelType: "none" },
  { id: "saas_enterprise", name: SAAS_PACKAGES.saas_enterprise.label, price: SAAS_PACKAGES.saas_enterprise.basePrice, note: "Enterprise SaaS starting price", packageId: "saas_enterprise", adminPanelType: "none" },
];

const LEGACY_TEMPLATE_HOSTS: Record<string, string[]> = {
  "grillvi-gtroad": ["grillvi-gtroad.vercel.app"],
};

export function matchesPortfolioProjectUrl(project: PortfolioProject, value: string): boolean {
  if (!project.demoUrl) return false;
  try {
    const candidateHost = new URL(value).hostname.toLowerCase();
    const demoHost = new URL(project.demoUrl).hostname.toLowerCase();
    return candidateHost === demoHost ||
      (LEGACY_TEMPLATE_HOSTS[project.id] || []).includes(candidateHost);
  } catch {
    return false;
  }
}

function getTemplatePackage(
  template: PortfolioProject,
  templatePrice: number,
  preferredPackageId?: string
): TemplateRequestPlan | undefined {
  const templateText = `${template.category} ${template.title} ${template.shortDescription} ${template.technologies.join(" ")}`;
  const isSaas = preferredPackageId?.startsWith("saas_") || /\bsaas\b/i.test(templateText);
  const isEcommerce = preferredPackageId?.startsWith("ecommerce_") ||
    /restaurant|food|menu|order|shop|store|e-commerce/i.test(templateText);
  const matchingPlans = BASE_TEMPLATE_PLANS.filter((plan) =>
    isSaas
      ? plan.id.startsWith("saas_")
      : plan.id.startsWith("ecommerce_") && isEcommerce
  );
  return matchingPlans
    .filter((plan) => plan.price <= templatePrice)
    .sort((a, b) => b.price - a.price)[0] || matchingPlans[0];
}

export function getTemplateRequestPlans(template: PortfolioProject): TemplateRequestPlan[] {
  const templatePrice = template.templateStartingPrice ??
    template.approvedPublicBudget ??
    DEFAULT_PRICING_CONFIG.baseWithoutAdmin;
  const explicitPlan = template.templatePricingPackage
    ? BASE_TEMPLATE_PLANS.find((plan) => plan.id === template.templatePricingPackage)
    : undefined;
  const packagePlan = getTemplatePackage(template, templatePrice, explicitPlan?.id);
  const packageTitle = packagePlan?.packageId
    ? packagePlan.name
    : "Custom website template";
  const startingPlan: TemplateRequestPlan = {
    id: "template_starting",
    name: `${template.title} — ${packageTitle}`,
    price: templatePrice,
    note: "Template starting price; new features and customizations are quoted separately",
    ...(packagePlan?.packageId ? { packageId: packagePlan.packageId } : {}),
    adminPanelType: packagePlan?.adminPanelType || "none",
  };
  const eligibleUpgradePlans = BASE_TEMPLATE_PLANS.filter((plan) =>
    plan.price > templatePrice &&
    (packagePlan?.id.startsWith("saas_")
      ? plan.id.startsWith("saas_")
      : packagePlan?.id.startsWith("ecommerce_")
        ? plan.id.startsWith("ecommerce_")
        : !plan.packageId)
  );

  return [startingPlan, ...eligibleUpgradePlans];
}

export function getTemplateChargeableAddonIds(
  template: PortfolioProject,
  plan: TemplateRequestPlan,
  addonIds: string[]
): string[] {
  const packageId = plan.packageId ||
    (isPricingPackageId(plan.id) ? plan.id : undefined);
  const templateIncludedAddonIds = new Set(template.templateIncludedAddonIds || []);
  return getChargeableAddonIds(addonIds, packageId, plan.adminPanelType)
    .filter((id) => !templateIncludedAddonIds.has(id));
}

export function getTemplateIncludedAddonTotals(
  template: PortfolioProject,
  addons: AddonOption[],
  plan: TemplateRequestPlan = getTemplateRequestPlans(template)[0]
): TemplateIncludedAddonTotals {
  const packageId = plan?.packageId ||
    (plan && isPricingPackageId(plan.id) ? plan.id : undefined);
  return (template.templateIncludedAddonIds || []).reduce<TemplateIncludedAddonTotals>(
    (totals, id) => {
      const addon = addons.find((entry) => entry.id === id);
      if (!addon) return totals;
      const price = template.templateIncludedAddonPrices?.[id] ??
        getAddonPriceForPackage(addon, packageId);
      if (addon.billingPeriod === "monthly") totals.monthly += price;
      else totals.oneTime += price;
      return totals;
    },
    { oneTime: 0, monthly: 0 }
  );
}

export function getTemplatePriceBreakdown(
  template: PortfolioProject,
  addons: AddonOption[] = Object.values(DEFAULT_PRICING_CONFIG.addons),
  plan: TemplateRequestPlan = getTemplateRequestPlans(template)[0]
): TemplatePriceBreakdown {
  const packageId = plan?.packageId ||
    (plan && isPricingPackageId(plan.id) ? plan.id : undefined);
  const includedAddons = (template.templateIncludedAddonIds || []).flatMap((id) => {
    const configuredAddon = addons.find((addon) => addon.id === id);
    if (!configuredAddon) return [];
    const price = template.templateIncludedAddonPrices?.[id] ??
      getAddonPriceForPackage(configuredAddon, packageId);
    return [{ ...configuredAddon, includedPrice: price }];
  });
  const oneTimeTotal = includedAddons
    .filter((addon) => addon.billingPeriod !== "monthly")
    .reduce((total, addon) => total + addon.includedPrice, 0);
  const monthlyTotal = includedAddons
    .filter((addon) => addon.billingPeriod === "monthly")
    .reduce((total, addon) => total + addon.includedPrice, 0);
  const total = (plan?.price || 0) + oneTimeTotal;

  return { plan, includedAddons, oneTimeTotal, monthlyTotal, total };
}

export function getPortfolioFeatureLabels(
  project: PortfolioProject,
  addons: AddonOption[] = Object.values(DEFAULT_PRICING_CONFIG.addons)
): string[] {
  const labels = [
    ...project.technologies,
    ...(project.templateIncludedAddonIds || []).flatMap((id) => {
      const addon = addons.find((entry) => entry.id === id) ||
        DEFAULT_PRICING_CONFIG.addons[id];
      return addon ? [addon.label] : [];
    }),
  ];
  const seen = new Set<string>();
  return labels.filter((label) => {
    const normalized = label.trim().toLocaleLowerCase();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

export function applyTemplatePricingToCalculator(
  pricingConfig: PricingRuleConfig,
  template: PortfolioProject | null,
  selectedPackage: PricingPackageId | null
): PricingRuleConfig {
  if (
    !template ||
    !selectedPackage ||
    selectedPackage !== template.templatePricingPackage
  ) return pricingConfig;
  const basePrice = template.templateStartingPrice ?? template.approvedPublicBudget;
  if (!basePrice) return pricingConfig;

  return {
    ...pricingConfig,
    baseWithoutAdmin: basePrice,
    baseWithAdmin: basePrice,
    addons: Object.fromEntries(
      Object.entries(pricingConfig.addons).map(([id, addon]) => [
        id,
        template.templateIncludedAddonPrices?.[id] === undefined
          ? addon
          : { ...addon, price: template.templateIncludedAddonPrices[id] },
      ])
    ),
  };
}
