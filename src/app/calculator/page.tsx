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
} from "lucide-react";

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
    if (!languageOverridden) setGuideLanguage(currency === "PKR" ? "roman-ur" : "en");
  }, [currency, languageOverridden]);

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
  const package1Calculation = useMemo(
    () => calculateBudget("none", [], pricingConfig),
    [pricingConfig]
  );
  const package2Calculation = useMemo(
    () => calculateBudget("client_admin", [], pricingConfig),
    [pricingConfig]
  );
  const budgetRangeOptions = useMemo(
    () => [
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
    [formatPrice]
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
    .filter((addon) => addon.enabled)
    .reduce<Record<string, AddonOption[]>>((groups, addon) => {
      const category = ADDON_CATEGORY_LABELS[addon.category];
      (groups[category] ||= []).push(addon);
      return groups;
    }, {});

  // Toggle helpers
  const toggleProjectType = (type: string) => {
    const next = selectedProjectTypes.includes(type)
      ? (selectedProjectTypes.length > 1
        ? selectedProjectTypes.filter((item) => item !== type)
        : selectedProjectTypes)
      : [...selectedProjectTypes, type];
    setSelectedProjectTypes(next);
    const projectPackage = next
      .map(getDefaultPricingPackageForProjectType)
      .find((packageId) => packageId !== null) || null;
    if (projectPackage?.startsWith("ecommerce_")) {
      setSelectedPricingPackage((current) => current?.startsWith("ecommerce_") ? current : projectPackage);
      setAdminPanelType("client_admin");
      setExpectedBudgetRange((current) => current === "ecommerce-advanced" ? current : "ecommerce-business");
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
    if (step === 1) {
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
    if (step === 2) {
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
      ? ["Rabtay ki maloomat", "Project ki qisam", "Zaroorat aur masla", "Products aur orders", "Admin panel", "Mazeed options", "Andazati budget", "Tasdeeq"]
      : ["Customer Info", "Project Type", "Scope & Problem", "Products & Orders", "Admin Panel", "Advanced Add-ons", "Estimated Budget", "Confirmation"]),
  ];
  const guideGoalOptions = [
    { id: "business-site" as const, title: "Show my business and get enquiries", titleRoman: "Business dikhana aur customers se rabta lena", detail: "Tell people what you do and let them contact you.", detailRoman: "Logon ko apni services batayein aur rabtay ka rasta dein.", icon: Briefcase },
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
  const selectedIsEcommerce = selectedPricingPackage?.startsWith("ecommerce_") ?? false;
  const selectablePricingPackages: PricingPackageId[] = selectedIsEcommerce
    ? Object.keys(ECOMMERCE_PACKAGES) as PricingPackageId[]
    : Object.keys(SAAS_PACKAGES) as PricingPackageId[];

  if (currentStep === 0) {
    return (
      <div className="min-h-screen bg-white text-[#101216]">
        <section className="border-b border-[#242830] bg-[#101216] py-10 text-white sm:py-14">
          <div className="mx-auto max-w-5xl space-y-4 px-4 text-center sm:px-6 lg:px-8">
            <span className="inline-flex rounded-md border border-[#E31E36]/40 bg-[#242830] px-3 py-1 text-[11px] font-bold uppercase text-red-300">
              {guideCopy.start}
            </span>
            <h1 className="text-3xl font-black sm:text-4xl">{guideCopy.headline}</h1>
            <p className="mx-auto max-w-2xl text-sm leading-relaxed text-gray-300">
              {guideCopy.intro}
            </p>
            <div role="group" aria-label="Guide language" className="inline-flex overflow-hidden rounded-md border border-gray-600">
              <button type="button" aria-pressed={guideLanguage === "roman-ur"} onClick={() => { setGuideLanguage("roman-ur"); setLanguageOverridden(true); }} className={`px-3 py-1.5 text-[11px] font-bold ${guideLanguage === "roman-ur" ? "bg-white text-[#101216]" : "text-gray-300 hover:bg-white/10"}`}>Roman Urdu</button>
              <button type="button" aria-pressed={guideLanguage === "en"} onClick={() => { setGuideLanguage("en"); setLanguageOverridden(true); }} className={`border-l border-gray-600 px-3 py-1.5 text-[11px] font-bold ${guideLanguage === "en" ? "bg-white text-[#101216]" : "text-gray-300 hover:bg-white/10"}`}>English</button>
            </div>
          </div>
        </section>

        <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <section>
            <h2 className="text-lg font-extrabold">{guideCopy.goalHeading}</h2>
            <p className="mt-1 text-xs text-gray-600">{guideCopy.goalHint}</p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {guideGoalOptions.map((option) => {
                const Icon = option.icon;
                const selected = guideGoal === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setGuideGoal(option.id)}
                    className={`flex min-h-24 items-start gap-3 rounded-xl border p-4 text-left transition ${selected ? "border-[#E31E36] bg-red-50 ring-1 ring-[#E31E36]" : "border-gray-200 bg-white hover:border-gray-400"}`}
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
            </div>
          </section>

          <section>
            <h2 className="text-lg font-extrabold">{guideCopy.budgetHeading}</h2>
            <p className="mt-1 text-xs text-gray-600">{guideCopy.help}</p>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {guideBudgetOptions.map((option) => {
                const selected = guideBudget === option.id;
                return (
                  <label key={option.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition ${selected ? "border-[#E31E36] bg-red-50" : "border-gray-200 bg-white hover:border-gray-400"}`}>
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

          <section className="border-y border-gray-200 py-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase text-gray-500">{guideCopy.recommendation}</span>
                <h2 className="mt-1 text-xl font-black">{guidePlan.title}</h2>
                <p className="mt-1 text-xs text-gray-600">{guideCopy.confirm}</p>
              </div>
              <div className="min-w-44 rounded-lg bg-[#101216] px-4 py-3 text-white">
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
          </section>

          <section className="border-b border-gray-200 pb-6">
            <h2 className="text-base font-extrabold">{guideCopy.contactHeading}</h2>
            <p className="mt-1 text-xs leading-relaxed text-gray-600">{guideCopy.contactHint}</p>
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
          </section>

          <div className="flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
            <button type="button" onClick={() => void handleSkipGuide()} className="px-2 py-3 text-xs font-bold text-gray-600 underline decoration-gray-300 underline-offset-4 hover:text-[#101216]">
              {guideCopy.skip}
            </button>
            <button type="button" onClick={handleStartWithGuidePlan} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#E31E36] px-6 py-3.5 text-sm font-extrabold text-white transition hover:bg-[#C8162D]">
              {guideCopy.continue} <ArrowRight className="h-4 w-4" />
            </button>
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
            {guideLanguage === "roman-ur" ? "Website ka budget aur zaroorat" : "Interactive Web App Budget Calculator"}
          </h1>
          <p className="text-xs sm:text-sm text-gray-300 max-w-xl mx-auto">
            {guideLanguage === "roman-ur"
              ? "Chand sawalon ke jawab dein. Andazati total, advance aur mahana qist saamne aa jayegi."
              : "Answer a few quick questions to see a transparent project estimate and payment schedule."}
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
            <span>Step {currentStep} of 8: <strong className="text-[#101216]">{stepsList[currentStep - 1]}</strong></span>
            <span>{Math.round((currentStep / 8) * 100)}% Completed</span>
          </div>
          <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#E31E36] to-red-500 h-full transition-all duration-300 ease-out"
              style={{ width: `${(currentStep / 8) * 100}%` }}
            />
          </div>

          {/* Step Pill Indicators */}
          <div className="hidden md:flex justify-between mt-3 text-[10px] font-semibold text-gray-400">
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
          <div className="bg-[#101216] text-white p-4 rounded-xl border border-gray-800 mb-8 flex flex-wrap items-center justify-between gap-4 shadow-card-dark">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#E31E36] flex items-center justify-center text-white">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                  Live Dynamic Estimate
                </span>
                <span className="text-xl font-black text-white">
                  {formatEstimate(calculation.estimatedTotal)}
                </span>
                {calculation.monthlyAddonTotal > 0 && (
                  <span className="block text-[10px] text-amber-300">
                    + {formatEstimate(calculation.monthlyAddonTotal)} / month recurring
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="bg-[#181B20] px-3 py-1.5 rounded-lg border border-gray-700">
                <span className="text-gray-400">Advance: </span>
                <strong className="text-white font-bold">{formatEstimate(calculation.advanceAmount)}</strong>
              </div>
              <div className="bg-[#181B20] px-3 py-1.5 rounded-lg border border-gray-700">
                <span className="text-gray-400">11 Installments: </span>
                <strong className="text-[#E31E36] font-bold">{formatEstimate(calculation.regularInstallment)}/mo</strong>
              </div>
              <div className="bg-[#181B20] px-3 py-1.5 rounded-lg border border-gray-700 hidden sm:block">
                <span className="text-gray-400">Daily: </span>
                <strong className="text-gray-200">{formatEstimate(calculation.dailyCost)}/day</strong>
              </div>
            </div>
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
        {currentStep === 1 && (
          <div className="bg-[#F4F5F7] p-6 sm:p-8 rounded-2xl border border-gray-200 space-y-6 animate-fadeIn">
            <div>
              <span className="text-[#E31E36] font-extrabold text-xs uppercase tracking-widest">
                {guideLanguage === "roman-ur" ? "Qadam 1 / 8" : "Step 1 of 8"}
              </span>
              <h2 className="text-2xl font-black text-[#101216] mt-1">
                {guideLanguage === "roman-ur" ? "Aap aur aapke business ki maloomat" : "Your Contact & Business Details"}
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
        {currentStep === 2 && (
          <div className="bg-[#F4F5F7] p-6 sm:p-8 rounded-2xl border border-gray-200 space-y-6 animate-fadeIn">
            <div>
              <span className="text-[#E31E36] font-extrabold text-xs uppercase tracking-widest">
                {guideLanguage === "roman-ur" ? "Qadam 2 / 8" : "Step 2 of 8"}
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
        {currentStep === 3 && (
          <div className="bg-[#F4F5F7] p-6 sm:p-8 rounded-2xl border border-gray-200 space-y-6 animate-fadeIn">
            <div>
              <span className="text-[#E31E36] font-extrabold text-xs uppercase tracking-widest">
                {guideLanguage === "roman-ur" ? "Qadam 3 / 8" : "Step 3 of 8"}
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
        {currentStep === 4 && (
          <div className="bg-[#F4F5F7] p-6 sm:p-8 rounded-2xl border border-gray-200 space-y-6 animate-fadeIn">
            <div>
              <span className="text-[#E31E36] font-extrabold text-xs uppercase tracking-widest">
                Step 4 of 8
              </span>
              <h2 className="text-2xl font-black text-[#101216] mt-1">
                Website Content & Product Management
              </h2>
              <p className="text-xs text-gray-600 mt-1">
                Configure whether you need active product catalogs, shopping carts, or fixed informational layouts.
              </p>
            </div>

            <div className="space-y-4">
              {/* Question A */}
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <span className="text-xs font-bold text-[#101216] block mb-2">
                  Will the application display fixed content only or need editable products?
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
                    <span>Yes, business will add and manage products / catalog items</span>
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
                    <span>No, static portfolio / informational content only</span>
                  </label>
                </div>
              </div>

              {/* Conditional Product Attributes */}
              {needsProductCatalog && (
                <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
                  <span className="text-xs font-bold text-[#101216] block">
                    Which product attributes do you need?
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {[
                      { id: "categories", label: "Categories & tags" },
                      { id: "variants", label: "Variants (Size, Color, Weight)" },
                      { id: "stock", label: "Stock & inventory tracking" },
                      { id: "images", label: "Multi-image gallery upload" },
                      { id: "pricing", label: "Discounted & sale prices" },
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
                  Will customers place orders or request quotes online?
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
                    <span>Yes, customers will order directly online</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="orderAccept"
                      checked={!acceptOrdersOnline}
                      onChange={() => setAcceptOrdersOnline(false)}
                      className="accent-[#E31E36]"
                    />
                    <span>No, inquiries/calls only</span>
                  </label>
                </div>

                {acceptOrdersOnline && (
                  <div className="pt-3 border-t border-gray-100">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-2">
                      Ordering & Checkout Features Needed:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      {[
                        { id: "cart", label: "Shopping cart" },
                        { id: "checkout", label: "Online checkout" },
                        { id: "coupons", label: "Coupons & discounts" },
                        { id: "delivery_fees", label: "Delivery fees & areas" },
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
        {/* STEP 5: ADMIN PANEL REQUIREMENTS */}
        {/* ============================================================== */}
        {currentStep === 5 && (
          <div className="bg-[#F4F5F7] p-6 sm:p-8 rounded-2xl border border-gray-200 space-y-6 animate-fadeIn">
            <div>
              <span className="text-[#E31E36] font-extrabold text-xs uppercase tracking-widest">
                Step 5 of 8
              </span>
              <h2 className="text-2xl font-black text-[#101216] mt-1">
                {selectedPricingPackage
                  ? `Choose Your ${selectedIsEcommerce ? "E-Commerce" : "SaaS"} Package`
                  : "Admin Panel & System Management Access"}
              </h2>
              <p className="text-xs text-gray-600 mt-1">
                {selectedPricingPackage
                  ? selectedIsEcommerce
                    ? "Each store plan includes a client admin dashboard and core shopping workflows; included features and add-on rates vary by plan."
                    : "Choose a SaaS marketplace plan. Each plan includes its listed platform, vendor-management, and administration features; Enterprise is a starting price."
                  : "Choose whether you need a dedicated client dashboard or prefer our team to manage backend updates exclusively."}
              </p>
            </div>

            {selectedPricingPackage ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {selectablePricingPackages.map((packageId) => {
                  const packageDetails = selectedIsEcommerce
                    ? ECOMMERCE_PACKAGES[packageId as keyof typeof ECOMMERCE_PACKAGES]
                    : SAAS_PACKAGES[packageId as keyof typeof SAAS_PACKAGES];
                  const packageConfig = getPackagePricingConfig(packageId);
                  const packageCalculation = calculateBudget("client_admin", [], packageConfig);
                  const isSelected = selectedPricingPackage === packageId;
                  return (
                    <button
                      key={packageId}
                      type="button"
                      onClick={() => {
                        setSelectedPricingPackage(packageId);
                        setAdminPanelType("client_admin");
                        setExpectedBudgetRange(packageId.replace("_", "-"));
                      }}
                      className={`text-left p-5 rounded-2xl border-2 transition flex flex-col justify-between ${
                        isSelected
                          ? "bg-white border-[#E31E36] shadow-glow ring-1 ring-[#E31E36]"
                          : "bg-white/60 hover:bg-white border-gray-200"
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-center mb-3 gap-2">
                          <span className="text-xs font-black uppercase tracking-wider text-[#E31E36] bg-red-100 px-3 py-0.5 rounded-full">
                            {packageDetails.label}
                          </span>
                          <strong className="text-base font-black text-[#E31E36]">
                            {formatEstimate(packageConfig.baseWithAdmin)}
                            {packageId === "ecommerce_advanced" && <> – {formatPrice(ECOMMERCE_PACKAGES.ecommerce_advanced.maximumPrice)}</>}
                            {"startingAt" in packageDetails && packageDetails.startingAt && "+"}
                          </strong>
                        </div>
                        <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                          {packageId === "ecommerce_starter"
                            ? "A focused online store with an essential catalog, cart, checkout, admin dashboard, and order workflow."
                            : packageId === "ecommerce_business"
                            ? "Professional online store, shopping cart, secure checkout, client admin dashboard, inventory, and order management. Starting package price."
                            : packageId === "ecommerce_advanced"
                              ? "Advanced store workflows, analytics, gateway and courier integrations, and custom features. Starting price; final scope is PKR 200,000–300,000."
                              : packageId === "saas_starter"
                                ? "Multi-vendor marketplace, vendor registration and dashboard, main admin panel, authentication, basic analytics, and responsive design."
                                : packageId === "saas_business"
                                  ? "Everything in Starter, plus vendor permissions, commission and order management, sales analytics, payment integration, and advanced administration."
                                  : "Enterprise multi-tenant SaaS with advanced vendor/customer management, subscriptions, billing, complex orders, security, integrations, and dedicated support."}
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                        <span className="text-gray-500">
                          Advance {formatEstimate(packageConfig.advanceDefault)}; then 11 installments from:
                        </span>
                        <strong className="text-[#E31E36] font-bold">
                          {formatEstimate(packageCalculation.regularInstallment)} / mo
                        </strong>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
            /* Comparison Cards */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option A: No Admin Panel */}
              <div
                onClick={() => setAdminPanelType("none")}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                  adminPanelType === "none"
                    ? "bg-white border-[#101216] shadow-md ring-1 ring-[#101216]"
                    : "bg-white/60 hover:bg-white border-gray-200"
                }`}
              >
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-black uppercase tracking-wider text-gray-500 bg-gray-100 px-3 py-0.5 rounded-full">
                      Package 1
                    </span>
                    <strong className="text-base font-black text-[#101216]">{formatEstimate(pricingConfig.baseWithoutAdmin)} base</strong>
                  </div>
                  <h3 className="font-black text-sm text-[#101216]">
                    Without Client Admin Panel Support
                  </h3>
                  <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                    Durrani Web Developers maintains the backend administration exclusively for you. You do not receive admin dashboard credentials. Product updates and catalog adjustments are not included and may incur additional charges; request them via developer support.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-gray-500">11 monthly installments of:</span>
                  <strong className="text-[#101216] font-bold">{formatEstimate(package1Calculation.regularInstallment)} / mo</strong>
                </div>
              </div>

              {/* Option B: With Client Admin Panel */}
              <div
                onClick={() => setAdminPanelType("client_admin")}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                  adminPanelType === "client_admin"
                    ? "bg-white border-[#E31E36] shadow-glow ring-1 ring-[#E31E36]"
                    : "bg-white/60 hover:bg-white border-gray-200"
                }`}
              >
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-black uppercase tracking-wider text-[#E31E36] bg-red-100 px-3 py-0.5 rounded-full">
                      Package 2 (Recommended)
                    </span>
                    <strong className="text-base font-black text-[#E31E36]">{formatEstimate(pricingConfig.baseWithAdmin)} base</strong>
                  </div>
                  <h3 className="font-black text-sm text-[#101216]">
                    With Client Admin Panel Support
                  </h3>
                  <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                    You receive full, independent client dashboard credentials. Add/edit products, manage orders, update inventory stock, view customer records, and export reports autonomously.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-gray-500">11 monthly installments of:</span>
                  <strong className="text-[#E31E36] font-bold">{formatEstimate(package2Calculation.regularInstallment)} / mo</strong>
                </div>
              </div>
            </div>
            )}

            {/* Dashboard Feature Picker if Client Admin chosen */}
            {!selectedPricingPackage && adminPanelType === "client_admin" && (
              <div className="bg-white p-5 rounded-xl border border-gray-200 space-y-3">
                <span className="text-xs font-bold text-[#101216] block">
                  Select Dashboard Modules Required:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
                  {adminFeatureOptions.map((opt) => (
                    <label
                      key={opt.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-200 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={adminFeatures.includes(opt.id)}
                        onChange={() => toggleAdminFeature(opt.id)}
                        className="accent-[#E31E36]"
                      />
                      <span className="text-gray-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* STEP 6: ADVANCED FEATURES (ADD-ONS) */}
        {/* ============================================================== */}
        {currentStep === 6 && (
          <div className="bg-[#F4F5F7] p-6 sm:p-8 rounded-2xl border border-gray-200 space-y-6 animate-fadeIn">
            <div>
              <span className="text-[#E31E36] font-extrabold text-xs uppercase tracking-widest">
                Step 6 of 8
              </span>
              <h2 className="text-2xl font-black text-[#101216] mt-1">
                Optional Advanced Features & Add-ons
              </h2>
              <p className="text-xs text-gray-600 mt-1">
                Add-on prices vary by feature complexity and selected e-commerce or SaaS plan. E-commerce add-ons start at PKR 20,000. Personal domain setup is PKR 10,000; registrar purchase and renewal fees are separate. Monthly maintenance is shown separately.
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
                    <span>{category}</span>
                    <span className="text-[10px] font-semibold text-gray-500">{categoryAddons.length} add-ons</span>
                  </summary>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 border-t border-gray-100 p-3">
              {categoryAddons.map((addon) => {
                const isIncluded = getChargeableAddonIds([addon.id], selectedPricingPackage, adminPanelType).length === 0;
                const isSelected = selectedAddons.includes(addon.id);
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
                          {addon.category}
                        </span>
                        <strong className={`text-xs font-black ${isIncluded ? "text-emerald-700" : "text-[#E31E36]"}`}>
                          {isIncluded
                            ? "Included"
                            : `+${formatEstimate(addon.price)}${addon.billingPeriod === "monthly" ? " / month" : ""}`}
                        </strong>
                      </div>
                      <h4 className="font-extrabold text-xs text-[#101216] mb-1">
                        {addon.label}
                      </h4>
                      <p className="text-[11px] text-gray-600 leading-relaxed">
                        {addon.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                      <span className={isIncluded ? "text-emerald-700 font-bold" : isSelected ? "text-[#E31E36] font-bold" : "text-gray-400"}>
                        {isIncluded ? "✓ Included in Package" : isSelected ? "✓ Added to Estimate" : "+ Click to Add"}
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
                Custom Advanced Feature Notes (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Misal: Order confirm hote hi customer ko WhatsApp par message bhejna hai aur roz ke orders ki report Excel mein chahiye. Agar kisi khaas service ki integration chahiye to uska naam likhein. Hum external API/account ya paid subscription provide nahi karte; zaroorat par aapko provider se khud arrange karna hoga."
                value={customFeatureNotes}
                onChange={(e) => setCustomFeatureNotes(e.target.value)}
                className="w-full bg-white text-xs text-[#101216] px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:border-[#E31E36]"
              />
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* STEP 7: ESTIMATED BUDGET & PAYMENT SCHEDULE */}
        {/* ============================================================== */}
        {currentStep === 7 && (
          <div className="bg-[#F4F5F7] p-6 sm:p-8 rounded-2xl border border-gray-200 space-y-6 animate-fadeIn">
            <div>
              <span className="text-[#E31E36] font-extrabold text-xs uppercase tracking-widest">
                Step 7 of 8
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
                Continue to Step {currentStep + 1}
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
