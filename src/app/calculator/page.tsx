"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import confetti from "canvas-confetti";
import {
  ADDON_CATEGORY_LABELS,
  DEFAULT_PRICING_CONFIG,
  calculateBudget,
  BUSINESS_INFO,
  buildWhatsAppLink,
  ECOMMERCE_PACKAGES,
  SAAS_PACKAGES,
  getDefaultPricingPackageForProjectType,
  getPricingPackageConfig,
  getChargeableAddonIds,
  isPricingPackageId,
  isSaasPackageId,
  isEcommerceProjectType,
  isSaasProjectType,
  mergePricingConfigWithDefaults,
} from "@/lib/constants";
import type { PricingPackageId } from "@/lib/constants";
import {
  BUSINESS_CATEGORIES,
  getBusinessAddonCatalog,
  inferBusinessCategoryForLabels,
} from "@/lib/business-addon-catalog";
import type { AddonOption, InquiryScanFeature, PortfolioProject, PricingRuleConfig } from "@/lib/types";
import { getBeginnerBudgetPlan } from "@/lib/calculator-guide";
import type { BeginnerBudgetBand, BeginnerProjectGoal, CalculatorGuideLanguage } from "@/lib/calculator-guide";
import {
  applyTemplatePricingToCalculator,
  matchesPortfolioProjectUrl,
} from "@/lib/template-pricing";
import { CurrencyCode, formatCurrency, getRegionalPricingConfig, isCurrencyCode } from "@/lib/currency";
import { useCurrency } from "@/components/CurrencyProvider";
import CurrencySelector from "@/components/CurrencySelector";
import {
  Calculator,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  Send,
  Sparkles,
  Layers,
  Utensils,
  ShoppingBag,
  Gem,
  Sparkle,
  Shirt,
  Apple,
  Cpu,
  Users,
  Calendar,
  Boxes,
  Briefcase,
  Code2,
  Check,
  Clock,
  PhoneCall,
  MessageSquare,
  Copy,
  CheckCheck,
  Package,
  TrendingUp,
  Workflow,
  Lightbulb,
  CreditCard,
} from "lucide-react";

interface CalculatorAddonRecommendation {
  id: string;
  label: string;
  description: string;
  price: number;
  level: "basic" | "expanded" | "complex";
  categoryId: string;
  categoryLabel: string;
  businessTypes: string[];
  origin: string;
  enabled: boolean;
  requiresCustomQuote: boolean;
  billingPeriod?: AddonOption["billingPeriod"];
}

const RECOMMENDED_BUSINESS_ADDONS: Record<string, Record<"basic" | "expanded" | "complex", string[]>> = {
  "ecommerce-retail": {
    basic: ["advanced_product_management", "back_in_stock_notifications"],
    expanded: ["product_bundles", "returns_exchanges_workflow"],
    complex: ["pos_synchronization", "multi_store_inventory_orchestration"],
  },
  "food-hospitality": {
    basic: ["menu_filters", "meal_customization"],
    expanded: ["kitchen_display_system", "customer_waitlist"],
    complex: ["multi_branch_operations", "kitchen_delivery_orchestration"],
  },
  "health-wellness-beauty": {
    basic: ["service_catalog", "consultation_inquiry"],
    expanded: ["clinic_queue_management", "staff_commission_calculator"],
    complex: ["multi_location_operations", "practice_management_integration"],
  },
  "professional-services": {
    basic: ["service_catalog", "consultation_inquiry"],
    expanded: ["client_portal", "document_workflow"],
    complex: ["multi_branch_operations", "custom_workflow_automation"],
  },
  "education-elearning": {
    basic: ["course_catalog", "class_timetable"],
    expanded: ["student_progress_tracking", "online_assessment"],
    complex: ["learning_management_integration", "multi_campus_management"],
  },
  "home-construction": {
    basic: ["service_catalog", "quote_request"],
    expanded: ["job_scheduling", "work_order_management"],
    complex: ["fleet_dispatch_optimization", "field_service_orchestration"],
  },
  "technology-digital": {
    basic: ["service_catalog", "consultation_inquiry"],
    expanded: ["automated_onboarding", "team_invitations"],
    complex: ["multi_tenant_architecture", "usage_based_billing"],
  },
  "real-estate-propertytech": {
    basic: ["property_listing_management", "property_inquiry"],
    expanded: ["rental_application_workflow", "lease_management"],
    complex: ["property_portal_monitoring_backups", "multi_property_operations"],
  },
  "entertainment-events": {
    basic: ["event_listing", "guest_rsvp"],
    expanded: ["ticket_sales_management", "event_planning_workflow"],
    complex: ["multi_venue_operations", "ticketing_platform_integration"],
  },
  "niche-specialized": {
    basic: ["service_catalog", "customer_inquiry"],
    expanded: ["courier_exception_dashboard", "order_tracking"],
    complex: ["fleet_dispatch_optimization", "multi_branch_operations"],
  },
};

const GENERAL_ADDON_RECOMMENDATIONS: Record<"basic" | "expanded" | "complex", string[]> = {
  basic: ["advanced_seo", "email_notifications"],
  expanded: ["cms", "search_filter_sort"],
  complex: ["api_integration", "automated_backups"],
};

const ROMAN_URDU_ADDON_BENEFITS: Record<string, string> = {
  advanced_seo: "Google par aapki website dhoondhna asaan banane aur pages ki bunyadi search settings behtar karne mein madad deta hai.",
  email_notifications: "Nayi inquiry ya form submit hone par aapko email milti hai, taake customer ka message miss na ho.",
  cms: "Text, tasveerain aur banners chhoti updates ke liye developer ke baghair badal sakte hain.",
  search_filter_sort: "Customers ko products ya records jaldi dhoondhne aur zaroorat ke mutabiq chhanne mein madad milti hai.",
  api_integration: "Website ko aapki chuni hui doosri service ke saath data share karne mein madad deta hai; integration ka scope alag confirm hota hai.",
  automated_backups: "Data ki scheduled copies aur restore planning se data loss ke risk ko kam karne mein madad milti hai.",
  advanced_product_management: "Products ke size, rang, SKU aur stock ko behtar tareeqe se manage karne mein madad deta hai.",
  back_in_stock_notifications: "Out-of-stock product wapas aaye to interested customer ko inform karne ka option milta hai.",
  product_bundles: "Related products ko aik deal mein dikhakar average order barhane ka mauqa milta hai.",
  returns_exchanges_workflow: "Return aur exchange requests ko aik jagah record aur track karna asaan hota hai.",
  menu_filters: "Customers menu ko meal ya category ke mutabiq filter karke apni pasand jaldi dhoond sakte hain.",
  meal_customization: "Customer order ke saath apni choices ya khaas instructions bhej sakta hai.",
  kitchen_display_system: "Kitchen team incoming orders aur unki tayyari ka status aik screen par dekh sakti hai.",
  customer_waitlist: "Walk-in customers ki bari aur wait status staff ke liye track karna asaan hota hai.",
  service_catalog: "Aapki services, unki tafseel aur duration aik jagah saaf dikhte hain, jis se customer ko samajhne mein asani hoti hai.",
  consultation_inquiry: "Interested customer consultation ki request bhej sakta hai aur aap follow-up kar sakte hain.",
  class_timetable: "Customers ko classes, instructors aur timing dekhne mein asani hoti hai.",
  property_listing_management: "Available properties ko details aur tasveeron ke saath update karna asaan hota hai.",
  property_inquiry: "Har property ke liye customer ki inquiry record hoti hai, jis se follow-up behtar hota hai.",
  event_listing: "Aane wale events ki date aur tafseel customer ko aik jagah nazar aati hai.",
  guest_rsvp: "Mehman online apni shirkat confirm kar sakte hain, jis se headcount sambhalna asaan hota hai.",
  inventory_management: "Stock ki quantity aur kam hotay stock par nazar rakhne mein madad deta hai.",
  discount_coupons: "Aap promotional codes bana kar offers chala sakte hain aur discount rules set kar sakte hain.",
  product_reviews: "Customer reviews aur ratings se naye buyers ko product samajhne aur bharosa karne mein madad milti hai.",
  shipping_rules: "Ilaqay ya order ke hisaab se delivery charges tay karna asaan hota hai.",
  order_tracking: "Customers apne order ka status dekh sakte hain, jis se baar baar poochne ki zaroorat kam hoti hai.",
  ai_chatbot: "Aam sawalon ke jawab foran dene mein madad karta hai; jawab approved business maloomat par mabni honge.",
  personal_domain: "Aapki website ko apne domain naam par chalane mein madad deta hai; domain ki renewal fees alag hoti hain.",
  responsive_design: "Mobile, tablet aur computer par website ka layout behtar dikhne mein madad deta hai.",
  multilingual_support: "Mukhtalif zubanon ke customers ko unki pasand ki zuban mein content dekhne ka option deta hai.",
  user_accounts: "Customers apna account bana kar login kar sakte hain, agar aapke business ko account features chahiye hon.",
  order_invoice_management: "Orders ka status aur customer invoices aik jagah manage karne mein madad deta hai.",
  csv_data_export: "Business records ko spreadsheet mein download karke reports ya hisaab mein istemal kar sakte hain.",
  pdf_excel_export: "Reports ko PDF ya spreadsheet mein nikal kar share aur review karna asaan hota hai.",
  payment_gateway: "Customer ko online payment ka tareeqa deta hai; provider account aur transaction fees alag ho sakti hain.",
  advanced_dashboard: "Charts aur reports se sales aur business activity ko aik jagah samajhne mein madad milti hai.",
  subscription_plans: "Software ke mukhtalif plans, limits aur subscription status manage karne mein madad deta hai.",
  vendor_management: "Marketplace mein sellers ke profiles, listings aur orders manage karne ka nizaam deta hai.",
  role_permissions: "Har staff member ko uske kaam ke mutabiq access dene mein madad karta hai.",
  automated_onboarding: "Naye users ko account setup ke zaroori steps samajhne aur poore karne mein guide karta hai.",
  multi_branch_operations: "Mukhtalif branches ke kaam aur reports ko aik system mein manage karne mein madad deta hai.",
};

function getRomanUrduAddonBenefit(id: string, label: string, level: string): string {
  return ROMAN_URDU_ADDON_BENEFITS[id] ||
    `${label} se ${level === "complex" ? "advanced ya multiple-step" : level === "expanded" ? "mazeed" : "buniyadi"} business kaam ko website par manage karna asaan ho sakta hai. Isay sirf tab shamil karein jab yeh aapki zaroorat ho.`;
}

function getAddonIcon(id: string) {
  if (/payment|billing|invoice|coupon|commission|payout/i.test(id)) return CreditCard;
  if (/user|customer|vendor|team|member|staff|role|account/i.test(id)) return Users;
  if (/workflow|automation|integration|synchron|orchestration|process/i.test(id)) return Workflow;
  if (/report|analytics|sales|forecast|seo|search/i.test(id)) return TrendingUp;
  if (/product|stock|inventory|catalog|menu|property|listing|event/i.test(id)) return Package;
  return Lightbulb;
}

function parseScanFeatures(value: string | null): InquiryScanFeature[] {
  if (!value || value.length > 6000) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .slice(0, 40)
      .flatMap((item): InquiryScanFeature[] => {
        if (typeof item === "string" && item.trim()) {
          return [{ title: item.trim().slice(0, 120), evidence: "Detected on public URL scan." }];
        }
        if (
          typeof item === "object" && item !== null &&
          "title" in item && typeof item.title === "string" &&
          "evidence" in item && typeof item.evidence === "string"
        ) {
          return [{ title: item.title.slice(0, 120), evidence: item.evidence.slice(0, 300) }];
        }
        return [];
      });
  } catch {
    return [];
  }
}

function parsePricingConfig(value: unknown): PricingRuleConfig {
  if (
    typeof value !== "object" ||
    value === null ||
    !("addons" in value) ||
    typeof value.addons !== "object" ||
    value.addons === null
  ) {
    throw new Error("The current pricing configuration is unavailable.");
  }
  return mergePricingConfigWithDefaults(value as Partial<PricingRuleConfig>);
}

