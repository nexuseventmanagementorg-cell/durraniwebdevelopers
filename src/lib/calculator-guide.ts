import {
  DEFAULT_PRICING_CONFIG,
  calculateBudget,
  getChargeableAddonIds,
  getPricingPackageConfig,
} from "./constants";
import type { PricingPackageId } from "./constants";
import type { CalculationBreakdown } from "./types";
import { getRegionalPricingConfig } from "./currency";
import type { CurrencyCode, ExchangeRates } from "./currency";

export type CalculatorGuideLanguage = "roman-ur" | "en";

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

export function isBeginnerProjectGoal(value: unknown): value is BeginnerProjectGoal {
  return ["business-site", "restaurant", "online-store", "bookings", "business-tools", "online-platform", "not-sure"]
    .includes(value as string);
}

export function isBeginnerBudgetBand(value: unknown): value is BeginnerBudgetBand {
  return ["under-50k", "50-150k", "150-300k", "300k-plus", "not-sure"]
    .includes(value as string);
}

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
  budget: BeginnerBudgetBand,
  currency: CurrencyCode = "PKR",
  rates: ExchangeRates = { PKR: 1 },
  language: CalculatorGuideLanguage = "en"
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

  const packagePricingConfig = pricingPackage
    ? getPricingPackageConfig(DEFAULT_PRICING_CONFIG, pricingPackage)
    : DEFAULT_PRICING_CONFIG;
  const pricingCurrency = currency === "PKR" || rates[currency] ? currency : "PKR";
  const pricingConfig = getRegionalPricingConfig(packagePricingConfig, pricingCurrency, rates);
  const chargeableAddons = getChargeableAddonIds(selectedAddons, pricingPackage, adminPanelType);
  const calculation = calculateBudget(adminPanelType, chargeableAddons, pricingConfig);

  if (language === "roman-ur") {
    if (goal === "restaurant") {
      title = pricingPackage ? "Restaurant menu aur online ordering" : "Restaurant menu aur WhatsApp orders";
      problemToSolve = "Main chahta/chahti hoon ke customers mera menu, location aur timings dekhein aur order ke liye rabta karein.";
      included = pricingPackage
        ? [
            "Restaurant menu aur products ki online list.",
            "Online cart, orders aur dashboard jahan se team orders manage kare.",
            "Payment provider ka setup; provider ki fees alag hongi.",
          ]
        : [
            "Mobile par asani se khulne wala restaurant menu aur business details.",
            "Order ke liye seedha WhatsApp aur contact option.",
            "Baad mein full online ordering add karne ka option.",
          ];
      notIncluded = pricingPackage
        ? [
            "Delivery areas, menu ki quantity aur payment provider final quote se pehle confirm honge.",
            "Domain, hosting aur third-party services ki fees jahan laagu hon alag hongi.",
          ]
        : [
            "Online cart, card checkout aur automatic delivery management is starter estimate mein shamil nahi.",
            "Domain, hosting aur third-party services ki fees jahan laagu hon alag hongi.",
          ];
    } else if (goal === "online-store") {
      title = pricingPackage
        ? pricingPackage === "ecommerce_advanced" ? "Advanced online store" : "Mukammal online store"
        : "Product catalog aur WhatsApp orders se shuru karein";
      problemToSolve = "Main chahta/chahti hoon ke customers mere products dekhein aur order ke liye mujh se rabta karein.";
      included = pricingPackage
        ? [
            "Products ki catalog aur stock manage karne ka system.",
            "Shopping cart, online orders aur admin dashboard.",
            "Payment provider ka setup; provider ki fees alag hongi.",
            ...(pricingPackage === "ecommerce_advanced" ? ["Advanced reports aur dashboard."] : []),
          ]
        : [
            "Business aur products ki maloomat ke saath pehla version.",
            "Mobile-friendly product catalog aur customers ke liye contact option.",
            "Baad mein full checkout store banane ka option.",
          ];
      notIncluded = pricingPackage
        ? [
            "Product quantity, delivery rules aur payment provider final quote se pehle confirm honge.",
            "Domain, hosting aur third-party services ki fees jahan laagu hon alag hongi.",
          ]
        : [
            "Automatic stock management, shopping cart aur online checkout is starter estimate mein shamil nahi.",
            "Domain, hosting aur third-party services ki fees jahan laagu hon alag hongi.",
          ];
    } else if (goal === "bookings") {
      title = "Appointments booking ka starter plan";
      problemToSolve = "Main chahta/chahti hoon ke customers meri services aur available booking times dekh kar appointment request karein.";
      included = [
        "Booking calendar aur appointment request ka process.",
        "Aapki services aur business contact details.",
        ...(adminPanelType === "client_admin" ? ["Bookings manage karne ke liye admin dashboard."] : []),
      ];
      notIncluded = [
        "Calendar provider, video call, SMS ya payment subscriptions ki fees alag hongi.",
        "Domain, hosting aur third-party services ki fees jahan laagu hon alag hongi.",
      ];
    } else if (goal === "business-tools") {
      title = "Business manage karne ka simple dashboard";
      problemToSolve = "Main customer records ya roz ke kaam jaisa aik zaroori business process private dashboard mein manage karna chahta/chahti hoon.";
      included = [
        "Aik tay-shuda business process ke liye private admin dashboard.",
        "Us process ke zaroori records aur actions.",
        "Admin team ke liye mobile-friendly interface.",
      ];
      notIncluded = [
        "Mazeed staff roles, accounting integrations aur complex automation alag scope mein dekhe jayenge.",
        "Domain, hosting aur third-party services ki fees jahan laagu hon alag hongi.",
      ];
    } else if (goal === "online-platform") {
      title = pricingPackage ? "Online platform ka pehla version" : "Aapke idea ka chhota pehla version";
      problemToSolve = pricingPackage
        ? "Main chahta/chahti hoon ke customers sign in karke apne online product ka bunyadi feature use karein."
        : "Mere paas online product ka idea hai; mujhe pehle useful feature ko samajhne mein madad chahiye.";
      included = pricingPackage
        ? [
            "Customer sign-in aur connected database ke saath SaaS starter.",
            "Pehle release ke liye aik tay-shuda core feature.",
            "Service manage karne ke liye platform admin foundation.",
          ]
        : [
            "Aapke idea par asaan alfaaz mein scope conversation.",
            "Aik bunyadi website ya application feature ka starter estimate.",
            "Baad ke phase ke liye alag rakhe jane wale features ki list.",
          ];
      notIncluded = pricingPackage
        ? [
            "Subscription billing, multiple business workspaces aur usage-based plans is starter mein shamil nahi.",
            "Domain, hosting aur third-party services ki fees jahan laagu hon alag hongi.",
          ]
        : [
            "Starter price mein mukammal multi-user subscription platform shamil nahi.",
            "Domain, hosting aur third-party services ki fees jahan laagu hon alag hongi.",
          ];
    } else {
      title = goal === "not-sure" ? "Pehle aik seedhe business website plan se shuru karein" : "Business ki basic website";
      problemToSolve = "Main apne business ki maloomat aur services online dikhana chahta/chahti hoon taake customers asani se rabta kar saken.";
      included = [
        "Aapke business aur services ki maloomat ke pages.",
        "Mobile aur computer dono par kaam karne wala layout.",
        "Customers ke liye wazeh contact option.",
      ];
      notIncluded = [
        "Online checkout, customer accounts aur custom integrations final scope mein shamil kiye baghair included nahi.",
        "Domain, hosting aur third-party services ki fees jahan laagu hon alag hongi.",
      ];
    }
  }

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