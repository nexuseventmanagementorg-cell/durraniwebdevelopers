import {
  DEFAULT_PRICING_CONFIG,
  calculateBudget,
  getChargeableAddonIds,
  getPricingPackageConfig,
} from "./constants";
import type { PricingPackageId } from "./constants";
import type { CalculationBreakdown } from "./types";

export type BeginnerProjectGoal =
  | "business-site"
  | "restaurant"
  | "online-store"
  | "bookings"
  | "business-tools"
  | "online-platform"
  | "not-sure";

export type BeginnerBudgetBand =
  | "under-50k"
  | "50-150k"
  | "150-300k"
  | "300k-plus"
  | "not-sure";

export interface BeginnerBudgetPlan {
  title: string;
  projectType: string;
  adminPanelType: "none" | "client_admin";
  pricingPackage: PricingPackageId | null;
  selectedAddons: string[];
  expectedBudgetRange: string;
  problemToSolve: string;
  included: string[];
  notIncluded: string[];
  calculation: CalculationBreakdown;
}

export function getBeginnerBudgetPlan(
  goal: BeginnerProjectGoal,
  budget: BeginnerBudgetBand
): BeginnerBudgetPlan {
  const hasAdminBudget = budget !== "under-50k" && budget !== "not-sure";
  const isHigherBudget = budget === "150-300k" || budget === "300k-plus";
  let title = "Business website starter";
  let projectType = "Custom web application";
  let adminPanelType: BeginnerBudgetPlan["adminPanelType"] = hasAdminBudget ? "client_admin" : "none";
  let pricingPackage: PricingPackageId | null = null;
  let selectedAddons: string[] = [];
  let expectedBudgetRange = hasAdminBudget ? "admin" : "standard";
  let problemToSolve = "I want a clear website for my business that explains what I offer and helps customers contact me.";
  let included = [
    "Business information and service pages planned around your customers.",
    "A layout that works on phones and computers.",
    "A clear contact path for customer enquiries.",
  ];
  let notIncluded = [
    "Online checkout, customer accounts, and custom integrations are not included unless agreed in the final scope.",
    "Domain, hosting, and third-party service fees are separate where applicable.",
  ];

  if (goal === "online-store") {
    projectType = "E-commerce store";
    if (isHigherBudget) {
      pricingPackage = budget === "300k-plus" ? "ecommerce_advanced" : "ecommerce_business";
      adminPanelType = "client_admin";
      expectedBudgetRange = pricingPackage === "ecommerce_advanced" ? "ecommerce-advanced" : "ecommerce-business";
      title = pricingPackage === "ecommerce_advanced" ? "Full online store, advanced scope" : "Full online store";
      problemToSolve = "I want customers to browse products, place online orders, and let my team manage products and stock.";
      included = [
        "Product catalog with product and stock management.",
        "Shopping cart, online orders, and an admin dashboard.",
        "Payment integration setup for a provider you arrange; provider fees are separate.",
        ...(pricingPackage === "ecommerce_advanced" ? ["Advanced dashboard and reporting scope."] : []),
      ];
      notIncluded = [
        "The exact product count, delivery rules, and payment-provider requirements are confirmed before the final quote.",
        "Domain, hosting, and third-party service fees are separate where applicable.",
      ];
    } else {
      title = "Start with a product catalog and WhatsApp orders";
      problemToSolve = "I want customers to see my products and contact me on WhatsApp to place an order.";
      included = [
        "A first version focused on your business and product information.",
        "A mobile-friendly catalog and a direct customer contact path.",
        "A smaller starting scope that can grow into a full checkout store later.",
      ];
      notIncluded = [
        "Automatic stock management, shopping cart, and online checkout are not part of this starter estimate.",
        "Domain, hosting, and third-party service fees are separate where applicable.",
      ];
    }
  } else if (goal === "restaurant") {
    projectType = "Restaurant website or ordering app";
    if (isHigherBudget) {
      pricingPackage = budget === "300k-plus" ? "ecommerce_advanced" : "ecommerce_business";
      adminPanelType = "client_admin";
      expectedBudgetRange = pricingPackage === "ecommerce_advanced" ? "ecommerce-advanced" : "ecommerce-business";
      title = "Restaurant menu and online ordering";
      problemToSolve = "I want customers to view my restaurant menu, place orders online, and contact us about delivery.";
      included = [
        "Restaurant menu and product catalog with order management.",
        "Online cart and order requests managed from an admin dashboard.",
        "Payment integration setup for a provider you arrange; provider fees are separate.",
        ...(pricingPackage === "ecommerce_advanced" ? ["Advanced dashboard and reporting scope."] : []),
      ];
      notIncluded = [
        "Delivery zones, menu size, and payment-provider requirements are confirmed before the final quote.",
        "Domain, hosting, and third-party service fees are separate where applicable.",
      ];
    } else {
      title = "Restaurant menu and WhatsApp orders";
      problemToSolve = "I want customers to see my menu, location, and opening hours, then contact me to place an order.";
      included = [
        "A mobile-friendly restaurant menu and business information.",
        "A direct WhatsApp and contact path for order requests.",
        "A simple starting scope that can grow into full online ordering later.",
      ];
      notIncluded = [
        "Online cart, card checkout, and automatic delivery management are not part of this starter estimate.",
        "Domain, hosting, and third-party service fees are separate where applicable.",
      ];
    }
  } else if (goal === "bookings") {
    projectType = "Booking system";
    title = "Appointment booking starter";
    selectedAddons = ["booking_calendar"];
    expectedBudgetRange = hasAdminBudget ? "admin" : "standard";
    problemToSolve = "I want customers to request appointments and see the booking times or services I offer.";
    included = [
      "A booking calendar and appointment-request flow.",
      "Your services and business contact details.",
      ...(adminPanelType === "client_admin" ? ["Admin dashboard support for managing agreed booking records."] : []),
    ];
    notIncluded = [
      "Calendar-provider, video-call, SMS, or payment subscriptions are separate unless agreed.",
      "Domain, hosting, and third-party service fees are separate where applicable.",
    ];
  } else if (goal === "business-tools") {
    projectType = "Client management system";
    adminPanelType = "client_admin";
    expectedBudgetRange = "admin";
    title = "A simple business-management workspace";
    problemToSolve = "I want one agreed business process, such as customer records or daily requests, managed in a private dashboard.";
    included = [
      "A private admin dashboard for one agreed core workflow.",
      "The essential records and actions needed for that workflow.",
      "A mobile-friendly interface for the admin team.",
    ];
    notIncluded = [
      "Extra staff roles, accounting integrations, and complex automation need a separate scope review.",
      "Domain, hosting, and third-party service fees are separate where applicable.",
    ];
  } else if (goal === "online-platform") {
    projectType = "SaaS application";
    if (isHigherBudget) {
      pricingPackage = "saas_starter";
      adminPanelType = "client_admin";
      expectedBudgetRange = "saas-starter";
      title = "Online platform starter";
      problemToSolve = "I want customers to sign in and use a shared online product with its core workflow.";
      included = [
        "A first SaaS platform scope with customer sign-in and a connected database.",
        "One agreed core product workflow for the first release.",
        "A platform admin foundation for managing the service.",
      ];
      notIncluded = [
        "Subscription billing, multiple business workspaces, and usage-based plans are not included in this starter package.",
        "Domain, hosting, and third-party service fees are separate where applicable.",
      ];
    } else {
      projectType = "Custom web application";
      title = "A small first version of your idea";
      problemToSolve = "I have an online product idea and want help choosing the first useful feature to build.";
      included = [
        "A scope conversation in everyday language.",
        "A starter estimate for one core website or application workflow.",
        "A clear list of what should wait for a later phase.",
      ];
      notIncluded = [
        "A complete multi-user subscription platform is not promised at the starter price.",
        "Domain, hosting, and third-party service fees are separate where applicable.",
      ];
    }
  }

  const pricingConfig = pricingPackage
    ? getPricingPackageConfig(DEFAULT_PRICING_CONFIG, pricingPackage)
    : DEFAULT_PRICING_CONFIG;
  const chargeableAddons = getChargeableAddonIds(selectedAddons, pricingPackage, adminPanelType);
  const calculation = calculateBudget(adminPanelType, chargeableAddons, pricingConfig);

  return {
    title,
    projectType,
    adminPanelType,
    pricingPackage,
    selectedAddons,
    expectedBudgetRange,
    problemToSolve,
    included,
    notIncluded,
    calculation,
  };
}