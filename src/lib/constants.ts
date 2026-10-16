import { PricingRuleConfig, CalculationBreakdown } from "./types";

export const BUSINESS_INFO = {
  name: "Durrani Web Developers",
  shortName: "DWD",
  tagline: "Ideas | Code | Real Solutions",
  headline: "We Turn Your Ideas Into Powerful Web Applications",
  subHeadline: "Your Vision, Our Development",
  email: "durraniwebdevelopers@gmail.com",
  phone: "+923299669565",
  phoneDisplay: "+923299669565",
  whatsappInternational: "923299669565",
  website: "www.durraniwebdevelopers.com",
  currency: "PKR",
  currencySymbol: "Rs.",
  operatingSystem: "Google Antigravity & Vercel",
  defaultAdvance: 10000,
  defaultInstallments: 11,
};

export function buildWhatsAppLink(message: string): string {
  const cleanPhone = BUSINESS_INFO.whatsappInternational.replace(/\D/g, "");
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function formatPKR(amount: number): string {
  return `PKR ${amount.toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export const DEFAULT_PRICING_CONFIG: PricingRuleConfig = {
  baseWithoutAdmin: 35000,
  baseWithAdmin: 45000,
  advanceDefault: 10000,
  installmentsCount: 11,
  contingencyPercentage: 0,
  addons: {
    google_auth: {
      id: "google_auth",
      label: "Google Authentication",
      category: "auth",
      price: 10000,
      description: "Secure OAuth login with Google accounts and session verification.",
      enabled: true,
    },
    supabase_db: {
      id: "supabase_db",
      label: "Supabase Database Integration",
      category: "database",
      price: 10000,
      description: "Cloud PostgreSQL relational database with Row Level Security (RLS).",
      enabled: true,
    },
    payment_gateway: {
      id: "payment_gateway",
      label: "Payment Integration (JazzCash / EasyPaisa / Bank)",
      category: "payment",
      price: 10000,
      description: "Seamless local checkout workflows with transaction reference tracking.",
      enabled: true,
    },
    advanced_dashboard: {
      id: "advanced_dashboard",
      label: "Advanced Analytics & Reporting Dashboard",
      category: "admin",
      price: 10000,
      description: "In-depth visual charts, sales tracking, and downloadable financial reports.",
      enabled: true,
    },
    ai_chatbot: {
      id: "ai_chatbot",
      label: "AI / Smart Chatbot Assistant",
      category: "ai",
      price: 10000,
      description: "Intelligent customer service bot with automated query answering.",
      enabled: true,
    },
    custom_advanced_feature: {
      id: "custom_advanced_feature",
      label: "Custom Advanced Feature",
      category: "custom",
      price: 10000,
      description: "Bespoke workflow, third-party API hookup, or customized algorithm.",
      enabled: true,
    },
  },
};

export const ECOMMERCE_PACKAGES = {
  ecommerce_business: {
    label: "E-Commerce Business",
    basePrice: 150000,
    advance: 60000,
  },
  ecommerce_advanced: {
    label: "E-Commerce Advanced",
    basePrice: 200000,
    maximumPrice: 300000,
    advance: 80000,
  },
} as const;

export const SAAS_PACKAGES = {
  saas_starter: {
    label: "SaaS Starter",
    basePrice: 250000,
    advance: 100000,
    startingAt: false,
  },
  saas_business: {
    label: "SaaS Business",
    basePrice: 500000,
    advance: 200000,
    startingAt: false,
  },
  saas_enterprise: {
    label: "SaaS Enterprise",
    basePrice: 1000000,
    advance: 400000,
    startingAt: true,
  },
} as const;

export type EcommercePackageId = keyof typeof ECOMMERCE_PACKAGES;
export type SaasPackageId = keyof typeof SAAS_PACKAGES;
export type PricingPackageId = EcommercePackageId | SaasPackageId;

const PACKAGE_INCLUDED_ADDONS: Record<PricingPackageId, string[]> = {
  ecommerce_business: ["supabase_db", "payment_gateway"],
  ecommerce_advanced: ["supabase_db", "payment_gateway", "advanced_dashboard"],
  saas_starter: ["supabase_db", "google_auth"],
  saas_business: ["supabase_db", "google_auth", "payment_gateway", "advanced_dashboard"],
  saas_enterprise: ["supabase_db", "google_auth", "payment_gateway", "advanced_dashboard"],
};

export function isEcommercePackageId(value: unknown): value is EcommercePackageId {
  return typeof value === "string" && value in ECOMMERCE_PACKAGES;
}

export function isSaasPackageId(value: unknown): value is SaasPackageId {
  return typeof value === "string" && value in SAAS_PACKAGES;
}

export function isPricingPackageId(value: unknown): value is PricingPackageId {
  return isEcommercePackageId(value) || isSaasPackageId(value);
}

export function getChargeableAddonIds(
  addonIds: string[],
  packageId?: PricingPackageId | null
): string[] {
  if (!packageId) return addonIds;
  const includedAddons = new Set(PACKAGE_INCLUDED_ADDONS[packageId]);
  return addonIds.filter((id) => !includedAddons.has(id));
}

export function getEcommercePricingConfig(
  config: PricingRuleConfig,
  packageId: EcommercePackageId
): PricingRuleConfig {
  const ecommercePackage = ECOMMERCE_PACKAGES[packageId];
  return {
    ...config,
    baseWithoutAdmin: ecommercePackage.basePrice,
    baseWithAdmin: ecommercePackage.basePrice,
    advanceDefault: ecommercePackage.advance,
  };
}

export function getSaasPricingConfig(
  config: PricingRuleConfig,
  packageId: SaasPackageId
): PricingRuleConfig {
  const saasPackage = SAAS_PACKAGES[packageId];
  return {
    ...config,
    baseWithoutAdmin: saasPackage.basePrice,
    baseWithAdmin: saasPackage.basePrice,
    advanceDefault: saasPackage.advance,
  };
}

export function getPricingPackageConfig(
  config: PricingRuleConfig,
  packageId: PricingPackageId
): PricingRuleConfig {
  return isEcommercePackageId(packageId)
    ? getEcommercePricingConfig(config, packageId)
    : getSaasPricingConfig(config, packageId);
}

export function isEcommerceProjectType(projectType: string): boolean {
  return /^(e[\s-]?commerce stores?|jewellery stores?|cosmetics(?:\s*(?:&|and)\s*beauty)?|fashion stores?|grocery stores?)$/i.test(
    projectType.trim()
  );
}

export function isSaasProjectType(projectType: string): boolean {
  return /^saas(?:\s+(?:application|project|projects))?$/i.test(projectType.trim());
}

export function getDefaultPricingPackageForProjectType(
  projectType: string
): PricingPackageId | null {
  if (isEcommerceProjectType(projectType)) return "ecommerce_business";
  if (isSaasProjectType(projectType)) return "saas_starter";
  return null;
}

export function calculateBudget(
  adminPanelType: "none" | "client_admin",
  selectedAddonIds: string[],
  pricingConfig: PricingRuleConfig = DEFAULT_PRICING_CONFIG
): CalculationBreakdown {
  const isClientAdmin = adminPanelType === "client_admin";
  const basePrice = isClientAdmin
    ? pricingConfig.baseWithAdmin
    : pricingConfig.baseWithoutAdmin;

  const adminFee = isClientAdmin
    ? pricingConfig.baseWithAdmin - pricingConfig.baseWithoutAdmin
    : 0;

  // Deduplicate addons to prevent double-charging
  const uniqueAddonIds = Array.from(new Set(selectedAddonIds));
  const selectedDetails: { id: string; label: string; price: number }[] = [];
  let addonsTotal = 0;

  for (const id of uniqueAddonIds) {
    const addon = pricingConfig.addons[id];
    if (addon && addon.enabled) {
      addonsTotal += addon.price;
      selectedDetails.push({
        id: addon.id,
        label: addon.label,
        price: addon.price,
      });
    }
  }

  const subtotal = basePrice + addonsTotal;
  const contingencyAmount = Math.round(
    (subtotal * (pricingConfig.contingencyPercentage || 0)) / 100
  );
  const estimatedTotal = subtotal + contingencyAmount;

  // Advance calculation: minimum of advanceDefault or total
  const advanceAmount = Math.min(pricingConfig.advanceDefault, estimatedTotal);
  const remainingBalance = Math.max(0, estimatedTotal - advanceAmount);

  // Installments calculation: 11 installments
  const installmentsCount = pricingConfig.installmentsCount || 11;
  let regularInstallment = 0;
  let finalInstallment = 0;

  if (remainingBalance > 0 && installmentsCount > 0) {
    // Round to 2 decimal places for 10 installments
    regularInstallment = Number((remainingBalance / installmentsCount).toFixed(2));
    const previousInstallmentsTotal = Number(
      (regularInstallment * (installmentsCount - 1)).toFixed(2)
    );
    // Final installment adjusts for any fraction rounding discrepancy
    finalInstallment = Number(
      (remainingBalance - previousInstallmentsTotal).toFixed(2)
    );
  }

  const dailyCost = Number((estimatedTotal / 365).toFixed(2));

  return {
    basePrice,
    adminFee,
    addonsTotal,
    selectedAddonDetails: selectedDetails,
    contingencyAmount,
    estimatedTotal,
    advanceAmount,
    remainingBalance,
    installmentsCount,
    regularInstallment,
    finalInstallment,
    dailyCost,
  };
}