function CalculatorContent() {
  const searchParams = useSearchParams();
  const initialPackage = searchParams.get("package");
  const initialType = searchParams.get("projectType") || searchParams.get("type");
  const initialCurrency = searchParams.get("currency");
  const initialSourceUrl = searchParams.get("sourceUrl") || "";
  const initialTemplateId = searchParams.get("templateId");
  const initialScanFeatures = parseScanFeatures(searchParams.get("scanFeatures"));
  const initialConfiguredPackage = isPricingPackageId(initialPackage) ? initialPackage : null;
  const normalizedInitialType = initialType === "E-Commerce Stores"
    ? "E-commerce store"
    : initialType === "SaaS Projects" ? "SaaS application" : initialType;
  const seededAddons = (searchParams.get("addons") || "")
    .split(",")
    .concat(searchParams.get("addon") || [])
    .filter((addonId) => addonId in DEFAULT_PRICING_CONFIG.addons);
  const { currency, setCurrency, rates, rateError, rateDate, locale, formatPrice } = useCurrency();
  const initialGuideGoal: BeginnerProjectGoal = initialConfiguredPackage?.startsWith("ecommerce_") ||
    (normalizedInitialType ? isEcommerceProjectType(normalizedInitialType) : false)
    ? "online-store"
    : initialConfiguredPackage?.startsWith("saas_") ||
        (normalizedInitialType ? isSaasProjectType(normalizedInitialType) : false)
      ? "online-platform"
      : normalizedInitialType?.toLowerCase().includes("restaurant")
        ? "restaurant"
        : normalizedInitialType?.toLowerCase().includes("booking")
          ? "bookings"
          : normalizedInitialType?.toLowerCase().includes("management") ||
              normalizedInitialType?.toLowerCase().includes("inventory")
            ? "business-tools"
            : initialType ? "not-sure" : "business-site";
  const initialGuideBudget: BeginnerBudgetBand =
    initialConfiguredPackage === "ecommerce_starter" ||
    initialConfiguredPackage === "ecommerce_business" ||
    initialConfiguredPackage === "saas_starter"
      ? "150-300k"
      : initialConfiguredPackage === "ecommerce_advanced" ||
          initialConfiguredPackage === "saas_business" ||
          initialConfiguredPackage === "saas_enterprise"
        ? "300k-plus"
        : initialPackage === "without_admin"
          ? "under-50k"
          : initialPackage === "with_admin"
            ? "50-150k"
            : initialGuideGoal === "online-store" || initialGuideGoal === "online-platform"
              ? "150-300k"
              : "not-sure";
  const [guideGoal, setGuideGoal] = useState<BeginnerProjectGoal>(initialGuideGoal);
  const [guideBudget, setGuideBudget] = useState<BeginnerBudgetBand>(initialGuideBudget);
  const [isDetailedProjectPath, setIsDetailedProjectPath] = useState(false);
  const [guideLanguage, setGuideLanguage] = useState<CalculatorGuideLanguage>("roman-ur");
  const [languageOverridden, setLanguageOverridden] = useState(false);
  const [plainLanguageNeed, setPlainLanguageNeed] = useState(
    initialSourceUrl ? `I like this kind of website: ${initialSourceUrl}` : ""
  );
  const [leadContactName, setLeadContactName] = useState("");
  const [leadContactEmail, setLeadContactEmail] = useState("");
  const [leadContactPhone, setLeadContactPhone] = useState("");
  const [leadContactConsent, setLeadContactConsent] = useState(false);
  const [leadSaving, setLeadSaving] = useState(false);
  const [leadSaveMessage, setLeadSaveMessage] = useState("");
  const [calculatorLeadSession, setCalculatorLeadSession] = useState<{ id: string; token: string } | null>(null);
  const guideCopy = guideLanguage === "roman-ur" ? {
    start: "Apni zaroorat se shuru karein",
    headline: "Website ke technical lafz jaanna zaroori nahi.",
    intro: "Apne business ka maqsad aur apna budget batayein. Hum seedha batayenge ke is budget mein kya ban sakta hai.",
    help: "Aapka budget aapki had hai, kharch karne ka target nahi.",
    goalHeading: "Aap customers se online kya karwana chahte hain?",
    goalHint: "Jo jawab sab se qareeb lage woh chun lein. Baqi apne alfaaz mein likh sakte hain.",
    budgetHeading: "Project ke liye aapka total budget kya hai?",
    needLabel: "Asaan alfaaz mein batayein website se kya madad chahiye",
    needHint: "Misal: meri bakery hai, menu dikhana hai aur cake orders WhatsApp par lene hain.",
    recommendation: "Aapke liye munasib shuruati plan",
    confirm: "Final scope aur quote kaam shuru hone se pehle aapke saath confirm hoga.",
    total: "Andazati total",
    advance: "Shuruati advance",
    included: "Is plan mein shamil",
    excluded: "Is mein shamil nahi",
    budgetNote: "Aapko poora budget kharch karne ki zaroorat nahi. Yeh sirf shuruati andaza hai.",
    contactHeading: "Kya hum yeh plan aapke liye save karein?",
    contactHint: "Email ya WhatsApp mein se kam az kam aik dein. Sirf aapki ijazat par hum behtar budget option discuss karne ke liye rabta karenge.",
    name: "Aapka naam (optional)",
    email: "Email (optional)",
    phone: "WhatsApp number (optional, country code ke saath)",
    consent: "Main razi hoon ke Durrani Web Developers mera budget plan dekh kar email ya WhatsApp par behtar option ke liye rabta karein.",
    save: "Mera plan save karein",
    saved: "Aapka plan follow-up ke liye save ho gaya.",
    continue: "Is plan ke saath aage chalein",
    skip: "Mujhe apni zaroorat pata hai; guide skip karein",
  } : {
    start: "Start with your needs",
    headline: "You don’t need to know website terminology.",
    intro: "Tell us what your business needs and your comfortable budget. We’ll explain what that budget can realistically include.",
    help: "Your budget is a limit you choose, not a target we expect you to spend.",
    goalHeading: "What would you like customers to do online?",
    goalHint: "Choose the closest answer. You can explain the rest in your own words.",
    budgetHeading: "What is your total project budget?",
    needLabel: "In your own words, what should the website help with?",
    needHint: "For example: I run a bakery. I want customers to see the menu and message me to order cakes.",
    recommendation: "A practical starting plan",
    confirm: "We’ll confirm the exact scope and quotation with you before work begins.",
    total: "Estimated total",
    advance: "Starting advance",
    included: "Included in this plan",
    excluded: "Not included unless agreed",
    budgetNote: "You don’t have to use your full budget. This is only a starting estimate.",
    contactHeading: "Would you like us to save this plan?",
    contactHint: "Provide an email or WhatsApp number. We’ll only follow up about better-fit options if you agree.",
    name: "Your name (optional)",
    email: "Email (optional)",
    phone: "WhatsApp number (optional, with country code)",
    consent: "I agree that Durrani Web Developers may review this budget plan and contact me by email or WhatsApp about a suitable option.",
    save: "Save my plan",
    saved: "Your plan is saved for follow-up.",
    continue: "Continue with this plan",
    skip: "I know what I need; skip the guide",
  };

  useEffect(() => {
    if (isCurrencyCode(initialCurrency)) setCurrency(initialCurrency);
  }, [initialCurrency, setCurrency]);

  useEffect(() => {
    if (!languageOverridden) setGuideLanguage(locale.toUpperCase().endsWith("-PK") ? "roman-ur" : "en");
  }, [locale, languageOverridden]);

  useEffect(() => {
    try {
      const leadId = sessionStorage.getItem("dwd-calculator-lead-id");
      const token = sessionStorage.getItem("dwd-calculator-lead-token");
      if (leadId && token) {
        setCalculatorLeadSession({ id: leadId, token });
        setLeadContactConsent(true);
      }
    } catch {
      // Session storage can be unavailable in privacy-restricted browsers.
    }
  }, []);

  // Step state: 1 to 8 (8 is confirmation/submit)
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedInquiry, setSubmittedInquiry] = useState<any | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [serverPricingConfig, setServerPricingConfig] =
    useState<PricingRuleConfig>(DEFAULT_PRICING_CONFIG);
  const [pricingConfigReady, setPricingConfigReady] = useState(false);
  const [pricingConfigError, setPricingConfigError] = useState("");
  const [matchedTemplateProject, setMatchedTemplateProject] = useState<PortfolioProject | null>(null);

  // Step 1: Customer Info
  const [customerName, setCustomerName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cityCountry, setCityCountry] = useState("");
  const [preferredContact, setPreferredContact] = useState<"whatsapp" | "email" | "phone">("whatsapp");
  const [whatsappConfirmationConsent, setWhatsappConfirmationConsent] = useState(false);
  const [customerIntro, setCustomerIntro] = useState("");

  // Step 2: Project Type
  const [selectedProjectTypes, setSelectedProjectTypes] = useState<string[]>(
    normalizedInitialType
      ? [normalizedInitialType]
      : initialConfiguredPackage
        ? [isSaasPackageId(initialConfiguredPackage) ? "SaaS application" : "E-commerce store"]
        : ["Custom web application"]
  );
  const [selectedPricingPackage, setSelectedPricingPackage] = useState<PricingPackageId | null>(
    initialConfiguredPackage ||
      (initialType ? getDefaultPricingPackageForProjectType(initialType) : null)
  );

  // Step 3: Project Description
  const [problemToSolve, setProblemToSolve] = useState(
    initialSourceUrl
      ? `I want to build a website with similar publicly visible features to ${initialSourceUrl}, adapted to my own business name, brand identity, content, and design.`
      : ""
  );
  const [targetAudience, setTargetAudience] = useState("");
  const [productsServices, setProductsServices] = useState("");
  const [inspirationUrl, setInspirationUrl] = useState(initialSourceUrl);
  const [isNewOrUpgrade, setIsNewOrUpgrade] = useState<"new" | "upgrade">("new");
  const [preferredLaunchDate, setPreferredLaunchDate] = useState("Within 3 to 4 weeks");
  const [expectedBudgetRange, setExpectedBudgetRange] = useState(
    initialConfiguredPackage === "ecommerce_starter"
      ? "ecommerce-starter"
      : initialConfiguredPackage === "ecommerce_advanced"
        ? "ecommerce-advanced"
      : initialConfiguredPackage === "ecommerce_business" ||
          (initialType ? isEcommerceProjectType(initialType) : false)
        ? "ecommerce-business"
        : initialConfiguredPackage === "saas_business"
          ? "saas-business"
          : initialConfiguredPackage === "saas_enterprise"
            ? "saas-enterprise"
              : initialConfiguredPackage === "saas_starter" ||
                  (initialType ? getDefaultPricingPackageForProjectType(initialType)?.startsWith("saas_") : false)
                ? "saas-starter"
        : "admin"
  );

  // Step 4: Website and Product Management
  const [displayFixedOnly, setDisplayFixedOnly] = useState(false);
  const [needsProductCatalog, setNeedsProductCatalog] = useState(true);
  const [productFeatures, setProductFeatures] = useState<string[]>([
    "categories",
    "variants",
    "stock",
    "images",
    "pricing",
  ]);
  const [acceptOrdersOnline, setAcceptOrdersOnline] = useState(true);
  const [orderFeatures, setOrderFeatures] = useState<string[]>([
    "cart",
    "checkout",
    "coupons",
    "delivery_fees",
  ]);
  const [needsReviewsOrAccounts, setNeedsReviewsOrAccounts] = useState(true);

  // Step 5: Admin Panel Requirements
  const [adminPanelType, setAdminPanelType] = useState<"none" | "client_admin">(
    initialPackage === "without_admin" || searchParams.get("adminPanel") === "none"
      ? "none"
      : "client_admin"
  );
  const [adminFeatures, setAdminFeatures] = useState<string[]>([
    "products",
    "orders",
    "stock",
    "customers",
    "payments",
    "reports",
  ]);

  // Step 6: Advanced Features
  const [selectedAddons, setSelectedAddons] = useState<string[]>(seededAddons);
  const [businessCategoryFilter, setBusinessCategoryFilter] = useState("");
  const [businessTypeFilter, setBusinessTypeFilter] = useState("all");
  const [businessLevelFilter, setBusinessLevelFilter] = useState("basic");
  const [businessAddonSearch, setBusinessAddonSearch] = useState("");
  const [customFeatureNotes, setCustomFeatureNotes] = useState("");
  const [scanFeatures] = useState(initialScanFeatures);

  useEffect(() => {
    let cancelled = false;
    setPricingConfigReady(false);
    setPricingConfigError("");
    setMatchedTemplateProject(null);
    const loadCalculatorConfiguration = async () => {
      try {
        const pricingResponse = await fetch("/api/public/addons", { cache: "no-store" });
        const pricingData = await pricingResponse.json();
        if (!pricingResponse.ok || !pricingData.success) {
          throw new Error(pricingData.error || "Current calculator prices could not be loaded.");
        }
        const config = parsePricingConfig(pricingData.pricingConfig);

        if (initialTemplateId) {
          const portfolioResponse = await fetch("/api/public/portfolio", { cache: "no-store" });
          const portfolioData = await portfolioResponse.json();
          if (!portfolioResponse.ok || !portfolioData.success || !Array.isArray(portfolioData.portfolio)) {
            throw new Error("The matched template pricing record could not be loaded.");
          }
          const matchedTemplate = (portfolioData.portfolio as PortfolioProject[]).find((project) =>
            project.id === initialTemplateId &&
            matchesPortfolioProjectUrl(project, initialSourceUrl)
          );
          if (!matchedTemplate) {
            throw new Error("The URL-to-template match could not be confirmed. Restart the website estimate.");
          }
          if (!cancelled) setMatchedTemplateProject(matchedTemplate);
        }

        if (cancelled) return;
        setServerPricingConfig(config);
        setPricingConfigError("");
        setErrorMessage("");
        setPricingConfigReady(true);
      } catch (error) {
        if (cancelled) return;
        console.error("Could not load current calculator pricing or template scope", error);
        setPricingConfigError(
          error instanceof Error ? error.message : "Current calculator pricing could not be loaded."
        );
      }
    };
    void loadCalculatorConfiguration();
    return () => {
      cancelled = true;
    };
  }, [initialSourceUrl, initialTemplateId]);

  // Step 7: Disclaimer
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(true);

  // Real-time calculation
  const pricingConfig = useMemo(
    () => currency === "PKR" || rates[currency]
      ? getRegionalPricingConfig(serverPricingConfig, currency, rates)
      : serverPricingConfig,
    [currency, rates, serverPricingConfig]
  );
  const getPackagePricingConfig = useCallback(
    (packageId: PricingPackageId) => {
      const packageConfig = getPricingPackageConfig(serverPricingConfig, packageId);
      return currency === "PKR" || rates[currency]
        ? getRegionalPricingConfig(packageConfig, currency, rates)
        : packageConfig;
    },
    [currency, rates, serverPricingConfig]
  );
  const selectedPricingConfig = useMemo(
    () => applyTemplatePricingToCalculator(
      selectedPricingPackage
        ? getPackagePricingConfig(selectedPricingPackage)
        : pricingConfig,
      matchedTemplateProject,
      selectedPricingPackage
    ),
    [getPackagePricingConfig, matchedTemplateProject, pricingConfig, selectedPricingPackage]
  );
  const calculation = useMemo(
    () => calculateBudget(
      adminPanelType,
      getChargeableAddonIds(selectedAddons, selectedPricingPackage, adminPanelType),
      selectedPricingConfig
    ),
    [adminPanelType, selectedAddons, selectedPricingPackage, selectedPricingConfig]
  );
  const guidePlan = useMemo(
    () => getBeginnerBudgetPlan(guideGoal, guideBudget, currency, rates, guideLanguage),
    [guideGoal, guideBudget, currency, rates, guideLanguage]
  );
  const guideCalculation = guidePlan.calculation;
  const formatEstimate = useCallback(
    (amount: number) => currency === "PKR" || rates[currency]
      ? formatCurrency(amount, currency, locale)
      : rateError
        ? "Rate unavailable"
        : "Loading regional rate…",
    [currency, rates, rateError, locale]
  );
  const budgetRangeOptions = useMemo(
    () => [
      {
        value: "not-sure",
        label: guideLanguage === "roman-ur" ? "Mujhe abhi nahi pata" : "I'm not sure yet",
      },
      { value: "standard", label: `${formatPrice(35000)} - ${formatPrice(45000)} (Standard starting)` },
      { value: "admin", label: `${formatPrice(45000)} - ${formatPrice(65000)} (Client Admin & Add-ons)` },
      { value: "advanced", label: `${formatPrice(65000)} - ${formatPrice(95000)} (Advanced / Custom)` },
      { value: "enterprise", label: `${formatPrice(100000)}+ (Enterprise systems)` },
      {
        value: "ecommerce-starter",
        label: `${formatPrice(100000)}+ (E-Commerce Starter)`,
      },
      {
        value: "ecommerce-business",
        label: `${formatPrice(150000)}+ (E-Commerce Business starting)`,
      },
      {
        value: "ecommerce-advanced",
        label: `${formatPrice(200000)} - ${formatPrice(300000)} (E-Commerce Advanced scope)`,
      },
      { value: "saas-starter", label: `${formatPrice(250000)} (SaaS Starter)` },
      { value: "saas-business", label: `${formatPrice(500000)} (SaaS Business)` },
      { value: "saas-enterprise", label: `${formatPrice(1000000)}+ (SaaS Enterprise)` },
    ],
    [formatPrice, guideLanguage]
  );

  // Project Type Catalog
  const projectTypeOptions = [
    { label: "Restaurant website or ordering app", icon: Utensils },
    { label: "E-commerce store", icon: ShoppingBag },
    { label: "Jewellery store", icon: Gem },
    { label: "Cosmetics store", icon: Sparkle },
    { label: "Fashion store", icon: Shirt },
    { label: "Grocery store", icon: Apple },
    { label: "SaaS application", icon: Cpu },
    { label: "Client management system", icon: Users },
    { label: "Booking system", icon: Calendar },
    { label: "Inventory system", icon: Boxes },
    { label: "Custom web application", icon: Briefcase },
    { label: "Other custom software", icon: Code2 },
  ];

  const projectTypeRomanLabels: Record<string, string> = {
    "Restaurant website or ordering app": "Restaurant ki website ya ordering app",
    "E-commerce store": "Online products ki dukaan",
    "Jewellery store": "Jewellery ki online dukaan",
    "Cosmetics store": "Cosmetics ki online dukaan",
    "Fashion store": "Fashion ki online dukaan",
    "Grocery store": "Grocery ki online dukaan",
    "SaaS application": "Online software ya customer portal",
    "Client management system": "Customers ka record manage karne ka system",
    "Booking system": "Appointment booking system",
    "Inventory system": "Stock aur maal ka record",
    "Custom web application": "Business ke liye khaas web application",
    "Other custom software": "Doosra khaas software",
  };
  const adminFeatureRomanLabels: Record<string, string> = {
    products: "Products aur categories sambhalna",
    orders: "Orders aur unki halat manage karna",
    stock: "Stock ka record rakhna",
    customers: "Customers ka record dekhna",
    payments: "Payments ka record",
    reports: "Reports aur sales ka khulasa",
    coupons: "Coupons aur discounts",
    reviews: "Reviews aur testimonials approve karna",
    content: "Website ka text aur banners badalna",
    roles: "Staff ke alag access levels",
    notifications: "Email / WhatsApp messages ka record",
  };
  const addonCategoryRomanLabels: Record<string, string> = {
    "Database & Authentication": "Database aur login",
    "E-commerce & Payments": "Online orders aur payments",
    "Business Tools & Admin": "Business dashboard ke tools",
    "AI & Automation": "AI aur automatic kaam",
    "Website & Design": "Website ka design aur pages",
    "SaaS & Multi-Vendor": "Online platform aur multiple sellers",
    "Security & Reliability": "Security aur website ki bharosemandi",
    "Industry-Specific": "Business ke khaas tools",
    "Real Estate & PropertyTech": "Real estate aur property portal ke tools",
  };

  const adminFeatureOptions = [
    { id: "products", label: "Product and category management" },
    { id: "orders", label: "Orders and order-status management" },
    { id: "stock", label: "Inventory and stock management" },
    { id: "customers", label: "Customer management and lookup" },
    { id: "payments", label: "Payments and transaction records" },
    { id: "reports", label: "Reports and revenue analytics" },
    { id: "coupons", label: "Coupons and promotional discounts" },
    { id: "reviews", label: "Reviews and testimonials approval" },
    { id: "content", label: "Website banners & text management" },
    { id: "roles", label: "User roles and permissions" },
    { id: "notifications", label: "Email / WhatsApp notification logs" },
  ];

  const addonOptions = Object.values(pricingConfig.addons);
  const groupedAddonOptions = addonOptions
    .filter((addon) => addon.enabled && addon.category !== "businesscatalog")
    .reduce<Record<string, AddonOption[]>>((groups, addon) => {
      const category = ADDON_CATEGORY_LABELS[addon.category];
      (groups[category] ||= []).push(addon);
      return groups;
    }, {});
  const inferredBusinessCategoryId = inferBusinessCategoryForLabels(selectedProjectTypes);
  const effectiveBusinessCategoryId = businessCategoryFilter || inferredBusinessCategoryId || "";
  const selectedBusinessCategory = BUSINESS_CATEGORIES.find(
    (category) => category.id === effectiveBusinessCategoryId
  );
  const businessAddonCatalog = getBusinessAddonCatalog(selectedPricingConfig.addons);
  const relevantBusinessAddons = businessAddonCatalog
    .filter((addon) =>
      !effectiveBusinessCategoryId || addon.categoryId === effectiveBusinessCategoryId
    )
    .filter((addon) =>
      businessTypeFilter === "all" || addon.businessTypes.includes(businessTypeFilter)
    );
  const filteredBusinessAddons = relevantBusinessAddons
    .filter((addon) =>
      businessLevelFilter === "all" || addon.level === businessLevelFilter
    )
    .filter((addon) =>
      !businessAddonSearch.trim() ||
      `${addon.label} ${addon.description}`.toLowerCase().includes(businessAddonSearch.trim().toLowerCase())
    );
  const recommendedAddonsByLevel = (["basic", "expanded", "complex"] as const).map((level) => {
    const preferredIds = effectiveBusinessCategoryId
      ? RECOMMENDED_BUSINESS_ADDONS[effectiveBusinessCategoryId]?.[level] || []
      : GENERAL_ADDON_RECOMMENDATIONS[level];
    const preferred: CalculatorAddonRecommendation[] = preferredIds.flatMap((id): CalculatorAddonRecommendation[] => {
      const businessAddon = relevantBusinessAddons.find((addon) => addon.id === id && addon.level === level);
      if (businessAddon) return [{
        ...businessAddon,
        billingPeriod: selectedPricingConfig.addons[id]?.billingPeriod,
      }];
      const sharedAddon = selectedPricingConfig.addons[id];
      return sharedAddon?.enabled
        ? [{
            id: sharedAddon.id,
            label: sharedAddon.label,
            description: sharedAddon.description,
            price: sharedAddon.price,
            level,
            categoryId: effectiveBusinessCategoryId || "general",
            categoryLabel: effectiveBusinessCategoryId || "general",
            businessTypes: [],
            origin: sharedAddon.origin || "existing",
            enabled: sharedAddon.enabled,
            requiresCustomQuote: sharedAddon.requiresCustomQuote || false,
            billingPeriod: sharedAddon.billingPeriod,
          }]
        : [];
    });
    const candidates = relevantBusinessAddons.filter((addon) => addon.level === level);
    const recommendationSet: CalculatorAddonRecommendation[] = [...preferred];
    for (const candidate of candidates) {
      if (recommendationSet.length >= 2) break;
      if (!recommendationSet.some((addon) => addon.id === candidate.id)) {
        recommendationSet.push({
          ...candidate,
          billingPeriod: selectedPricingConfig.addons[candidate.id]?.billingPeriod,
        });
      }
    }
    return { level, addons: recommendationSet.slice(0, 2) };
  });

  // Toggle helpers
  const toggleProjectType = (type: string) => {
    const next = selectedProjectTypes.includes(type)
      ? (selectedProjectTypes.length > 1
        ? selectedProjectTypes.filter((item) => item !== type)
        : selectedProjectTypes)
      : [...selectedProjectTypes, type];
    setSelectedProjectTypes(next);
    setBusinessCategoryFilter("");
    setBusinessTypeFilter("all");
    const applicableBusinessCategories = next
      .map((projectType) => inferBusinessCategoryForLabels([projectType]))
      .filter((categoryId): categoryId is string => Boolean(categoryId));
    if (applicableBusinessCategories.length > 0) {
      const currentBusinessAddonIds = new Set(
        getBusinessAddonCatalog(selectedPricingConfig.addons).map((addon) => addon.id)
      );
      setSelectedAddons((current) => current.filter((addonId) => {
        if (!currentBusinessAddonIds.has(addonId)) return true;
        const categories = getBusinessAddonCatalog(selectedPricingConfig.addons)
          .filter((addon) => addon.id === addonId)
          .map((addon) => addon.categoryId);
        return categories.some((categoryId) => applicableBusinessCategories.includes(categoryId));
      }));
    }
    const projectPackage = next
      .map(getDefaultPricingPackageForProjectType)
      .find((packageId) => packageId !== null) || null;
    if (projectPackage?.startsWith("ecommerce_")) {
      const activePackage = selectedPricingPackage?.startsWith("ecommerce_")
        ? selectedPricingPackage
        : projectPackage;
      setSelectedPricingPackage(activePackage);
      setAdminPanelType("client_admin");
      setExpectedBudgetRange(activePackage.replace("_", "-"));
    } else if (projectPackage?.startsWith("saas_")) {
      setSelectedPricingPackage((current) => current?.startsWith("saas_") ? current : projectPackage);
      setAdminPanelType("client_admin");
      setExpectedBudgetRange((current) =>
        current.startsWith("saas-") ? current : "saas-starter"
      );
    } else {
      setSelectedPricingPackage(null);
    }
  };

  const toggleProductFeature = (f: string) => {
    setProductFeatures((prev) =>
      prev.includes(f) ? prev.filter((item) => item !== f) : [...prev, f]
    );
  };

  const toggleOrderFeature = (f: string) => {
    setOrderFeatures((prev) =>
      prev.includes(f) ? prev.filter((item) => item !== f) : [...prev, f]
    );
  };

  const toggleAdminFeature = (f: string) => {
    setAdminFeatures((prev) =>
      prev.includes(f) ? prev.filter((item) => item !== f) : [...prev, f]
    );
  };

  const toggleAddon = (id: string) => {
    setSelectedAddons((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const buildLeadQuestionnaire = useCallback(() => ({
    customerName,
    businessName,
    email: email || leadContactEmail,
    phone: phone || leadContactPhone,
    cityCountry,
    preferredContact,
    customerIntro,
    projectTypes: selectedProjectTypes,
    problemToSolve: problemToSolve || plainLanguageNeed,
    targetAudience,
    productsServices,
    inspirationUrl,
    isNewOrUpgrade,
    preferredLaunchDate,
    expectedBudgetRange: budgetRangeOptions.find((option) => option.value === expectedBudgetRange)?.label || expectedBudgetRange,
    displayFixedOnly,
    needsProductCatalog,
    productFeatures,
    acceptOrdersOnline,
    orderFeatures,
    needsReviewsOrAccounts,
    adminPanelType,
    adminFeatures,
    selectedAddons,
    customFeatureNotes,
    pricingPackage: selectedPricingPackage,
    currency,
    language: guideLanguage,
    locale,
    disclaimerAccepted,
  }), [
    customerName,
    businessName,
    email,
    leadContactEmail,
    phone,
    leadContactPhone,
    cityCountry,
    preferredContact,
    customerIntro,
    selectedProjectTypes,
    problemToSolve,
    plainLanguageNeed,
    targetAudience,
    productsServices,
    inspirationUrl,
    isNewOrUpgrade,
    preferredLaunchDate,
    expectedBudgetRange,
    budgetRangeOptions,
    displayFixedOnly,
    needsProductCatalog,
    productFeatures,
    acceptOrdersOnline,
    orderFeatures,
    needsReviewsOrAccounts,
    adminPanelType,
    adminFeatures,
    selectedAddons,
    customFeatureNotes,
    selectedPricingPackage,
    currency,
    guideLanguage,
    locale,
    disclaimerAccepted,
  ]);

  const saveLeadProgress = useCallback(async (session = calculatorLeadSession): Promise<boolean> => {
    if (!session) return true;
    try {
      const response = await fetch(`/api/public/calculator-leads/${encodeURIComponent(session.id)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          profile: {
            name: customerName || leadContactName,
            email: email || leadContactEmail,
            phone: phone || leadContactPhone,
            goal: guideGoal,
            budgetBand: guideBudget,
            language: guideLanguage,
            locale,
            currency,
            userDescription: plainLanguageNeed,
            progressStep: currentStep,
          },
          questionnaire: buildLeadQuestionnaire(),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Lead answers could not be saved.");
      return true;
    } catch (error) {
      setLeadSaveMessage(error instanceof Error ? error.message : "Lead answers could not be saved.");
      return false;
    }
  }, [
    calculatorLeadSession,
    customerName,
    leadContactName,
    email,
    leadContactEmail,
    phone,
    leadContactPhone,
    guideGoal,
    guideBudget,
    guideLanguage,
    locale,
    currency,
    plainLanguageNeed,
    currentStep,
    buildLeadQuestionnaire,
  ]);

  useEffect(() => {
    if (!calculatorLeadSession || currentStep < 1 || currentStep > 7) return;
    const timer = window.setTimeout(() => {
      void saveLeadProgress();
    }, 900);
    return () => window.clearTimeout(timer);
  }, [
    calculatorLeadSession,
    saveLeadProgress,
    currentStep,
    customerName,
    businessName,
    email,
    phone,
    cityCountry,
    preferredContact,
    customerIntro,
    selectedProjectTypes,
    problemToSolve,
    targetAudience,
    productsServices,
    inspirationUrl,
    isNewOrUpgrade,
    preferredLaunchDate,
    expectedBudgetRange,
    displayFixedOnly,
    needsProductCatalog,
    productFeatures,
    acceptOrdersOnline,
    orderFeatures,
    needsReviewsOrAccounts,
    adminPanelType,
    adminFeatures,
    selectedAddons,
    customFeatureNotes,
    selectedPricingPackage,
    currency,
    guideLanguage,
    locale,
    disclaimerAccepted,
    guideGoal,
    guideBudget,
    plainLanguageNeed,
  ]);

  const handleSaveCalculatorLead = async (): Promise<{ id: string; token: string } | null> => {
    setLeadSaving(true);
    setLeadSaveMessage("");
    try {
      const existing = calculatorLeadSession;
      if (existing) {
        const saved = await saveLeadProgress();
        if (!saved) throw new Error("Your plan could not be updated. Please try again.");
        setLeadSaveMessage(guideCopy.saved);
        return existing;
      }

      const response = await fetch("/api/public/calculator-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: leadContactName,
          email: leadContactEmail,
          phone: leadContactPhone,
          contactConsent: leadContactConsent,
          goal: guideGoal,
          budgetBand: guideBudget,
          language: guideLanguage,
          locale,
          currency,
          userDescription: plainLanguageNeed,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Your plan could not be saved.");
      const session = { id: result.leadId as string, token: result.updateToken as string };
      setCalculatorLeadSession(session);
      try {
        sessionStorage.setItem("dwd-calculator-lead-id", session.id);
        sessionStorage.setItem("dwd-calculator-lead-token", session.token);
      } catch {
        // The lead is saved server-side even when session storage is blocked.
      }
      setLeadSaveMessage(guideLanguage === "roman-ur" ? "Aapka plan follow-up ke liye save ho gaya." : "Your plan is saved for follow-up.");
      return session;
    } catch (error) {
      setLeadSaveMessage(error instanceof Error ? error.message : "Your plan could not be saved.");
      return null;
    } finally {
      setLeadSaving(false);
    }
  };

  // Validation before proceeding
  const validateStep = (step: number): boolean => {
    setErrorMessage("");
    if (!pricingConfigReady) {
      setErrorMessage(
        pricingConfigError ||
          "The current add-on pricing is still loading. Please wait and retry."
      );
      return false;
    }
    if (step === 7) {
      const hasEmail = Boolean(email.trim());
      const hasPhone = Boolean(phone.trim());
      if (!hasEmail && !hasPhone) {
        setErrorMessage(guideLanguage === "roman-ur"
          ? "Calculator aage chalane ke liye email ya WhatsApp number mein se aik dein."
          : "Enter an email address or WhatsApp number to continue.");
        return false;
      }
      if (hasEmail && (!email.includes("@") || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))) {
        setErrorMessage(guideLanguage === "roman-ur" ? "Email address durust likhein." : "Please enter a valid email address.");
        return false;
      }
      if (hasPhone && phone.replace(/\D/g, "").length < 8) {
        setErrorMessage(guideLanguage === "roman-ur" ? "WhatsApp number country code ke saath durust likhein." : "Please enter a valid WhatsApp number with country code.");
        return false;
      }
    }
    if (step === 1) {
      if (selectedProjectTypes.length === 0) {
        setErrorMessage("Please select at least one relevant project category.");
        return false;
      }
    }
    if (step === 7) {
      if (!customerName.trim() || !email.trim() || !phone.trim()) {
        setErrorMessage(guideLanguage === "roman-ur"
          ? "Formal inquiry bhejne ke liye naam, email aur WhatsApp number poora karein. Aapka saved incomplete lead mehfooz rahega."
          : "To submit a formal inquiry, add your name, email and WhatsApp number. Your saved incomplete lead will remain available.");
        return false;
      }
      if (!disclaimerAccepted) {
        setErrorMessage("You must accept the estimate disclaimer to proceed.");
        return false;
      }
      if (currency !== "PKR" && !rates[currency]) {
        setErrorMessage("Live exchange rate is unavailable. Please retry later or choose PKR.");
        return false;
      }
    }
    return true;
  };

  const handleNext = async () => {
    if (validateStep(currentStep)) {
      if (calculatorLeadSession) await saveLeadProgress();
      setCurrentStep((prev) => Math.min(8, prev + 1));
      window.scrollTo({ top: 150, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    setErrorMessage("");
    setCurrentStep((prev) => Math.max(0, prev - 1));
    window.scrollTo({ top: 150, behavior: "smooth" });
  };

  const handleStartWithGuidePlan = async () => {
    if (isDetailedProjectPath) {
      if (leadContactConsent) {
        if (!leadContactEmail.trim() && !leadContactPhone.trim() && !calculatorLeadSession) {
          setLeadSaveMessage(guideLanguage === "roman-ur"
            ? "Lead save karne ke liye email ya WhatsApp number dein."
            : "Enter an email or WhatsApp number to save your lead.");
          return;
        }
        const savedSession = await handleSaveCalculatorLead();
        if (!savedSession) return;
      }
      setCustomerName(leadContactName);
      setEmail(leadContactEmail);
      setPhone(leadContactPhone);
      const needsStoreCatalog = selectedProjectTypes.some((type) =>
        isEcommerceProjectType(type) || type.toLowerCase().includes("restaurant")
      );
      setNeedsProductCatalog(needsStoreCatalog);
      setDisplayFixedOnly(!needsStoreCatalog);
      setAcceptOrdersOnline(needsStoreCatalog);
      setProductFeatures(needsStoreCatalog ? ["categories", "images", "pricing"] : []);
      setOrderFeatures(needsStoreCatalog ? ["cart", "checkout", "delivery_fees"] : []);
      if (selectedProjectTypes.length === 0) {
        setSelectedPricingPackage(null);
        setSelectedAddons([]);
        setAdminPanelType("none");
      }
      setCurrentStep(1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (leadContactConsent) {
      if (!leadContactEmail.trim() && !leadContactPhone.trim() && !calculatorLeadSession) {
        setLeadSaveMessage(guideLanguage === "roman-ur" ? "Lead save karne ke liye email ya WhatsApp number dein." : "Enter an email or WhatsApp number to save your lead.");
        return;
      }
      const savedSession = await handleSaveCalculatorLead();
      if (!savedSession) return;
    }
    const isStore = guideGoal === "online-store" || guideGoal === "restaurant";
    const isFullStore = isStore && Boolean(guidePlan.pricingPackage?.startsWith("ecommerce_"));
    setSelectedProjectTypes([guidePlan.projectType]);
    setSelectedPricingPackage(guidePlan.pricingPackage);
    setAdminPanelType(guidePlan.adminPanelType);
    setSelectedAddons(guidePlan.selectedAddons);
    setCustomerName(leadContactName);
    setEmail(leadContactEmail);
    setPhone(leadContactPhone);
    setExpectedBudgetRange(guidePlan.expectedBudgetRange);
    setProblemToSolve(plainLanguageNeed.trim() || guidePlan.problemToSolve);
    setNeedsProductCatalog(isStore);
    setProductFeatures(isStore
      ? isFullStore ? ["categories", "variants", "stock", "images", "pricing"] : ["categories", "images", "pricing"]
      : []);
    setAcceptOrdersOnline(isFullStore);
    setOrderFeatures(isFullStore ? ["cart", "checkout", "delivery_fees"] : []);
    setNeedsReviewsOrAccounts(isFullStore);
    setAdminFeatures(guidePlan.adminPanelType === "client_admin"
      ? isFullStore ? ["products", "orders", "stock", "customers"] : guideGoal === "business-tools" ? ["customers"] : ["content"]
      : []);
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSkipGuide = async () => {
    if (leadContactConsent) {
      if (!leadContactEmail.trim() && !leadContactPhone.trim() && !calculatorLeadSession) {
        setLeadSaveMessage(guideLanguage === "roman-ur"
          ? "Lead save karne ke liye email ya WhatsApp number dein."
          : "Enter an email or WhatsApp number to save your lead.");
        return;
      }
      const savedSession = await handleSaveCalculatorLead();
      if (!savedSession) return;
    }
    setCustomerName(leadContactName);
    setEmail(leadContactEmail);
    setPhone(leadContactPhone);
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Final submission to server
  const handleSubmit = async () => {
    if (!validateStep(7)) return;

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const payload = {
        customerName,
        businessName,
        email,
        phone,
        cityCountry,
        preferredContact,
        whatsappConfirmationConsent,
        customerIntro,
        projectTypes: selectedProjectTypes,
        problemToSolve,
        targetAudience,
        productsServices,
        inspirationUrl,
        isNewOrUpgrade,
        preferredLaunchDate,
        expectedBudgetRange: budgetRangeOptions.find((option) => option.value === expectedBudgetRange)?.label || "",
        displayFixedOnly,
        needsProductCatalog,
        productFeatures,
        acceptOrdersOnline,
        orderFeatures,
        needsReviewsOrAccounts,
        adminPanelType,
        adminFeatures,
        selectedAddons,
        scanFeatures,
        pricingPackage: selectedPricingPackage,
        customFeatureNotes,
        currency,
        language: guideLanguage,
        ...(calculatorLeadSession ? { calculatorLead: calculatorLeadSession } : {}),
        disclaimerAccepted,
      };

      const res = await fetch("/api/public/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit project inquiry.");
      }

      setSubmittedInquiry({ ...data.inquiry, whatsappConfirmation: data.whatsappConfirmation });
      if (calculatorLeadSession) await saveLeadProgress();
      setCurrentStep(8);

      // Trigger celebration confetti
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#E31E36", "#101216", "#ffffff", "#10B981"],
        });
      } catch (e) {
        // Ignore if confetti fails in some contexts
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyReferenceToClipboard = () => {
    if (submittedInquiry?.id) {
      navigator.clipboard.writeText(submittedInquiry.id);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2500);
    }
  };

  const stepsList = [
    ...(guideLanguage === "roman-ur"
      ? ["Project ki qisam", "Zaroorat aur masla", "Products aur orders", "Ab tak ka andaza", "Mazeed options", "Andazati budget", "Rabtay ki maloomat"]
      : ["What you need", "Your project idea", "Products & orders", "Estimate so far", "Optional extras", "Your estimate", "Your contact details"]),
  ];
  const guideGoalOptions = [
    { id: "business-site" as const, title: "Show my business and get enquiries", titleRoman: "Business dikhana aur customers se rabta lena", detail: "A landing page or a few pages to explain your services and help people contact you.", detailRoman: "Aik landing page ya chand pages par apni services dikhayein aur rabtay ka rasta dein.", icon: Briefcase },
    { id: "restaurant" as const, title: "Show my menu and get food orders", titleRoman: "Menu dikhana aur food orders lena", detail: "Start with menu and WhatsApp orders, or choose full online ordering.", detailRoman: "Menu aur WhatsApp orders se shuru karein, ya poori online ordering chunen.", icon: Utensils },
    { id: "online-store" as const, title: "Show products or take orders", titleRoman: "Products dikhana ya orders lena", detail: "Start with a catalog, or choose a full online store.", detailRoman: "Product list se shuru karein ya mukammal online store chunen.", icon: ShoppingBag },
    { id: "bookings" as const, title: "Let people request appointments", titleRoman: "Appointments ki requests lena", detail: "Share services and collect booking requests.", detailRoman: "Apni services dikhayein aur booking requests hasil karein.", icon: Calendar },
    { id: "business-tools" as const, title: "Manage customers or daily work", titleRoman: "Customers ya roz ka kaam manage karna", detail: "Keep one important business process in a dashboard.", detailRoman: "Aik zaroori business process dashboard mein sambhalein.", icon: Users },
    { id: "online-platform" as const, title: "Build an online tool customers sign into", titleRoman: "Login wala online tool banana", detail: "Start a software product or customer portal.", detailRoman: "Software product ya customer portal se shuru karein.", icon: Cpu },
    { id: "not-sure" as const, title: "I have an idea, but need help explaining it", titleRoman: "Idea hai, magar samjhana mushkil lagta hai", detail: "Describe it in your own words; no technical terms needed.", detailRoman: "Apne alfaaz mein batayein; technical lafz zaroori nahi.", icon: Sparkles },
  ];
  const guideBudgetOptions = [
    { id: "under-50k" as const, label: `Up to ${formatPrice(50000)}`, detail: "A useful first version", detailRoman: "Kaam ki pehli website" },
    { id: "50-150k" as const, label: `${formatPrice(50000)} - ${formatPrice(150000)}`, detail: "Room for a dashboard or more features", detailRoman: "Dashboard ya mazeed features ki gunjaish" },
    { id: "150-300k" as const, label: `${formatPrice(150000)} - ${formatPrice(300000)}`, detail: "Full store or an online platform starter", detailRoman: "Mukammal store ya online platform ka starter" },
    { id: "300k-plus" as const, label: `${formatPrice(300000)}+`, detail: "Advanced or larger custom scope", detailRoman: "Advanced ya bara custom project" },
    { id: "not-sure" as const, label: "I'm not sure yet", detail: "Show me a sensible starting point", detailRoman: "Mujhe munasib shuruati option dikhayein" },
  ];
  const submittedCalculation =
    submittedInquiry?.internationalCalculation || submittedInquiry?.calculation;
  const submittedCurrency: CurrencyCode = isCurrencyCode(submittedInquiry?.currency)
    ? submittedInquiry.currency
    : "PKR";
  const submittedPricingPackage: PricingPackageId | null = isPricingPackageId(
    submittedInquiry?.pricingPackage
  )
    ? submittedInquiry.pricingPackage
    : null;
  if (currentStep === 0) {
    return (
      <div className="min-h-screen bg-white text-[#101216]">
        <section className="border-b border-[#242830] bg-[#101216] py-10 text-white sm:py-14">
          <div className="mx-auto max-w-5xl space-y-4 px-4 text-center sm:px-6 lg:px-8">
            <span className="inline-flex rounded-full border border-[#E31E36]/40 bg-[#242830] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-red-300">
              {guideCopy.start}
            </span>
            <h1 className="text-3xl font-black tracking-tight sm:text-5xl">{guideCopy.headline}</h1>
            <p className="mx-auto max-w-2xl text-sm leading-relaxed text-gray-300 sm:text-base">
              {guideLanguage === "roman-ur"
                ? "Apna maqsad chunein, project ki tafseel dein, aur phir andazati budget dekhein."
                : "Choose what you need, share your project details, then review the estimated budget."}
            </p>
            <div role="group" aria-label="Guide language" className="inline-flex overflow-hidden rounded-md border border-gray-600">
              <button type="button" aria-pressed={guideLanguage === "roman-ur"} onClick={() => { setGuideLanguage("roman-ur"); setLanguageOverridden(true); }} className={`px-3 py-1.5 text-[11px] font-bold ${guideLanguage === "roman-ur" ? "bg-white text-[#101216]" : "text-gray-300 hover:bg-white/10"}`}>Roman Urdu</button>
              <button type="button" aria-pressed={guideLanguage === "en"} onClick={() => { setGuideLanguage("en"); setLanguageOverridden(true); }} className={`border-l border-gray-600 px-3 py-1.5 text-[11px] font-bold ${guideLanguage === "en" ? "bg-white text-[#101216]" : "text-gray-300 hover:bg-white/10"}`}>English</button>
            </div>
          </div>
        </section>

        <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
          <div className="mb-7 grid grid-cols-3 gap-2 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:gap-4 sm:p-4">
            {[
              guideLanguage === "roman-ur" ? "1. Maqsad chunein" : "1. Choose your goal",
              guideLanguage === "roman-ur" ? "2. Budget batayein" : "2. Set your budget",
              guideLanguage === "roman-ur" ? "3. Plan dekhein" : "3. Review your plan",
            ].map((label, index) => (
              <div key={label} className="flex items-center gap-2 text-[10px] font-bold text-gray-600 sm:text-xs">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${index === 0 ? "bg-[#E31E36] text-white" : "bg-gray-100 text-gray-500"}`}>
                  {index + 1}
                </span>
                <span>{label.substring(label.indexOf(" ") + 1)}</span>
              </div>
            ))}
          </div>
          <div className="grid items-start gap-8 lg:grid-cols-2">
          <div className="space-y-8">
          <section>
            <h2 className="text-xl font-extrabold">{guideCopy.goalHeading}</h2>
            <p className="mt-1 text-xs text-gray-600">{guideCopy.goalHint}</p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {guideGoalOptions.map((option) => {
                const Icon = option.icon;
                const selected = !isDetailedProjectPath && guideGoal === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      setGuideGoal(option.id);
                      setIsDetailedProjectPath(false);
                    }}
                    className={`flex min-h-24 items-start gap-3 rounded-2xl border p-4 text-left transition sm:p-5 ${selected ? "border-[#E31E36] bg-red-50 ring-1 ring-[#E31E36] shadow-sm" : "border-gray-200 bg-white hover:border-gray-400 hover:shadow-sm"}`}
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${selected ? "bg-[#E31E36] text-white" : "bg-gray-100 text-gray-600"}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>
                      <strong className="block text-sm">{guideLanguage === "roman-ur" ? option.titleRoman : option.title}</strong>
                      <span className="mt-1 block text-xs leading-relaxed text-gray-600">{guideLanguage === "roman-ur" ? option.detailRoman : option.detail}</span>
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                aria-pressed={isDetailedProjectPath}
                onClick={() => setIsDetailedProjectPath(true)}
                className={`flex min-h-24 items-start gap-3 rounded-2xl border p-4 text-left transition sm:p-5 ${isDetailedProjectPath ? "border-[#E31E36] bg-red-50 ring-1 ring-[#E31E36] shadow-sm" : "border-gray-200 bg-white hover:border-gray-400 hover:shadow-sm"}`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isDetailedProjectPath ? "bg-[#E31E36] text-white" : "bg-gray-100 text-gray-600"}`}>
                  <Layers className="h-4 w-4" />
                </span>
                <span>
                  <strong className="block text-sm">
                    {guideLanguage === "roman-ur"
                      ? "Mujhe pata hai mujhe kis qisam ka project chahiye"
                      : "I already know what type of project I need"}
                  </strong>
                  <span className="mt-1 block text-xs leading-relaxed text-gray-600">
                    {guideLanguage === "roman-ur"
                      ? "Website, e-commerce ya SaaS chunein aur project ki tafseel dein."
                      : "Choose a website, e-commerce store or SaaS project and tell us the details."}
                  </span>
                  <span className="mt-2 block text-[11px] font-extrabold text-[#E31E36]">
                    {guideLanguage === "roman-ur"
                      ? `E-commerce ${formatPrice(ECOMMERCE_PACKAGES.ecommerce_starter.basePrice)} se · SaaS ${formatPrice(SAAS_PACKAGES.saas_starter.basePrice)} se`
                      : `E-commerce from ${formatPrice(ECOMMERCE_PACKAGES.ecommerce_starter.basePrice)} · SaaS from ${formatPrice(SAAS_PACKAGES.saas_starter.basePrice)}`}
                  </span>
                </span>
              </button>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-extrabold">{guideCopy.budgetHeading}</h2>
            <p className="mt-1 text-xs text-gray-600">{guideCopy.help}</p>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {guideBudgetOptions.map((option) => {
                const selected = guideBudget === option.id;
                return (
                  <label key={option.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${selected ? "border-[#E31E36] bg-red-50 shadow-sm" : "border-gray-200 bg-white hover:border-gray-400"}`}>
                    <input
                      type="radio"
                      name="beginner-project-budget"
                      value={option.id}
                      checked={selected}
                      onChange={() => setGuideBudget(option.id)}
                      className="mt-0.5 accent-[#E31E36]"
                    />
                    <span>
                      <strong className="block text-xs">{option.label}</strong>
                      <span className="mt-1 block text-[11px] text-gray-600">{guideLanguage === "roman-ur" ? option.detailRoman : option.detail}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          <section>
            <label htmlFor="plain-language-need" className="text-sm font-extrabold">{guideCopy.needLabel} <span className="font-normal text-gray-500">{guideLanguage === "roman-ur" ? "(ikhtiyari)" : "(optional)"}</span></label>
            <textarea
              id="plain-language-need"
              rows={3}
              value={plainLanguageNeed}
              onChange={(event) => setPlainLanguageNeed(event.target.value)}
              placeholder={guideCopy.needHint}
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3.5 py-3 text-sm text-[#101216] placeholder:text-gray-400 focus:border-[#E31E36] focus:outline-none focus:ring-1 focus:ring-[#E31E36]"
            />
          </section>

          </div>
          <div className="space-y-6 lg:sticky lg:top-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            {isDetailedProjectPath ? (
              <>
                <span className="text-[11px] font-bold uppercase text-gray-500">
                  {guideLanguage === "roman-ur" ? "Project packages" : "Project package starting prices"}
                </span>
                <h2 className="mt-1 text-xl font-black">
                  {guideLanguage === "roman-ur" ? "Apni website ya software ki qisam chunein" : "Choose your website or software type"}
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-gray-600">
                  {guideLanguage === "roman-ur"
                    ? `E-commerce starter ${formatPrice(ECOMMERCE_PACKAGES.ecommerce_starter.basePrice)} se shuru hota hai; SaaS starter ${formatPrice(SAAS_PACKAGES.saas_starter.basePrice)} se. Business website ya landing page ka admin panel lazmi nahi—sirf zaroorat par add karein.`
                    : `E-commerce packages start at ${formatPrice(ECOMMERCE_PACKAGES.ecommerce_starter.basePrice)} and SaaS packages at ${formatPrice(SAAS_PACKAGES.saas_starter.basePrice)}. A business landing page does not automatically need an admin panel.`}
                </p>
                <p className="mt-4 text-[11px] font-semibold text-gray-700">
                  {guideLanguage === "roman-ur"
                    ? "Package chunne ke liye card par click karein:"
                    : "Select a starting package to continue:"}
                </p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    aria-pressed={selectedPricingPackage?.startsWith("ecommerce_") || false}
                    onClick={() => {
                      setIsDetailedProjectPath(true);
                      setSelectedProjectTypes(["E-commerce store"]);
                      setSelectedPricingPackage("ecommerce_starter");
                      setAdminPanelType("client_admin");
                      setSelectedAddons([]);
                      setExpectedBudgetRange("ecommerce-starter");
                    }}
                    className={`rounded-xl border p-4 text-left transition ${
                      selectedPricingPackage?.startsWith("ecommerce_")
                        ? "border-[#E31E36] bg-red-50 ring-1 ring-[#E31E36]"
                        : "border-gray-200 bg-gray-50 hover:border-[#E31E36]"
                    }`}
                  >
                    <strong className="block text-xs">{guideLanguage === "roman-ur" ? "E-commerce store" : "E-commerce store"}</strong>
                    <span className="mt-1 block text-lg font-black text-[#E31E36]">{formatPrice(ECOMMERCE_PACKAGES.ecommerce_starter.basePrice)}+</span>
                    <span className="mt-1 block text-[11px] text-gray-600">{guideLanguage === "roman-ur" ? "Starter package ki qeemat" : "Starter package"}</span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={selectedPricingPackage?.startsWith("saas_") || false}
                    onClick={() => {
                      setIsDetailedProjectPath(true);
                      setSelectedProjectTypes(["SaaS application"]);
                      setSelectedPricingPackage("saas_starter");
                      setAdminPanelType("client_admin");
                      setSelectedAddons([]);
                      setExpectedBudgetRange("saas-starter");
                    }}
                    className={`rounded-xl border p-4 text-left transition ${
                      selectedPricingPackage?.startsWith("saas_")
                        ? "border-[#E31E36] bg-red-50 ring-1 ring-[#E31E36]"
                        : "border-gray-200 bg-gray-50 hover:border-[#E31E36]"
                    }`}
                  >
                    <strong className="block text-xs">SaaS</strong>
                    <span className="mt-1 block text-lg font-black text-[#E31E36]">{formatPrice(SAAS_PACKAGES.saas_starter.basePrice)}+</span>
                    <span className="mt-1 block text-[11px] text-gray-600">{guideLanguage === "roman-ur" ? "Starter package ki qeemat" : "Starter package"}</span>
                  </button>
                </div>
                <p className="mt-4 text-[11px] leading-relaxed text-gray-500">
                  {guideLanguage === "roman-ur"
                    ? "Final qeemat aapki requirements dekh kar confirm hogi. Aagay barhne par aap project ki tafseel bhar sakte hain."
                    : "Final pricing is confirmed against your requirements. Continue to share your project details."}
                </p>
              </>
            ) : (
            <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase text-gray-500">{guideCopy.recommendation}</span>
                <h2 className="mt-1 text-xl font-black">{guidePlan.title}</h2>
                <p className="mt-1 text-xs text-gray-600">{guideCopy.confirm}</p>
              </div>
              <div className="min-w-44 rounded-2xl bg-[#101216] px-5 py-4 text-white shadow-lg">
                <span className="block text-[10px] font-bold uppercase text-gray-300">{guideCopy.total}</span>
                <strong className="mt-1 block text-2xl font-black">{formatEstimate(guideCalculation.estimatedTotal)}</strong>
                <span className="mt-1 block text-[11px] text-gray-300">{guideCopy.advance}: {formatEstimate(guideCalculation.advanceAmount)}</span>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <h3 className="text-xs font-extrabold text-emerald-800">{guideCopy.included}</h3>
                <ul className="mt-2 space-y-2">
                  {guidePlan.included.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs leading-relaxed text-gray-700">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" />{item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-gray-700">{guideCopy.excluded}</h3>
                <ul className="mt-2 space-y-2">
                  {guidePlan.notIncluded.map((item) => (
                    <li key={item} className="text-xs leading-relaxed text-gray-600">{item}</li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="mt-5 border-t border-gray-200 pt-3 text-[11px] leading-relaxed text-gray-500">
              {guideCopy.budgetNote}
            </p>
            <p className="mt-3 rounded-lg bg-gray-50 p-3 text-[11px] leading-relaxed text-gray-600">
              {guideLanguage === "roman-ur"
                ? "Landing page aam tor par aik page hota hai; business website aik ya zyada pages ki ho sakti hai. Admin panel lazmi nahi—sirf tab add karein jab aap khud content update karna chahein."
                : "A landing page is usually one focused page; a business website may have one or more pages. An admin panel is optional and only needed if you want to update content yourself."}
            </p>
            </>
            )}
          </section>

          <details className="group rounded-2xl border border-gray-200 bg-white">
            <summary className="cursor-pointer list-none rounded-2xl p-4 text-sm font-extrabold marker:hidden hover:bg-gray-50 sm:p-5">
              <span className="flex items-center justify-between gap-3">
                <span>{guideCopy.contactHeading}</span>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold text-gray-600">
                  {guideLanguage === "roman-ur" ? "Ikhtiyari" : "Optional"}
                </span>
              </span>
              <span className="mt-1 block text-xs font-normal leading-relaxed text-gray-600">{guideCopy.contactHint}</span>
            </summary>
            <div className="border-t border-gray-100 p-4 sm:p-5">
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="text-[11px] font-semibold text-gray-700">{guideCopy.name}
                <input value={leadContactName} onChange={(event) => setLeadContactName(event.target.value)} maxLength={120} autoComplete="name" className="mt-1.5 w-full rounded-md border border-gray-300 px-3 py-2.5 text-xs" />
              </label>
              <label className="text-[11px] font-semibold text-gray-700">{guideCopy.email}
                <input type="email" value={leadContactEmail} onChange={(event) => setLeadContactEmail(event.target.value)} maxLength={254} autoComplete="email" className="mt-1.5 w-full rounded-md border border-gray-300 px-3 py-2.5 text-xs" />
              </label>
              <label className="text-[11px] font-semibold text-gray-700">{guideCopy.phone}
                <input type="tel" value={leadContactPhone} onChange={(event) => setLeadContactPhone(event.target.value)} maxLength={32} autoComplete="tel" className="mt-1.5 w-full rounded-md border border-gray-300 px-3 py-2.5 text-xs" />
              </label>
            </div>
            <label className="mt-4 flex items-start gap-2.5 rounded-lg border border-gray-200 bg-gray-50 p-3 text-[11px] leading-relaxed text-gray-700">
              <input type="checkbox" checked={leadContactConsent} onChange={(event) => setLeadContactConsent(event.target.checked)} className="mt-0.5 accent-[#E31E36]" />
              <span>{guideCopy.consent}</span>
            </label>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button type="button" disabled={leadSaving || !leadContactConsent || (!leadContactEmail.trim() && !leadContactPhone.trim() && !calculatorLeadSession)} onClick={() => void handleSaveCalculatorLead()} className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2.5 text-xs font-bold text-[#101216] disabled:cursor-not-allowed disabled:opacity-50">
                {leadSaving ? (guideLanguage === "roman-ur" ? "Save ho raha hai…" : "Saving…") : calculatorLeadSession ? (guideLanguage === "roman-ur" ? "Plan update karein" : "Update saved plan") : guideCopy.save}
              </button>
              <span role="status" className="text-[11px] text-gray-600">{leadSaveMessage}</span>
            </div>
            </div>
          </details>

          <div className="flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
            <button type="button" onClick={() => void handleSkipGuide()} className="px-2 py-3 text-xs font-bold text-gray-600 underline decoration-gray-300 underline-offset-4 hover:text-[#101216]">
              {guideCopy.skip}
            </button>
            <button type="button" onClick={handleStartWithGuidePlan} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#E31E36] px-6 py-3.5 text-sm font-extrabold text-white transition hover:bg-[#C8162D]">
              {guideLanguage === "roman-ur" ? "Project ki tafseel dein" : "Continue to project details"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-[#FFFFFF] text-[#101216] min-h-screen">
      {/* Top Banner */}
      <section className="bg-[#101216] text-white py-12 border-b border-[#242830]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-3">
          <span className="text-[#E31E36] font-extrabold text-xs uppercase tracking-widest bg-[#242830] px-3.5 py-1 rounded-full border border-[#E31E36]/30">
            {guideLanguage === "roman-ur" ? "Aapki project zaroorat" : "Multi-Step Requirements Questionnaire"}
          </span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
          {guideLanguage === "roman-ur" ? "Apna project plan karein" : "Plan your website or app"}
          </h1>
          <p className="text-xs sm:text-sm text-gray-300 max-w-xl mx-auto">
            {guideLanguage === "roman-ur"
            ? "Pehle apni zaroorat chunein. Andaza dekhne ke baad akhir mein rabtay ki maloomat dein."
            : "Start with what you need, review a clear estimate, and share your contact details at the end."}
          </p>
        </div>
      </section>

      {/* Main Questionnaire Container */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {guideLanguage === "roman-ur" && (
          <p className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-950">
            Jawab Roman Urdu mein likh sakte hain. Technical lafz samajh na aaye to us sawal ko chhor dein; DWD team aapki zaroorat review karegi.
          </p>
        )}
        <section className="mb-8 rounded-2xl border border-[#E31E36]/30 bg-red-50 p-5 sm:p-6">
          <label htmlFor="project-currency" className="block text-sm font-extrabold text-[#101216]">
            {guideLanguage === "roman-ur" ? "Pehle: budget kis currency mein dekhna hai?" : "First: Which currency should we use for your project budget?"}
          </label>
          <div className="mt-3 max-w-md">
            <CurrencySelector
              id="project-currency"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-900"
            />
          </div>
          <p className="mt-2 text-xs leading-relaxed text-gray-600">
            {guideLanguage === "roman-ur"
              ? "Pakistan ke liye PKR rates hain. Doosri currency chunne par international rates apply honge; final amount quote se pehle confirm kiya jayega."
              : "PKR uses Pakistan rates. Choosing another currency marks this as an international project; the latest regional price is shown and confirmed in the final quote."}
          </p>
          {currency !== "PKR" && rates[currency] && (
            <p className="mt-2 text-[11px] font-semibold text-gray-700">
              International pricing active · 1 PKR = {rates[currency]} {currency} · rate updated {rateDate || "by provider"}
            </p>
          )}
        </section>

        {/* Progress Bar & Steps Tracker */}
        <div className="mb-10">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500 mb-2">
            <span>
              {guideLanguage === "roman-ur" ? `Qadam ${currentStep} / 7:` : `Step ${currentStep} of 7:`}{" "}
              <strong className="text-[#101216]">{stepsList[currentStep - 1]}</strong>
            </span>
            <span>{Math.round((currentStep / 7) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#E31E36] to-red-500 h-full transition-all duration-300 ease-out"
              style={{ width: `${(currentStep / 7) * 100}%` }}
            />
          </div>

          {/* Step Pill Indicators */}
          <div className="hidden lg:flex justify-between mt-3 gap-3 text-[10px] font-semibold text-gray-400">
            {stepsList.map((stepName, idx) => (
              <span
                key={idx}
                className={idx + 1 === currentStep ? "text-[#E31E36] font-bold" : idx + 1 < currentStep ? "text-gray-700" : ""}
              >
                {idx + 1}. {stepName}
              </span>
            ))}
          </div>
        </div>

        {/* Live Estimate Sidebar Ribbon */}
        {currentStep < 8 && (
          <div className="bg-[#101216] text-white p-4 sm:p-5 rounded-2xl border border-gray-800 mb-8 flex flex-wrap items-center justify-between gap-4 shadow-card-dark">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#E31E36] flex items-center justify-center text-white">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                  {guideLanguage === "roman-ur" ? "Aapka chalta andaza" : "Your running estimate"}
                </span>
                {currentStep === 1 && selectedProjectTypes.length === 0 ? (
                  <span className="text-sm font-bold text-gray-200">
                    {guideLanguage === "roman-ur" ? "Project ki qisam chunein" : "Choose a project type to see pricing"}
                  </span>
                ) : (
                  <span className="text-xl font-black text-white">
                    {formatEstimate(calculation.estimatedTotal)}
                  </span>
                )}
                {!(currentStep === 1 && selectedProjectTypes.length === 0) && calculation.monthlyAddonTotal > 0 && (
                  <span className="block text-[10px] text-amber-300">
                    + {formatEstimate(calculation.monthlyAddonTotal)} {guideLanguage === "roman-ur" ? "/ mahana" : "/ month recurring"}
                  </span>
                )}
              </div>
            </div>

            {!(currentStep === 1 && selectedProjectTypes.length === 0) && (
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="bg-[#181B20] px-3 py-1.5 rounded-lg border border-gray-700">
                <span className="text-gray-400">{guideLanguage === "roman-ur" ? "Shuruati raqam: " : "Advance: "}</span>
                <strong className="text-white font-bold">{formatEstimate(calculation.advanceAmount)}</strong>
              </div>
              <div className="bg-[#181B20] px-3 py-1.5 rounded-lg border border-gray-700 hidden sm:block">
                <span className="text-gray-400">{guideLanguage === "roman-ur" ? "Rozana: " : "Daily: "}</span>
                <strong className="text-gray-200">
                  {formatEstimate(calculation.dailyCost)}{guideLanguage === "roman-ur" ? "/roz" : "/day"}
                </strong>
              </div>
            </div>
            )}
          </div>
        )}

        {/* Error notification */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-[#E31E36] font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {!pricingConfigReady && !pricingConfigError && (
          <p role="status" className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900">
            Loading the latest approved package and add-on prices…
          </p>
        )}
        {pricingConfigError && (
          <p role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800">
            Current prices could not be loaded, so the calculator cannot continue with potentially outdated rates. {pricingConfigError}
          </p>
        )}

        {/* ============================================================== */}
        {/* STEP 1: CUSTOMER INFORMATION */}
        {/* ============================================================== */}
        {currentStep === 7 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-6 animate-fadeIn sm:p-8">
            <div>
              <span className="text-[#E31E36] font-extrabold text-xs uppercase tracking-widest">
                {guideLanguage === "roman-ur" ? "Aakhri qadam / 7" : "Step 7 of 7"}
              </span>
              <h2 className="text-2xl font-black text-[#101216] mt-1">
                {guideLanguage === "roman-ur" ? "Aap se rabta kaise karein?" : "Where should we send your project reply?"}
              </h2>
              <p className="text-xs text-gray-600 mt-1">
                {guideLanguage === "roman-ur"
                  ? "Formal project inquiry bhejne ke liye naam, email aur WhatsApp number dein. Sirf lead save karne ke liye upar aik contact kafi hai."
                  : "Share your contact details so our team can review your project request. One contact method is enough to save a lead."}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {guideLanguage === "roman-ur" ? "Poora naam" : "Full Name"} <span className="text-[#E31E36]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Farhan Durrani"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-white text-xs text-[#101216] px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:border-[#E31E36]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {guideLanguage === "roman-ur" ? "Business ya company ka naam (ikhtiyari)" : "Business / Company Name (Optional)"}
                </label>
                <input
                  type="text"
                  placeholder="e.g. SpiceCraft Grill & Lounge"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full bg-white text-xs text-[#101216] px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:border-[#E31E36]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {guideLanguage === "roman-ur" ? "Email address" : "Email Address"} <span className="text-[#E31E36]">*</span>
                </label>
                <input
                  type="email"
                  placeholder="e.g. client@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white text-xs text-[#101216] px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:border-[#E31E36]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {guideLanguage === "roman-ur" ? "WhatsApp ya rabtay ka number" : "WhatsApp / Contact Phone"} <span className="text-[#E31E36]">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 03001234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-white text-xs text-[#101216] px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:border-[#E31E36]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {guideLanguage === "roman-ur" ? "Shehar / Mulk (ikhtiyari)" : "City / Country (Optional)"}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lahore, Pakistan"
                  value={cityCountry}
                  onChange={(e) => setCityCountry(e.target.value)}
                  className="w-full bg-white text-xs text-[#101216] px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:border-[#E31E36]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {guideLanguage === "roman-ur" ? "Rabta karne ka pasandeeda tareeqa" : "Preferred Contact Method"}
                </label>
                <select
                  value={preferredContact}
                  onChange={(e: any) => setPreferredContact(e.target.value)}
                  className="w-full bg-white text-xs text-[#101216] px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:border-[#E31E36]"
                >
                  <option value="whatsapp">{guideLanguage === "roman-ur" ? "WhatsApp (behtar)" : "WhatsApp (Recommended)"}</option>
                  <option value="email">Email</option>
                  <option value="phone">{guideLanguage === "roman-ur" ? "Seedha phone call" : "Direct Phone Call"}</option>
                </select>
              </div>
            </div>

            <label className="flex items-start gap-2 text-[11px] text-gray-600">
              <input
                type="checkbox"
                checked={whatsappConfirmationConsent}
                onChange={(event) => setWhatsappConfirmationConsent(event.target.checked)}
                className="mt-0.5 accent-[#E31E36]"
              />
              <span>{guideLanguage === "roman-ur" ? "Main apne inquiry reference aur tasdeeq ke liye aik WhatsApp message lene par razi hoon." : "I agree to receive one WhatsApp message with my inquiry reference and submission confirmation."}</span>
            </label>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                {guideLanguage === "roman-ur" ? "Apne ya business ke bare mein chand alfaaz (ikhtiyari)" : "Short Introduction About You or Your Business (Optional)"}
              </label>
              <textarea
                rows={3}
                placeholder="Misal: Hamara Lahore mein family restaurant hai jahan burgers, BBQ aur desi khanay milte hain. Abhi hum zyada tar phone aur WhatsApp par orders lete hain aur apni menu, location aur offers online dikhana chahte hain."
                value={customerIntro}
                onChange={(e) => setCustomerIntro(e.target.value)}
                className="w-full bg-white text-xs text-[#101216] px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:border-[#E31E36]"
              />
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* STEP 2: PROJECT TYPE */}
        {/* ============================================================== */}
        {currentStep === 1 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-6 animate-fadeIn sm:p-8">
            <div>
              <span className="text-[#E31E36] font-extrabold text-xs uppercase tracking-widest">
                {guideLanguage === "roman-ur" ? "Qadam 1 / 7" : "Step 1 of 7"}
              </span>
              <h2 className="text-2xl font-black text-[#101216] mt-1">
                {guideLanguage === "roman-ur" ? "Aap kis qisam ki website chahte hain?" : "Select Your Project Category"}
              </h2>
              <p className="text-xs text-gray-600 mt-1">
                {guideLanguage === "roman-ur" ? "Jo option aapki zaroorat ke qareeb ho usay chun lein." : "Select one or more categories that reflect the web application you want to build."}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {projectTypeOptions.map((opt) => {
                const isSelected = selectedProjectTypes.includes(opt.label);
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => toggleProjectType(opt.label)}
                    className={`p-4 rounded-xl text-left border transition flex items-start gap-3 ${
                      isSelected
                        ? "bg-white border-[#E31E36] shadow-sm ring-1 ring-[#E31E36]"
                        : "bg-white/70 hover:bg-white border-gray-200"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isSelected ? "bg-[#E31E36] text-white" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      <opt.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#101216] block leading-snug">
                        {guideLanguage === "roman-ur" ? projectTypeRomanLabels[opt.label] || opt.label : opt.label}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] text-[#E31E36] font-bold inline-flex items-center gap-0.5 mt-1">
                          <Check className="w-3 h-3" /> {guideLanguage === "roman-ur" ? "Chuna gaya" : "Selected"}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* STEP 3: PROJECT DESCRIPTION */}
        {/* ============================================================== */}
        {currentStep === 2 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-6 animate-fadeIn sm:p-8">
            <div>
              <span className="text-[#E31E36] font-extrabold text-xs uppercase tracking-widest">
                {guideLanguage === "roman-ur" ? "Qadam 2 / 7" : "Step 2 of 7"}
              </span>
              <h2 className="text-2xl font-black text-[#101216] mt-1">
                {guideLanguage === "roman-ur" ? "Aapki zaroorat aur business ka maqsad" : "Project Scope & Business Goals"}
              </h2>
              <p className="text-xs text-gray-600 mt-1">
                {guideLanguage === "roman-ur" ? "Aap apne alfaaz mein batayein ke website se kya kaam lena hai. Technical tafseel na pata ho to khaali chhor dein." : "Help us understand the business goals and requirements for your website or application."}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                    {guideLanguage === "roman-ur" ? "Website se aapka kaunsa masla hal hona chahiye?" : "What specific problem should the application solve?"}
                </label>
                <textarea
                  rows={3}
                  placeholder="Misal: Hamaray food orders abhi phone par manually note hote hain jis se ghalat order aur delivery mein dair hoti hai. Hamein aisi website chahiye jahan customer menu dekhe, items cart mein dale aur order seedha hamein bhej sake."
                  value={problemToSolve}
                  onChange={(e) => setProblemToSolve(e.target.value)}
                  className="w-full bg-white text-xs text-[#101216] px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:border-[#E31E36]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {guideLanguage === "roman-ur" ? "Aapke customers kaun honge? (ikhtiyari)" : "Who will use this application? (Target Audience)"}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Local diners, corporate clients, retail buyers"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="w-full bg-white text-xs text-[#101216] px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:border-[#E31E36]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {guideLanguage === "roman-ur" ? "Aap kya products ya services offer karte hain?" : "What products or services will it offer?"}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Burgers, pizzas, beverages, meal deals"
                    value={productsServices}
                    onChange={(e) => setProductsServices(e.target.value)}
                    className="w-full bg-white text-xs text-[#101216] px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:border-[#E31E36]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {guideLanguage === "roman-ur" ? "Koi pasand ki website hai? Uska link dein (ikhtiyari)." : "Is a similar website available as inspiration? (URL)"}
                  </label>
                  <input
                    type="url"
                    placeholder="e.g. https://example-store.com"
                    value={inspirationUrl}
                    onChange={(e) => setInspirationUrl(e.target.value)}
                    className="w-full bg-white text-xs text-[#101216] px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:border-[#E31E36]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {guideLanguage === "roman-ur" ? "Nayi website chahiye ya purani ko behtar banana hai?" : "Is this a brand new build or an upgrade?"}
                  </label>
                  <select
                    value={isNewOrUpgrade}
                    onChange={(e: any) => setIsNewOrUpgrade(e.target.value)}
                    className="w-full bg-white text-xs text-[#101216] px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:border-[#E31E36]"
                  >
                    <option value="new">Brand New Web Application</option>
                    <option value="upgrade">Upgrade / Redesign of Existing Website</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {guideLanguage === "roman-ur" ? "Website kab tak chahiye? (ikhtiyari)" : "Preferred Launch Date"}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Within 3 weeks / Before next month"
                    value={preferredLaunchDate}
                    onChange={(e) => setPreferredLaunchDate(e.target.value)}
                    className="w-full bg-white text-xs text-[#101216] px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:border-[#E31E36]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {guideLanguage === "roman-ur" ? "Aapka andazati budget" : "Expected Budget Range"}
                  </label>
                  <select
                    value={expectedBudgetRange}
                    onChange={(e) => setExpectedBudgetRange(e.target.value)}
                    className="w-full bg-white text-xs text-[#101216] px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:border-[#E31E36]"
                  >
                    {budgetRangeOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* STEP 4: WEBSITE AND PRODUCT MANAGEMENT */}
        {/* ============================================================== */}
        {currentStep === 3 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-6 animate-fadeIn sm:p-8">
            <div>
              <span className="text-[#E31E36] font-extrabold text-xs uppercase tracking-widest">
                {guideLanguage === "roman-ur" ? "Qadam 3 / 7" : "Step 3 of 7"}
              </span>
              <h2 className="text-2xl font-black text-[#101216] mt-1">
                {guideLanguage === "roman-ur" ? "Products aur online orders" : "Website Content & Product Management"}
              </h2>
              <p className="text-xs text-gray-600 mt-1">
                {guideLanguage === "roman-ur"
                  ? "Sirf woh cheezein chunein jo aapko chahiye. Yaqeen na ho to abhi chhor dein—hum baad mein mil kar tay kar lenge."
                  : "Choose only what you need. If you are unsure, leave the options as they are and we can confirm them together later."}
              </p>
            </div>

            <div className="space-y-4">
              {/* Question A */}
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <span className="text-xs font-bold text-[#101216] block mb-2">
                  {guideLanguage === "roman-ur"
                    ? "Kya aap khud products ya menu website par update karna chahenge?"
                    : "Would you like to update products or your menu on the website yourself?"}
                </span>
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="catalogNeed"
                      checked={needsProductCatalog}
                      onChange={() => {
                        setNeedsProductCatalog(true);
                        setDisplayFixedOnly(false);
                      }}
                      className="accent-[#E31E36]"
                    />
                    <span>
                      {guideLanguage === "roman-ur"
                        ? "Haan, main khud products ya menu add aur update karunga/karungi"
                        : "Yes, I will add and update products or menu items"}
                    </span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="catalogNeed"
                      checked={displayFixedOnly}
                      onChange={() => {
                        setDisplayFixedOnly(true);
                        setNeedsProductCatalog(false);
                      }}
                      className="accent-[#E31E36]"
                    />
                    <span>
                      {guideLanguage === "roman-ur"
                        ? "Nahi, sirf business ki maloomat aur tasveerain dikhani hain"
                        : "No, I only need to show business information and images"}
                    </span>
                  </label>
                </div>
              </div>

              {/* Conditional Product Attributes */}
              {needsProductCatalog && (
                <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
                  <span className="text-xs font-bold text-[#101216] block">
                    {guideLanguage === "roman-ur"
                      ? "Products ke saath kaunsi maloomat dikhani hai? (ikhtiyari)"
                      : "What product details should customers see? (optional)"}
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {[
                      { id: "categories", label: guideLanguage === "roman-ur" ? "Products ki categories" : "Categories & tags" },
                      { id: "variants", label: guideLanguage === "roman-ur" ? "Size, rang ya doosre options" : "Options (size, colour, weight)" },
                      { id: "stock", label: guideLanguage === "roman-ur" ? "Kitna stock baqi hai" : "Stock tracking" },
                      { id: "images", label: guideLanguage === "roman-ur" ? "Products ki zyada tasveerain" : "Multiple product images" },
                      { id: "pricing", label: guideLanguage === "roman-ur" ? "Qeemat aur discount" : "Prices and discounts" },
                    ].map((feat) => (
                      <label
                        key={feat.id}
                        className="flex items-center gap-2 text-gray-700 cursor-pointer p-2 rounded-lg bg-gray-50 border border-gray-200"
                      >
                        <input
                          type="checkbox"
                          checked={productFeatures.includes(feat.id)}
                          onChange={() => toggleProductFeature(feat.id)}
                          className="accent-[#E31E36]"
                        />
                        <span>{feat.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Order management questions */}
              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
                <span className="text-xs font-bold text-[#101216] block">
                  {guideLanguage === "roman-ur"
                    ? "Kya customers website se order bhej sakein?"
                    : "Should customers be able to place orders on the website?"}
                </span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="orderAccept"
                      checked={acceptOrdersOnline}
                      onChange={() => setAcceptOrdersOnline(true)}
                      className="accent-[#E31E36]"
                    />
                    <span>
                      {guideLanguage === "roman-ur"
                        ? "Haan, customer website par order bhejein"
                        : "Yes, customers can place orders online"}
                    </span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="orderAccept"
                      checked={!acceptOrdersOnline}
                      onChange={() => setAcceptOrdersOnline(false)}
                      className="accent-[#E31E36]"
                    />
                    <span>
                      {guideLanguage === "roman-ur"
                        ? "Nahi, customer call ya WhatsApp par rabta karein"
                        : "No, customers will contact us by phone or message"}
                    </span>
                  </label>
                </div>

                {acceptOrdersOnline && (
                  <div className="pt-3 border-t border-gray-100">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-2">
                      {guideLanguage === "roman-ur" ? "Order ke liye kya chahiye?" : "Order options"}
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      {[
                        { id: "cart", label: guideLanguage === "roman-ur" ? "Order ki list (cart)" : "Shopping cart" },
                        { id: "checkout", label: guideLanguage === "roman-ur" ? "Online payment" : "Online checkout" },
                        { id: "coupons", label: guideLanguage === "roman-ur" ? "Coupons aur discounts" : "Coupons & discounts" },
                        { id: "delivery_fees", label: guideLanguage === "roman-ur" ? "Delivery charges aur ilaqay" : "Delivery fees & areas" },
                      ].map((ofeat) => (
                        <label
                          key={ofeat.id}
                          className="flex items-center gap-2 text-gray-700 cursor-pointer p-2 rounded-lg bg-gray-50 border border-gray-200"
                        >
                          <input
                            type="checkbox"
                            checked={orderFeatures.includes(ofeat.id)}
                            onChange={() => toggleOrderFeature(ofeat.id)}
                            className="accent-[#E31E36]"
                          />
                          <span>{ofeat.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* STEP 5: ESTIMATE SO FAR */}
        {/* ============================================================== */}
        {currentStep === 4 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-6 animate-fadeIn sm:p-8">
            <div>
              <span className="text-[#E31E36] font-extrabold text-xs uppercase tracking-widest">
                {guideLanguage === "roman-ur" ? "Qadam 4 / 7" : "Step 4 of 7"}
              </span>
              <h2 className="text-2xl font-black text-[#101216] mt-1">
                {guideLanguage === "roman-ur" ? "Aapka ab tak ka andaza" : "Your estimate so far"}
              </h2>
              <p className="text-xs text-gray-600 mt-1">
                {guideLanguage === "roman-ur"
                  ? "Yeh ab tak aapke chune huay project aur zarooriyat ka andaza hai. Neeche dekhein yeh raqam kis bunyaad par bani hai."
                  : "This is the estimate for the project and requirements you have selected so far. Here is what the estimate is based on."}
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.8fr)]">
              <section className="rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
                <h3 className="text-sm font-extrabold text-[#101216]">
                  {guideLanguage === "roman-ur" ? "Yeh andaza in cheezon ki bunyaad par hai" : "What this estimate is based on"}
                </h3>
                <ul className="mt-3 space-y-3 text-xs leading-relaxed text-gray-700">
                  <li>
                    <strong>{guideLanguage === "roman-ur" ? "Project: " : "Project: "}</strong>
                    {selectedProjectTypes.length > 0
                      ? selectedProjectTypes.join(", ")
                      : guideLanguage === "roman-ur" ? "Abhi select nahi kiya" : "Not selected yet"}
                  </li>
                  {(problemToSolve || plainLanguageNeed).trim() && (
                    <li>
                      <strong>{guideLanguage === "roman-ur" ? "Aapka maqsad: " : "Your goal: "}</strong>
                      {problemToSolve || plainLanguageNeed}
                    </li>
                  )}
                  {targetAudience.trim() && (
                    <li>
                      <strong>{guideLanguage === "roman-ur" ? "Customers: " : "Customers: "}</strong>
                      {targetAudience}
                    </li>
                  )}
                  {productsServices.trim() && (
                    <li>
                      <strong>{guideLanguage === "roman-ur" ? "Products / services: " : "Products / services: "}</strong>
                      {productsServices}
                    </li>
                  )}
                  {selectedPricingPackage && (
                    <li>
                      <strong>{guideLanguage === "roman-ur" ? "Shuruati scope: " : "Starting scope: "}</strong>
                      {isSaasPackageId(selectedPricingPackage)
                        ? SAAS_PACKAGES[selectedPricingPackage].label
                        : ECOMMERCE_PACKAGES[selectedPricingPackage].label}
                      {" · "}
                      {guideLanguage === "roman-ur"
                        ? selectedPricingPackage === "ecommerce_starter"
                          ? "Is starting scope mein product catalog, cart, checkout, admin dashboard aur order workflow shamil hain. Inventory aur advanced integrations alag scope ho sakte hain."
                          : selectedPricingPackage === "ecommerce_business"
                            ? "Starter features ke saath inventory aur advanced product management shamil hain. Custom integrations alag price par hain."
                            : selectedPricingPackage === "ecommerce_advanced"
                              ? "Advanced store workflows shamil hain; final scope ke mutabiq price PKR 200,000 se PKR 300,000 tak ho sakti hai."
                              : selectedPricingPackage === "saas_starter"
                                ? "Multi-vendor marketplace, vendor dashboard, main admin panel, login aur bunyadi analytics shamil hain."
                                : selectedPricingPackage === "saas_business"
                                  ? "Starter ke saath vendor permissions, commission aur order management, sales reports aur payment integration shamil hain."
                                  : "Multi-tenant SaaS, subscriptions, billing, advanced security aur integrations ka scope; final quote tafseel ke baad confirm hoga."
                        : selectedPricingPackage === "ecommerce_starter"
                          ? "Includes a product catalog, cart, checkout, admin dashboard, and order workflow. Inventory and advanced integrations may need extra scope."
                          : selectedPricingPackage === "ecommerce_business"
                            ? "Includes Starter features plus inventory and advanced product management. Custom integrations cost extra."
                            : selectedPricingPackage === "ecommerce_advanced"
                              ? "Advanced store workflows are included; the final scope may range from PKR 200,000 to PKR 300,000."
                              : selectedPricingPackage === "saas_starter"
                                ? "Includes a multi-vendor marketplace, vendor dashboard, main admin panel, login, and basic analytics."
                                : selectedPricingPackage === "saas_business"
                                  ? "Includes Starter scope plus vendor permissions, commission and order management, sales reports, and payment integration."
                                  : "Includes multi-tenant SaaS, subscriptions, billing, advanced security, and integrations; the final quote follows scope review."}
                    </li>
                  )}
                  {selectedProjectTypes.some((type) =>
                    isEcommerceProjectType(type) || type.toLowerCase().includes("restaurant")
                  ) && (
                    <>
                      <li>
                        <strong>{guideLanguage === "roman-ur" ? "Products / menu: " : "Products / menu: "}</strong>
                        {needsProductCatalog
                          ? guideLanguage === "roman-ur"
                            ? `Aap khud update karenge${productFeatures.length
                              ? `; aapne yeh details chuni hain: ${productFeatures.map((feature) => ({
                                categories: "categories",
                                variants: "size/rang ke options",
                                stock: "stock",
                                images: "tasveerain",
                                pricing: "qeemat aur discount",
                              }[feature] || feature)).join(", ")}`
                              : ""}.`
                            : `You will manage the catalog${productFeatures.length
                              ? `; selected details: ${productFeatures.map((feature) => ({
                                categories: "categories",
                                variants: "size/colour options",
                                stock: "stock",
                                images: "images",
                                pricing: "prices and discounts",
                              }[feature] || feature)).join(", ")}`
                              : ""}.`
                          : guideLanguage === "roman-ur"
                            ? "Sirf maloomat aur tasveerain dikhani hain."
                            : "Display business information and images only."}
                      </li>
                      <li>
                        <strong>{guideLanguage === "roman-ur" ? "Online orders: " : "Online orders: "}</strong>
                        {acceptOrdersOnline
                          ? guideLanguage === "roman-ur"
                            ? `Haan${orderFeatures.length
                              ? `; aapne yeh options chune hain: ${orderFeatures.map((feature) => ({
                                cart: "cart",
                                checkout: "online payment",
                                coupons: "coupons aur discounts",
                                delivery_fees: "delivery charges aur ilaqay",
                              }[feature] || feature)).join(", ")}`
                              : ""}.`
                            : `Yes${orderFeatures.length
                              ? `, with ${orderFeatures.map((feature) => ({
                                cart: "a cart",
                                checkout: "online payment",
                                coupons: "coupons and discounts",
                                delivery_fees: "delivery charges and areas",
                              }[feature] || feature)).join(", ")}`
                              : ""}.`
                          : guideLanguage === "roman-ur" ? "Nahi; customer phone ya WhatsApp par rabta karega." : "No; customers will contact you by phone or message."}
                      </li>
                    </>
                  )}
                  {!selectedPricingPackage && (
                    <li>
                      <strong>{guideLanguage === "roman-ur" ? "Admin dashboard: " : "Admin dashboard: "}</strong>
                      {adminPanelType === "client_admin"
                        ? guideLanguage === "roman-ur"
                          ? "Is andazay mein shamil hai; aglay qadam par aap isay rakh ya hata sakte hain."
                          : "Included in this estimate; you can keep or remove it in the next step."
                        : guideLanguage === "roman-ur"
                          ? "Filhal shamil nahi; aglay qadam par admin dashboard add kar sakte hain."
                          : "Not included yet; you can add an admin dashboard in the next step."}
                    </li>
                  )}
                  {calculation.selectedAddonDetails.map((addon) => (
                    <li key={addon.id}>
                      <strong>{guideLanguage === "roman-ur" ? "Pehle se chuna gaya add-on: " : "Preselected add-on: "}</strong>
                      {addon.label}
                      {addon.billingPeriod === "monthly"
                        ? ` · ${guideLanguage === "roman-ur" ? "mahana" : "monthly"}`
                        : ""}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-xl border border-[#E31E36]/20 bg-red-50/50 p-4 sm:p-5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500">
                  {guideLanguage === "roman-ur" ? "Ab tak ka andazati budget" : "Estimated budget so far"}
                </span>
                <strong className="mt-1 block text-3xl font-black text-[#E31E36]">
                  {formatEstimate(calculation.estimatedTotal)}
                </strong>
                <div className="mt-4 space-y-2 border-t border-red-100 pt-3 text-xs">
                  <div className="flex justify-between gap-3 text-gray-700">
                    <span>{selectedPricingPackage
                      ? guideLanguage === "roman-ur" ? "Shuruati package" : "Starting package"
                      : guideLanguage === "roman-ur" ? "Bunyadi website" : "Base website"}</span>
                    <strong>{formatEstimate(calculation.basePrice)}</strong>
                  </div>
                  {calculation.selectedAddonDetails.filter((addon) => addon.billingPeriod !== "monthly").map((addon) => (
                    <div key={addon.id} className="flex justify-between gap-3 text-gray-700">
                      <span>{addon.label}</span>
                      <strong>+{formatEstimate(addon.price)}</strong>
                    </div>
                  ))}
                  {calculation.contingencyAmount > 0 && (
                    <div className="flex justify-between gap-3 text-gray-700">
                      <span>{guideLanguage === "roman-ur" ? "Andazati scope margin" : "Estimated scope allowance"}</span>
                      <strong>+{formatEstimate(calculation.contingencyAmount)}</strong>
                    </div>
                  )}
                  {calculation.monthlyAddonTotal > 0 && (
                    <div className="flex justify-between gap-3 border-t border-red-100 pt-2 text-amber-800">
                      <span>{guideLanguage === "roman-ur" ? "Har mahine ke add-ons" : "Recurring monthly add-ons"}</span>
                      <strong>{formatEstimate(calculation.monthlyAddonTotal)} / {guideLanguage === "roman-ur" ? "mah" : "month"}</strong>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950">
              {guideLanguage === "roman-ur"
                ? "Yeh abhi tak ke intikhabat ka andaza hai, final quote nahi. Aapki requirements review hongi; package mein shamil na hone wali cheezon ki alag price ho sakti hai. Budget zyada lag raha hai to Back ja kar options kam karein. Theek lagay to aglay qadam par mazeed features aur unki prices dekhein—koi extra cheez khud-ba-khud add nahi hogi."
                : "This is an estimate based on your choices so far, not a final quote. Your requirements will be reviewed; features outside the selected package may cost extra. If it is too high, go Back and reduce earlier choices. If acceptable, continue to see optional features and their prices—nothing extra is added automatically."}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* STEP 6: OPTIONAL FEATURES (ADD-ONS) */}
        {/* ============================================================== */}
        {currentStep === 5 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-6 animate-fadeIn sm:p-8">
            <div>
              <span className="text-[#E31E36] font-extrabold text-xs uppercase tracking-widest">
                {guideLanguage === "roman-ur" ? "Qadam 5 / 7" : "Step 5 of 7"}
              </span>
              <h2 className="text-2xl font-black text-[#101216] mt-1">
                {guideLanguage === "roman-ur" ? "Mazeed options" : "Optional features"}
              </h2>
              <p className="text-xs text-gray-600 mt-1">
                {guideLanguage === "roman-ur"
                  ? "Sirf woh extra features chunein jo waqai chahiye. Har option ki price alag dikhai gayi hai; select karne par aapka andaza update hoga."
                  : "Choose only the extras you need. Each option shows its own price, and selecting it updates your estimate."}
              </p>
            </div>

            <section className="rounded-2xl border border-[#E31E36]/20 bg-red-50/40 p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-[#101216]">
                    {guideLanguage === "roman-ur" ? "Aapke business ke liye munasib suggestions" : "Suggestions that may fit your business"}
                  </h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-gray-600">
                    {guideLanguage === "roman-ur"
                      ? `${selectedBusinessCategory?.label || "Aapke project"} ko dekh kar yeh options dikhaye gaye hain. Yeh sirf mashware hain—kuch bhi khud se add nahi hoga. Zaroorat ke mutabiq chunen ya chhor dein.`
                      : `Based on ${selectedBusinessCategory?.label || "your project"}, these optional features may help. Nothing is added automatically; choose only what you need.`}
                  </p>
                </div>
                <div className="shrink-0 rounded-xl bg-[#101216] px-4 py-3 text-white">
                  <span className="block text-[10px] font-bold uppercase text-gray-300">
                    {guideLanguage === "roman-ur" ? "Ab tak ka andaza" : "Estimate so far"}
                  </span>
                  <strong className="mt-0.5 block text-lg font-black">{formatEstimate(calculation.estimatedTotal)}</strong>
                  {calculation.monthlyAddonTotal > 0 && (
                    <span className="mt-1 block text-[10px] text-amber-200">
                      + {formatEstimate(calculation.monthlyAddonTotal)} / {guideLanguage === "roman-ur" ? "mah" : "month"}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                {recommendedAddonsByLevel.map(({ level, addons }) => {
                  const levelDetails = {
                    basic: {
                      title: guideLanguage === "roman-ur" ? "Basic — zaroori sahulat" : "Basic — useful essentials",
                      advice: guideLanguage === "roman-ur"
                        ? "Rozmarra ke bunyadi kaam asaan karne ke liye. Shuruat ke liye in mein se sirf zaroori cheez chunein."
                        : "For everyday essentials. Pick only what would help you get started.",
                    },
                    expanded: {
                      title: guideLanguage === "roman-ur" ? "Expanded — business barhane ke liye" : "Expanded — for a growing business",
                      advice: guideLanguage === "roman-ur"
                        ? "Jab orders, customers ya team barh rahi ho to process sambhalne mein madadgar ho sakte hain."
                        : "May help when your orders, customers, or team are growing.",
                    },
                    complex: {
                      title: guideLanguage === "roman-ur" ? "Complex — advanced zarooriyat" : "Complex — advanced needs",
                      advice: guideLanguage === "roman-ur"
                        ? "Multiple branches ya doosri services ke saath integration jaisi zarooriyat ke liye. Aksar final scope discuss karna hota hai."
                        : "For needs such as multiple branches or integrations; final scope usually needs discussion.",
                    },
                  }[level];
                  const selectedTierTotal = addons.reduce((total, addon) => {
                    const included = getChargeableAddonIds([addon.id], selectedPricingPackage, adminPanelType).length === 0;
                    return total + (selectedAddons.includes(addon.id) && !included ? addon.price : 0);
                  }, 0);

                  return (
                    <section key={level} className="flex flex-col rounded-xl border border-gray-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-extrabold text-[#101216]">{levelDetails.title}</h4>
                          <p className="mt-1 text-[10px] leading-relaxed text-gray-600">{levelDetails.advice}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-[9px] font-extrabold uppercase text-amber-800">
                          {guideLanguage === "roman-ur" ? "Mashwara" : "Suggested"}
                        </span>
                      </div>

                      {addons.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          {addons.map((addon) => {
                            const included = getChargeableAddonIds([addon.id], selectedPricingPackage, adminPanelType).length === 0;
                            const selected = included || selectedAddons.includes(addon.id);
                            const AddonIcon = getAddonIcon(addon.id);
                            return (
                              <label
                                key={addon.id}
                                className={`flex cursor-pointer gap-2.5 rounded-lg border p-2.5 transition ${
                                  included
                                    ? "border-emerald-200 bg-emerald-50"
                                    : selected
                                      ? "border-[#E31E36] bg-red-50/50"
                                      : "border-gray-200 bg-white hover:border-[#E31E36]"
                                }`}
                              >
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-[#E31E36]">
                                  <AddonIcon className="h-4 w-4" aria-hidden="true" />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="flex items-start justify-between gap-2">
                                    <strong className="text-[11px] leading-4 text-[#101216]">{addon.label}</strong>
                                    <strong className={`shrink-0 text-[10px] ${included ? "text-emerald-700" : "text-[#E31E36]"}`}>
                                      {included ? (guideLanguage === "roman-ur" ? "Package mein shamil" : "Included") : `+${formatEstimate(addon.price)}${addon.billingPeriod === "monthly" ? (guideLanguage === "roman-ur" ? "/mah" : "/mo") : ""}`}
                                    </strong>
                                  </span>
                                  <span className="mt-1 block text-[10px] leading-relaxed text-gray-600">
                                    {guideLanguage === "roman-ur"
                                      ? getRomanUrduAddonBenefit(addon.id, addon.label, level)
                                      : addon.description}
                                  </span>
                                  {addon.requiresCustomQuote && (
                                    <span className="mt-1 block text-[9px] font-semibold text-amber-800">
                                      {guideLanguage === "roman-ur"
                                        ? "Is feature ki final price details discuss karne ke baad confirm hogi."
                                        : "Final price for this feature is confirmed after scope discussion."}
                                    </span>
                                  )}
                                  <span className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
                                    <span className="text-[9px] font-bold text-gray-500">
                                      {included
                                        ? guideLanguage === "roman-ur" ? "Package mein pehle se hai" : "Already in package"
                                        : selected
                                          ? guideLanguage === "roman-ur" ? "Andazay mein shamil — hatane ke liye uncheck karein" : "In estimate — uncheck to remove"
                                          : guideLanguage === "roman-ur" ? "Optional — shamil karne ke liye check karein" : "Optional — check to include"}
                                    </span>
                                    <input
                                      type="checkbox"
                                      checked={selected}
                                      disabled={included}
                                      onChange={() => toggleAddon(addon.id)}
                                      className="accent-[#E31E36]"
                                      aria-label={`${guideLanguage === "roman-ur" ? "Add to estimate" : "Add to estimate"}: ${addon.label}`}
                                    />
                                  </span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="mt-3 rounded-lg border border-dashed border-gray-200 p-3 text-[10px] leading-relaxed text-gray-500">
                          {guideLanguage === "roman-ur"
                            ? "Is level ke liye filhal koi relevant add-on available nahi. Neeche tamam options dekh sakte hain."
                            : "No matching add-ons are available at this level. Browse all options below."}
                        </p>
                      )}
                      <div className="mt-auto flex justify-between gap-2 border-t border-gray-100 pt-3">
                        <span className="text-[10px] text-gray-500">
                          {guideLanguage === "roman-ur" ? "Is section se chune gaye add-ons" : "Selected from this set"}
                        </span>
                        <strong className="text-[10px] text-[#E31E36]">
                          {selectedTierTotal > 0
                            ? formatEstimate(selectedTierTotal)
                            : guideLanguage === "roman-ur" ? "Koi select nahi" : "None selected"}
                        </strong>
                      </div>
                    </section>
                  );
                })}
              </div>

              <section className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-extrabold text-[#101216]">
                      {guideLanguage === "roman-ur" ? "Aapke chune huay add-ons ka hisaab" : "Your selected add-ons"}
                    </h4>
                    <p className="mt-1 text-[10px] text-gray-600">
                      {guideLanguage === "roman-ur"
                        ? "Sirf checked options is hisaab mein shamil hain. Koi suggestion lazmi nahi."
                        : "Only checked options are included here. Suggestions are never required."}
                    </p>
                  </div>
                  <strong className="text-sm font-black text-[#E31E36]">
                    {formatEstimate(calculation.estimatedTotal)}
                    {calculation.monthlyAddonTotal > 0 && ` + ${formatEstimate(calculation.monthlyAddonTotal)}/${guideLanguage === "roman-ur" ? "mah" : "mo"}`}
                  </strong>
                </div>
                {calculation.selectedAddonDetails.length > 0 ? (
                  <ul className="mt-3 divide-y divide-gray-100 border-t border-gray-100">
                    {calculation.selectedAddonDetails.map((addon) => (
                      <li key={addon.id} className="flex items-center justify-between gap-3 py-2 text-[10px]">
                        <span className="text-gray-700">{addon.label}{addon.billingPeriod === "monthly" ? ` · ${guideLanguage === "roman-ur" ? "mahana" : "monthly"}` : ""}</span>
                        <strong className="shrink-0 text-gray-900">+{formatEstimate(addon.price)}</strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 border-t border-gray-100 pt-3 text-[10px] text-gray-500">
                    {guideLanguage === "roman-ur"
                      ? "Abhi koi extra paid add-on select nahi. Aapka current estimate sirf pehle chune huay scope ka hai."
                      : "No extra paid add-ons selected. Your estimate is based on the scope chosen so far."}
                  </p>
                )}
              </section>
              <p className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-[10px] leading-relaxed text-blue-950">
                {guideLanguage === "roman-ur"
                  ? "Kisi feature ke faide ya zaroorat ka yaqeen na ho to usay select na karein. Aapke budget aur business ko dekh kar hamari team final discussion mein munasib options samjha degi."
                  : "If you are unsure whether a feature is useful, leave it unchecked. Our team can discuss suitable options for your budget and business before finalizing the scope."}
              </p>
            </section>

            {!selectedPricingPackage ? (
              <section className="rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
                <h3 className="text-sm font-extrabold text-[#101216]">
                  {guideLanguage === "roman-ur" ? "Website ke updates ka control kis ke paas ho?" : "Who should manage website updates?"}
                </h3>
                <p className="mt-1 text-[11px] leading-relaxed text-gray-600">
                  {guideLanguage === "roman-ur"
                    ? "Yeh choice aapke estimate ko badal sakti hai. Aap baad mein bhi isay confirm kar sakte hain."
                    : "This choice can change your estimate. You can confirm it with us later."}
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {([
                    {
                      value: "none" as const,
                      price: pricingConfig.baseWithoutAdmin,
                      title: guideLanguage === "roman-ur" ? "Team website manage kare" : "Our team manages it",
                      detail: guideLanguage === "roman-ur"
                        ? "Aapko admin dashboard nahi milega; updates ke liye hamari team se rabta karein."
                        : "You will not receive an admin dashboard; contact our team for updates.",
                    },
                    {
                      value: "client_admin" as const,
                      price: pricingConfig.baseWithAdmin,
                      title: guideLanguage === "roman-ur" ? "Mujhe admin dashboard chahiye" : "I want an admin dashboard",
                      detail: guideLanguage === "roman-ur"
                        ? "Aap khud website ke content aur available modules manage kar sakenge."
                        : "Manage your website content and available modules yourself.",
                    },
                  ]).map((option) => (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer gap-3 rounded-xl border-2 p-4 transition ${
                        adminPanelType === option.value
                          ? "border-[#E31E36] bg-white shadow-sm"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="adminPanelChoice"
                        checked={adminPanelType === option.value}
                        onChange={() => setAdminPanelType(option.value)}
                        className="mt-1 accent-[#E31E36]"
                      />
                      <span>
                        <strong className="block text-xs text-[#101216]">{option.title}</strong>
                        <span className="mt-1 block text-[11px] leading-relaxed text-gray-600">{option.detail}</span>
                        <strong className="mt-2 block text-sm text-[#E31E36]">{formatEstimate(option.price)}</strong>
                      </span>
                    </label>
                  ))}
                </div>
                {adminPanelType === "client_admin" && (
                  <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
                    <span className="text-xs font-bold text-[#101216]">
                      {guideLanguage === "roman-ur" ? "Dashboard mein kya manage karna hai?" : "What should the dashboard manage?"}
                    </span>
                    <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2 md:grid-cols-3">
                      {adminFeatureOptions.map((option) => (
                        <label key={option.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
                          <input
                            type="checkbox"
                            checked={adminFeatures.includes(option.id)}
                            onChange={() => toggleAdminFeature(option.id)}
                            className="accent-[#E31E36]"
                          />
                          <span className="text-gray-700">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            ) : (
              <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs leading-relaxed text-emerald-950">
                {guideLanguage === "roman-ur"
                  ? "Aapke chune huay starting package mein admin dashboard shamil hai. Neeche diye gaye extra features alag se add kiye ja sakte hain."
                  : "Your selected starting package includes an admin dashboard. Optional features below can be added separately."}
              </section>
            )}

            <details className="rounded-xl border border-gray-200 bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 text-xs font-extrabold text-[#101216]">
                <span>
                  {guideLanguage === "roman-ur" ? "Tamam add-ons dekhein" : "Browse all add-ons"}
                  <span className="mt-1 block text-[10px] font-normal text-gray-500">
                    {guideLanguage === "roman-ur"
                      ? "Agar upar di hui suggestions kaafi nahi, yahan mazeed options aur filters hain."
                      : "Explore more options and filters if the suggestions above are not enough."}
                  </span>
                </span>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[9px] font-bold text-gray-600">
                  {businessAddonCatalog.length + addonOptions.filter((addon) => addon.enabled && addon.category !== "businesscatalog").length}
                </span>
              </summary>
              <div className="space-y-4 border-t border-gray-100 p-4">
            <section className="rounded-xl border border-red-100 bg-white p-4 sm:p-5">
              <div>
                <h3 className="text-sm font-extrabold text-[#101216]">
                  {guideLanguage === "roman-ur" ? "Business ke mutabiq options" : "Business-specific add-ons"}
                </h3>
                <p className="mt-1 text-[11px] leading-5 text-gray-600">
                  {selectedBusinessCategory
                    ? guideLanguage === "roman-ur"
                      ? `${selectedBusinessCategory.label} ke liye options. Business type chun kar list ko aur relevant bana sakte hain.`
                      : `Showing features for ${selectedBusinessCategory.label}. Choose a business type to narrow the results.`
                    : guideLanguage === "roman-ur"
                      ? "Business category aur type chun kar relevant features dekhein."
                      : "Choose a business category and type to browse relevant features."}
                  {" "}{guideLanguage === "roman-ur"
                    ? "Yeh andazati prices hain; complex integration ki final scope discuss karke confirm hogi."
                    : "Prices are estimates; complex integrations and custom-quote features need scope confirmation."}
                </p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-bold text-gray-700">
                  Business category
                  <select
                    value={effectiveBusinessCategoryId}
                    onChange={(event) => {
                      setBusinessCategoryFilter(event.target.value);
                      setBusinessTypeFilter("all");
                    }}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5"
                  >
                    <option value="">{guideLanguage === "roman-ur" ? "Tamam business categories" : "All business categories"}</option>
                    {BUSINESS_CATEGORIES.map((category) => (
                      <option key={category.id} value={category.id}>{category.label}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-bold text-gray-700">
                  Business type
                  <select
                    value={businessTypeFilter}
                    onChange={(event) => setBusinessTypeFilter(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5"
                  >
                    <option value="all">{guideLanguage === "roman-ur" ? "Tamam mutaliqa business types" : "All applicable business types"}</option>
                    {selectedBusinessCategory?.businessTypes.map((type) => (
                      <option key={type.id} value={type.id}>{type.label}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {[
                  ["all", guideLanguage === "roman-ur" ? "Tamam levels" : "All levels"],
                  ["basic", guideLanguage === "roman-ur" ? "Basic" : "Basic"],
                  ["expanded", guideLanguage === "roman-ur" ? "Expanded" : "Expanded"],
                  ["complex", guideLanguage === "roman-ur" ? "Complex" : "Complex"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={businessLevelFilter === value}
                    onClick={() => setBusinessLevelFilter(value)}
                    className={`rounded-full border px-3 py-1.5 text-[10px] font-bold ${
                      businessLevelFilter === value
                        ? "border-[#E31E36] bg-[#E31E36] text-white"
                        : "border-gray-300 bg-white text-gray-600"
                    }`}
                  >
                    {label}
                  </button>
                ))}
                <label className="min-w-[180px] flex-1">
                  <span className="sr-only">{guideLanguage === "roman-ur" ? "Business add-ons talash karein" : "Search business add-ons"}</span>
                  <input
                    value={businessAddonSearch}
                    onChange={(event) => setBusinessAddonSearch(event.target.value)}
                    placeholder={guideLanguage === "roman-ur" ? "Kisi feature ko talash karein" : "Search business add-ons"}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs"
                  />
                </label>
                <span className="text-[10px] text-gray-500">{filteredBusinessAddons.length} features</span>
              </div>
              {filteredBusinessAddons.length === 0 ? (
                <p className="mt-4 rounded-lg border border-dashed border-gray-300 p-4 text-xs text-gray-500">
                  {guideLanguage === "roman-ur"
                    ? "In filters ke saath koi add-on nahi mila. Doosri category, level ya search lafz chunein."
                    : "No business add-ons match these filters. Choose another category, level, or search term."}
                </p>
              ) : (
                <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredBusinessAddons.map((addon) => {
                    const isIncluded = getChargeableAddonIds(
                      [addon.id], selectedPricingPackage, adminPanelType
                    ).length === 0;
                    const isSelected = selectedAddons.includes(addon.id);
                    const AddonIcon = getAddonIcon(addon.id);
                    return (
                      <label
                        key={`${addon.categoryId}-${addon.id}`}
                        className={`flex cursor-pointer flex-col justify-between rounded-xl border p-4 transition ${
                          isIncluded
                            ? "border-emerald-200 bg-emerald-50"
                            : isSelected
                              ? "border-[#E31E36] bg-red-50/40 ring-1 ring-[#E31E36]"
                              : "border-gray-200 bg-white hover:border-[#E31E36]"
                        }`}
                      >
                        <span className="flex items-start justify-between gap-2">
                          <span className="flex gap-2">
                            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-[#E31E36]">
                              <AddonIcon className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <span>
                              <span className="block text-[10px] font-extrabold uppercase tracking-wide text-gray-500">
                                {guideLanguage === "roman-ur"
                                  ? `${addon.level === "basic" ? "Basic" : addon.level === "expanded" ? "Expanded" : "Complex"} · ${addon.origin === "new" ? "naya feature" : "maujooda feature"}`
                                  : `${addon.level} · ${addon.origin}`}
                              </span>
                              <strong className="mt-1 block text-xs text-[#101216]">{addon.label}</strong>
                            </span>
                          </span>
                          <strong className={`shrink-0 text-[11px] ${isIncluded ? "text-emerald-700" : "text-[#E31E36]"}`}>
                            {isIncluded
                              ? guideLanguage === "roman-ur" ? "Package mein shamil" : "Included"
                              : formatEstimate(addon.price)}
                          </strong>
                        </span>
                        <span className="mt-2 flex-1 text-[10px] leading-4 text-gray-600">
                          {guideLanguage === "roman-ur"
                            ? getRomanUrduAddonBenefit(addon.id, addon.label, addon.level)
                            : addon.description}
                        </span>
                        {addon.requiresCustomQuote && (
                          <span className="mt-2 text-[10px] font-semibold text-amber-800">
                            {guideLanguage === "roman-ur"
                              ? "Yeh andazati raqam hai; final price scope discuss karne ke baad tay hogi."
                              : "Custom scope quotation required; displayed amount is indicative."}
                          </span>
                        )}
                        <span className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2 text-[10px] font-bold">
                          <span className={isIncluded ? "text-emerald-700" : isSelected ? "text-[#E31E36]" : "text-gray-500"}>
                            {isIncluded
                              ? guideLanguage === "roman-ur" ? "Chune huay package mein shamil" : "Included in selected package"
                              : isSelected
                                ? guideLanguage === "roman-ur" ? "Andazay mein shamil" : "Added to estimate"
                                : guideLanguage === "roman-ur" ? "Optional — shamil karne ke liye check karein" : "Optional — add to estimate"}
                          </span>
                          <input
                            type="checkbox"
                            checked={isIncluded || isSelected}
                            disabled={isIncluded}
                            onChange={() => { if (!isIncluded) toggleAddon(addon.id); }}
                            className="accent-[#E31E36]"
                          />
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </section>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="text-sm font-extrabold text-[#101216]">
                {guideLanguage === "roman-ur" ? "Doosre common add-ons" : "Shared add-ons"}
              </h3>
              <p className="mt-1 text-[11px] text-gray-600">
                {guideLanguage === "roman-ur"
                  ? "Website, business tools, online store, SaaS aur security ke doosre options neeche dekh sakte hain."
                  : "Browse the existing website, business tools, commerce, SaaS, automation, security, and industry add-ons below."}
              </p>
            </div>

            {scanFeatures.length > 0 && (
              <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <h3 className="text-xs font-extrabold text-emerald-950">URL scan features to record with this inquiry</h3>
                <ul className="mt-2 space-y-1.5">
                  {scanFeatures.map((feature, index) => (
                    <li key={`${feature.title}-${index}`} className="text-[11px] leading-relaxed text-emerald-900">
                      <strong>{feature.title}:</strong> {feature.evidence}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="space-y-3">
              {Object.entries(groupedAddonOptions).map(([category, categoryAddons], categoryIndex) => (
                <details key={category} open={categoryIndex === 0} className="rounded-lg border border-gray-200 bg-white">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-xs font-extrabold text-[#101216]">
                    <span>{guideLanguage === "roman-ur" ? ({
                      "Database & Authentication": "Database aur login",
                      "E-commerce & Payments": "Online store aur payments",
                      "Business Tools & Admin": "Business tools aur admin",
                      "AI & Automation": "AI aur automatic kaam",
                      "Website & Design": "Website aur design",
                      "Website Images & Video": "Website tasveerain aur video",
                      "SaaS & Multi-Vendor": "SaaS aur multi-vendor",
                      "Security & Reliability": "Security aur bharosemandi",
                      "Industry-Specific": "Business ke khaas features",
                      "Real Estate & PropertyTech": "Property aur real estate",
                    }[category] || category) : category}</span>
                    <span className="text-[10px] font-semibold text-gray-500">
                      {categoryAddons.length} {guideLanguage === "roman-ur" ? "options" : "add-ons"}
                    </span>
                  </summary>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 border-t border-gray-100 p-3">
              {categoryAddons.map((addon) => {
                const isIncluded = getChargeableAddonIds([addon.id], selectedPricingPackage, adminPanelType).length === 0;
                const isSelected = selectedAddons.includes(addon.id);
                const AddonIcon = getAddonIcon(addon.id);
                return (
                  <div
                    key={addon.id}
                    onClick={() => { if (!isIncluded) toggleAddon(addon.id); }}
                    className={`p-4 rounded-xl border-2 transition flex flex-col justify-between ${
                      isIncluded
                        ? "bg-emerald-50 border-emerald-200"
                        : isSelected
                        ? "bg-white border-[#E31E36] shadow-sm ring-1 ring-[#E31E36]"
                        : "bg-white/70 hover:bg-white border-gray-200 cursor-pointer"
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] uppercase font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          {guideLanguage === "roman-ur" ? "Optional feature" : addon.category}
                        </span>
                        <strong className={`text-xs font-black ${isIncluded ? "text-emerald-700" : "text-[#E31E36]"}`}>
                          {isIncluded
                            ? guideLanguage === "roman-ur" ? "Package mein shamil" : "Included"
                            : `+${formatEstimate(addon.price)}${addon.billingPeriod === "monthly" ? guideLanguage === "roman-ur" ? " / mahana" : " / month" : ""}`}
                        </strong>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-[#E31E36]">
                          <AddonIcon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span>
                          <h4 className="font-extrabold text-xs text-[#101216] mb-1">{addon.label}</h4>
                          <p className="text-[11px] text-gray-600 leading-relaxed">
                            {guideLanguage === "roman-ur"
                              ? getRomanUrduAddonBenefit(addon.id, addon.label, addon.pricingLevel || "basic")
                              : addon.description}
                          </p>
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                      <span className={isIncluded ? "text-emerald-700 font-bold" : isSelected ? "text-[#E31E36] font-bold" : "text-gray-400"}>
                        {isIncluded
                          ? guideLanguage === "roman-ur" ? "✓ Package mein shamil" : "✓ Included in Package"
                          : isSelected
                            ? guideLanguage === "roman-ur" ? "✓ Andazay mein shamil" : "✓ Added to Estimate"
                            : guideLanguage === "roman-ur" ? "+ Zaroorat ho to shamil karein" : "+ Add if needed"}
                      </span>
                      <input
                        type="checkbox"
                        checked={isIncluded || isSelected}
                        disabled={isIncluded}
                        onChange={() => {}} // handled by parent div
                        className="accent-[#E31E36]"
                      />
                    </div>
                  </div>
                );
              })}
                  </div>
                </details>
              ))}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                {guideLanguage === "roman-ur" ? "Koi khaas feature chahiye? (ikhtiyari)" : "Any other feature you need? (optional)"}
              </label>
              <textarea
                rows={3}
                placeholder={guideLanguage === "roman-ur"
                  ? "Misal: Order confirm hote hi customer ko WhatsApp message bhejna hai ya roz ke orders ki Excel report chahiye. Khaas service ki integration ho to uska naam batayein; final scope aur kisi paid provider ki fees alag confirm hongi."
                  : "For example: send customers a WhatsApp message when an order is confirmed, or provide a daily Excel report. Name any service integration you need; final scope and provider fees are confirmed separately."}
                value={customFeatureNotes}
                onChange={(e) => setCustomFeatureNotes(e.target.value)}
                className="w-full bg-white text-xs text-[#101216] px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:border-[#E31E36]"
              />
            </div>
              </div>
            </details>
          </div>
        )}

        {/* ============================================================== */}
        {/* STEP 7: ESTIMATED BUDGET & PAYMENT SCHEDULE */}
        {/* ============================================================== */}
        {currentStep === 6 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-6 animate-fadeIn sm:p-8">
            <div>
              <span className="text-[#E31E36] font-extrabold text-xs uppercase tracking-widest">
                Step 6 of 7
              </span>
              <h2 className="text-2xl font-black text-[#101216] mt-1">
                Your Estimated Development Budget & Payment Plan
              </h2>
              <p className="text-xs text-gray-600 mt-1">
                Review the exact transparent breakdown generated dynamically from your selected project scope.
              </p>
            </div>

            {/* Pricing Summary Card */}
            <div className="bg-white rounded-2xl border border-gray-300 p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                <div>
                  <span className="text-xs font-bold text-gray-500">Base Application Architecture</span>
                  <p className="text-xs text-gray-700">
                    {adminPanelType === "client_admin"
                      ? "Package 2: With Dedicated Client Admin Dashboard Support"
                      : "Package 1: Without Client Admin Support (Durrani Managed)"}
                  </p>
                </div>
                <strong className="text-sm font-black text-[#101216]">
                  {formatEstimate(calculation.basePrice)}
                </strong>
              </div>

              {/* Selected Add-ons list */}
              {calculation.selectedAddonDetails.length > 0 && (
                <div className="space-y-2 pb-3 border-b border-gray-200 text-xs">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                    Selected Add-on Integrations:
                  </span>
                  {calculation.selectedAddonDetails.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-gray-700">
                      <span>• {item.label}</span>
                      <strong className="text-gray-900 font-bold">
                        +{formatEstimate(item.price)}
                        {item.billingPeriod === "monthly" ? " / month" : ""}
                      </strong>
                    </div>
                  ))}
                </div>
              )}
              {calculation.monthlyAddonTotal > 0 && (
                <div className="flex justify-between items-center text-xs text-amber-800">
                  <span>Recurring add-ons (billed monthly)</span>
                  <strong>+{formatEstimate(calculation.monthlyAddonTotal)} / month</strong>
                </div>
              )}

              {/* Total Row */}
              <div className="flex justify-between items-baseline pt-2">
                <div>
                  <span className="text-xs uppercase font-extrabold text-[#E31E36] tracking-wider block">
                    One-Time Development Estimate
                  </span>
                  <span className="text-xs text-gray-500">
                    (Estimated total for complete development)
                  </span>
                </div>
                <span className="text-3xl font-black text-[#E31E36]">
                  {formatEstimate(calculation.estimatedTotal)}
                </span>
              </div>
            </div>

            {/* Illustrative 12-Month Payment Schedule */}
            <div className="bg-[#101216] text-white p-6 rounded-2xl border border-gray-800 shadow-card-dark space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#E31E36]" />
                <h3 className="font-extrabold text-sm text-white">
                  Illustrative 12-Month Payment Arrangement
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="bg-[#181B20] p-4 rounded-xl border border-gray-700">
                  <span className="text-gray-400 block mb-1">Advance Payment (at start):</span>
                  <strong className="text-lg font-black text-white">
                    {formatEstimate(calculation.advanceAmount)}
                  </strong>
                </div>

                <div className="bg-[#181B20] p-4 rounded-xl border border-gray-700">
                  <span className="text-gray-400 block mb-1">Remaining Balance:</span>
                  <strong className="text-lg font-black text-white">
                    {formatEstimate(calculation.remainingBalance)}
                  </strong>
                </div>

                <div className="bg-[#181B20] p-4 rounded-xl border border-gray-700">
                  <span className="text-gray-400 block mb-1">10 Monthly Installments:</span>
                  <strong className="text-lg font-black text-[#E31E36]">
                    {formatEstimate(calculation.regularInstallment)} / mo
                  </strong>
                  <span className="text-[10px] text-gray-400 block mt-1">
                    (Final 11th adjusted: {formatEstimate(calculation.finalInstallment)})
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-gray-400 leading-relaxed italic">
                * Illustrative schedule. Payments are made via JazzCash, EasyPaisa, or direct Bank Transfer. Advance is verified prior to development kickoff.
              </p>
            </div>

            {/* Estimate Disclaimer Checkbox */}
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-900 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={disclaimerAccepted}
                  onChange={(e) => setDisclaimerAccepted(e.target.checked)}
                  className="mt-1 accent-[#E31E36] w-4 h-4 rounded"
                />
                <span className="leading-relaxed">
                  <strong>Estimate Disclaimer Acceptance:</strong> I understand that this figure is an accurate dynamic estimate based on my selected preferences, and not a finalized contract. Durrani Web Developers will review my specific requirements personally, confirm the formal delivery timeline and scope on WhatsApp, and provide the official quotation before project kickoff.
                </span>
              </label>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* STEP 8: CONFIRMATION & ORDER SUBMISSION SUCCESS */}
        {/* ============================================================== */}
        {currentStep === 8 && submittedInquiry && (
          <div className="bg-white p-8 sm:p-12 rounded-3xl border border-gray-300 shadow-xl text-center space-y-6 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="text-xs font-extrabold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full">
                Inquiry Successfully Logged
              </span>
              <h2 className="text-3xl font-black text-[#101216] mt-2">
                Thank You, {submittedInquiry.customerName}!
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 max-w-lg mx-auto mt-1">
                Your web application requirements and estimate have been saved. Keep this reference for follow-up.
              </p>
              <p role="status" className="text-xs text-gray-600 mt-2">
                {submittedInquiry.whatsappConfirmation === "sent"
                  ? "WhatsApp confirmation sent to your number."
                  : submittedInquiry.whatsappConfirmationConsent
                    ? "Your reference is saved below. WhatsApp could not be delivered automatically; you can send it to our team using the button."
                    : "Your reference is saved below. You can send it to our team on WhatsApp using the button."}
              </p>
            </div>

            {/* Reference Box */}
            <div className="max-w-md mx-auto bg-[#F4F5F7] p-5 rounded-2xl border border-gray-300 flex items-center justify-between">
              <div className="text-left">
                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">
                  Your Inquiry Reference Code:
                </span>
                <span className="text-2xl font-black text-[#E31E36]">
                  {submittedInquiry.id}
                </span>
              </div>
              <button
                type="button"
                onClick={copyReferenceToClipboard}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 bg-white hover:bg-gray-100 px-3 py-2 rounded-xl border border-gray-300 transition"
              >
                {copiedRef ? (
                  <>
                    <CheckCheck className="w-4 h-4 text-emerald-600" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Copy Ref
                  </>
                )}
              </button>
            </div>

            {/* Summary Highlights */}
            <div className="max-w-md mx-auto bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Estimated Total:</span>
                <strong className="text-[#101216] font-bold">
                  {formatCurrency(submittedCalculation.estimatedTotal, submittedCurrency, locale)}
                </strong>
              </div>
              {(submittedCalculation.monthlyAddonTotal || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Monthly Add-ons:</span>
                  <strong className="text-[#101216] font-bold">
                    {formatCurrency(submittedCalculation.monthlyAddonTotal, submittedCurrency, locale)} / month
                  </strong>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Initial Advance:</span>
                <strong className="text-[#101216] font-bold">
                  {formatCurrency(submittedCalculation.advanceAmount, submittedCurrency, locale)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Selected Package:</span>
                <strong className="text-[#E31E36] font-bold">
                  {submittedPricingPackage
                    ? submittedPricingPackage.startsWith("ecommerce_")
                      ? ECOMMERCE_PACKAGES[submittedPricingPackage as keyof typeof ECOMMERCE_PACKAGES].label
                      : SAAS_PACKAGES[submittedPricingPackage as keyof typeof SAAS_PACKAGES].label
                    : submittedInquiry.adminPanelType === "client_admin" ? "With Client Admin" : "Without Admin"}
                </strong>
              </div>
            </div>

            {/* Next Steps Card */}
            <div className="max-w-lg mx-auto text-xs text-gray-600 text-left bg-blue-50/60 p-4 rounded-xl border border-blue-200 space-y-1.5">
              <strong className="text-blue-900 block font-bold">What happens next?</strong>
              <p>1. Our team reviews your questionnaire response and technical specifications.</p>
              <p>2. We will contact you via WhatsApp ({submittedInquiry.phone}) to finalize delivery dates and confirm quotation.</p>
              <p>3. Once agreed, your advance payment is verified and development commences.</p>
            </div>

            {/* Direct WhatsApp Callout Action */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href={buildWhatsAppLink(
                  `Assalam-o-Alaikum Durrani Web Developers! My project inquiry was submitted successfully. Reference: ${submittedInquiry.id}. Project: "${submittedInquiry.businessName || submittedInquiry.customerName}". Estimated ${formatCurrency(submittedCalculation.estimatedTotal, submittedCurrency, locale)}. Please confirm receipt.`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-7 py-3.5 rounded-xl font-bold text-xs shadow-lg transition"
              >
                <MessageSquare className="w-4 h-4" />
                Send Reference to DWD on WhatsApp ({BUSINESS_INFO.phoneDisplay})
              </a>

              <Link
                href={`/payment?reference=${submittedInquiry.id}`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-[#101216] px-6 py-3.5 rounded-xl font-bold text-xs border border-gray-300 transition"
              >
                View Payment Options
              </Link>
            </div>
            <p role="status" className="text-center text-xs text-gray-500">
              Customer tracking is currently unavailable. Contact DWD directly for status updates.
            </p>
          </div>
        )}

        {/* Bottom Back / Next Navigation Controls */}
        {currentStep < 8 && (
          <div className="mt-8 flex items-center justify-between pt-6 border-t border-gray-200">
            {currentStep > 0 ? (
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-[#101216] bg-white px-5 py-2.5 rounded-xl border border-gray-300 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                {currentStep === 1 ? "Change plan" : "Back"}
              </button>
            ) : (
              <div />
            )}

            {currentStep < 7 ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 text-xs font-bold text-white bg-[#E31E36] hover:bg-[#C8162D] px-6 py-3 rounded-xl shadow-glow transition"
              >
                {guideLanguage === "roman-ur"
                  ? currentStep === 6
                    ? "Aakhri qadam: rabtay ki maloomat"
                    : currentStep === 4
                      ? "Mazeed options dekhein"
                      : currentStep === 5 ? "Mera updated andaza dekhein" : "Agla qadam"
                  : currentStep === 6
                    ? "Continue to contact details"
                    : currentStep === 5 ? "Review updated estimate" : `Continue: ${stepsList[currentStep]}`}
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 text-xs font-bold text-white bg-[#E31E36] hover:bg-[#C8162D] px-8 py-3.5 rounded-xl shadow-glow transition disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Submitting Requirements...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Project Inquiry & Get Reference
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CalculatorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FFFFFF] flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 border-4 border-[#E31E36] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-gray-500 font-bold">Loading interactive budget calculator...</p>
          </div>
        </div>
      }
    >
      <CalculatorContent />
    </Suspense>
  );
}
