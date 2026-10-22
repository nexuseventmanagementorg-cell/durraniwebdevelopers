import {
  DEFAULT_PRICING_CONFIG,
  ECOMMERCE_PACKAGES,
  SAAS_PACKAGES,
  type PricingPackageId,
} from "./constants";
import type { PortfolioProject } from "./types";

export interface TemplateRequestPlan {
  id: string;
  name: string;
  price: number;
  note: string;
  packageId?: PricingPackageId;
  adminPanelType: "none" | "client_admin";
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
