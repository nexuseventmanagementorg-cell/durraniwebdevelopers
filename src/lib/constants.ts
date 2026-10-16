import { AddonOption, PricingRuleConfig, CalculationBreakdown } from "./types";

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

export function buildWhatsAppLinkTo(phone: string, message: string): string | null {
  const trimmedPhone = phone.trim();
  let recipient = trimmedPhone.replace(/\D/g, "");
  if (trimmedPhone.startsWith("00")) recipient = recipient.slice(2);
  else if (!trimmedPhone.startsWith("+") && recipient.startsWith("0")) {
    recipient = `92${recipient.slice(1)}`;
  }

  if (!/^\d{8,15}$/.test(recipient)) return null;
  return `https://wa.me/${recipient}?text=${encodeURIComponent(message)}`;
}

export function formatPKR(amount: number): string {
  return `PKR ${amount.toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function defineAddon(
  id: string,
  label: string,
  category: AddonOption["category"],
  price: number,
  description: string,
  billingPeriod: AddonOption["billingPeriod"] = "one_time"
): AddonOption {
  return { id, label, category, price, description, enabled: true, billingPeriod };
}

export const EXTENDED_ADDONS: AddonOption[] = [
  defineAddon("responsive_design", "Responsive Design Enhancement", "website", 10000, "Additional mobile, tablet, and desktop layout optimization."),
  defineAddon("cms", "Content Management System (CMS)", "website", 15000, "Edit website pages, text, banners, and images without code."),
  defineAddon("advanced_seo", "Advanced SEO Setup", "website", 10000, "Page metadata, sitemap, canonical URLs, and applicable structured data."),
  defineAddon("multilingual_support", "Multi-language Support", "website", 15000, "Language switching and translated content for supported locales."),
  defineAddon("email_notifications", "Email Notifications", "website", 10000, "Email notifications for contact forms, inquiries, and agreed website events."),
  defineAddon("theme_switcher", "Dark / Light Mode", "website", 10000, "Selectable color theme with a saved user preference."),

  defineAddon("admin_dashboard", "Admin Dashboard", "business", 15000, "Manage website data, records, and settings from a protected dashboard."),
  defineAddon("user_accounts", "User Registration & Login", "business", 10000, "Customer accounts with secure registration and sign-in workflows."),
  defineAddon("role_permissions", "Role-Based Permissions", "business", 15000, "Separate admin, manager, staff, and customer access levels."),
  defineAddon("media_uploads", "File & Media Uploads", "business", 10000, "Upload and manage images, videos, PDFs, and documents."),
  defineAddon("search_filter_sort", "Search, Filters & Sorting", "business", 10000, "Find and organize records, products, and content."),
  defineAddon("order_invoice_management", "Order & Invoice Management", "business", 15000, "Manage order statuses and generate customer invoices and receipts."),
  defineAddon("activity_logs", "Activity Logs", "business", 15000, "Record important actions performed by users and administrators."),
  defineAddon("pdf_excel_export", "PDF / Excel Export", "business", 10000, "Export business records and reports to PDF or spreadsheet formats."),
  defineAddon("automated_backups", "Automated Backups", "business", 15000, "Scheduled database backup workflow and restore planning."),
  defineAddon("audit_trail", "Audit Trail", "business", 20000, "Detailed record of who changed important data and when."),
  defineAddon("api_integration", "API Integration", "business", 15000, "Exchange data with an agreed external service; complex integrations are scoped separately."),

  defineAddon("advanced_product_management", "Advanced Product Management", "ecommerce", 15000, "Manage product variants, SKUs, stock, and product attributes."),
  defineAddon("inventory_management", "Inventory Management", "ecommerce", 15000, "Track stock quantities and configure low-stock alerts."),
  defineAddon("discount_coupons", "Discount & Coupon System", "ecommerce", 10000, "Create promotional codes and apply discount rules to orders."),
  defineAddon("wishlist", "Wishlist", "ecommerce", 10000, "Let customers save products to revisit later."),
  defineAddon("product_reviews", "Product Reviews & Ratings", "ecommerce", 10000, "Collect product ratings and provide review moderation."),
  defineAddon("shipping_rules", "Shipping & Delivery Rules", "ecommerce", 15000, "Calculate delivery charges by area, weight, or order total."),
  defineAddon("order_tracking", "Order Tracking", "ecommerce", 15000, "Show customers order status and tracking information."),
  defineAddon("abandoned_cart", "Abandoned Cart Recovery", "ecommerce", 20000, "Create a recovery workflow for unfinished shopping carts."),
  defineAddon("invoice_receipts", "Invoice & Receipt Generator", "ecommerce", 10000, "Generate downloadable PDF order invoices and receipts."),
  defineAddon("product_qr_codes", "Product QR Codes", "ecommerce", 10000, "Generate product QR codes and printable labels."),
  defineAddon("loyalty_rewards", "Customer Loyalty / Rewards", "ecommerce", 20000, "Reward repeat customers with points and loyalty benefits."),
  defineAddon("bulk_product_import", "Bulk Product Import", "ecommerce", 15000, "Import and update product catalogs from CSV or Excel files."),
  defineAddon("product_comparison", "Product Comparison", "ecommerce", 10000, "Compare selected products and their attributes side by side."),
  defineAddon("multi_warehouse", "Multiple Warehouses", "ecommerce", 30000, "Track stock across multiple storage locations; final scope may vary."),

  defineAddon("multi_tenant_architecture", "Multi-Tenant Architecture", "saas", 50000, "Separate business workspaces and enforce tenant data boundaries."),
  defineAddon("subscription_plans", "Subscription & Plan Management", "saas", 30000, "Configure Free, Basic, Pro, or Enterprise plans, limits, and status."),
  defineAddon("usage_metering", "Usage Limits & Metering", "saas", 20000, "Track users, storage, products, API calls, or usage credits."),
  defineAddon("saas_super_admin", "Super Admin Panel", "saas", 25000, "Manage platform businesses, users, plans, and account status."),
  defineAddon("vendor_management", "Vendor Management System", "saas", 30000, "Manage seller registration, shop profiles, listings, and orders."),
  defineAddon("commission_payouts", "Commission & Payout Management", "saas", 25000, "Calculate seller commissions, payable balances, and settlements."),
  defineAddon("team_invitations", "Team Members & Invitations", "saas", 15000, "Invite team members and assign workspace roles."),
  defineAddon("white_label", "White-Label Branding", "saas", 25000, "Configure supported client-specific logos, colors, and branding."),
  defineAddon("automated_onboarding", "Automated Onboarding", "saas", 15000, "Guide new accounts through setup steps and initial configuration."),
  defineAddon("trial_expiry", "Trial Periods & Plan Expiry", "saas", 15000, "Configure trial windows, expiration states, and plan transitions."),
  defineAddon("referral_affiliate", "Referral / Affiliate System", "saas", 25000, "Track referral links, attribution, and agreed reward rules."),
  defineAddon("usage_based_billing", "Usage-Based Billing Calculations", "saas", 30000, "Calculate charges from configured usage metrics and billing rules."),
  defineAddon("tenant_domains", "Tenant-Specific Custom Domains", "saas", 30000, "Connect and manage approved custom domains for tenant workspaces."),
  defineAddon("data_import_export", "Data Import / Export Tools", "saas", 15000, "Move tenant data through agreed import and export formats."),
  defineAddon("feature_flags", "Feature Flags & Plan-Based Access", "saas", 20000, "Control features and access according to account plans."),
  defineAddon("in_app_notifications", "In-App Notifications", "saas", 10000, "Show account and workflow notifications inside the application."),
  defineAddon("support_tickets", "Support Ticket System", "saas", 20000, "Create and manage customer support requests and responses."),
  defineAddon("knowledge_base", "Customer Help Center / Knowledge Base", "saas", 15000, "Publish searchable help articles and customer guidance."),
  defineAddon("platform_audit_monitoring", "Platform-Wide Audit & Monitoring", "saas", 25000, "Track platform-wide operational events and important changes."),

  defineAddon("ai_product_recommendations", "AI Product Recommendations", "ai", 25000, "Suggest products based on configured customer interest signals."),
  defineAddon("ai_content_assistant", "AI Content Assistant", "ai", 15000, "Generate product descriptions and content drafts with an AI provider."),
  defineAddon("smart_search", "Smart Search", "ai", 20000, "Improve search relevance across supported site content."),
  defineAddon("automated_email_workflows", "Automated Email Workflows", "automation", 15000, "Send agreed order, reminder, and follow-up email sequences."),
  defineAddon("scheduled_reports", "Scheduled Reports", "automation", 15000, "Generate and deliver recurring daily, weekly, or monthly reports."),
  defineAddon("document_generation", "Document / PDF Generation", "automation", 10000, "Generate project-specific invoices, certificates, and reports."),
  defineAddon("third_party_webhooks", "Third-Party Webhooks", "automation", 15000, "Send agreed event notifications between connected systems."),
  defineAddon("crm_integration", "CRM Integration", "automation", 20000, "Synchronize agreed lead and customer data with a CRM provider."),
  defineAddon("calendar_integration", "Calendar Integration", "automation", 15000, "Synchronize supported bookings with an external calendar."),

  defineAddon("two_factor_auth", "Two-Factor Authentication", "security", 15000, "Add a second verification step to supported sign-in workflows."),
  defineAddon("login_rate_limiting", "Login Rate Limiting", "security", 10000, "Limit repeated login attempts to reduce abuse."),
  defineAddon("password_reset", "Password Reset Workflow", "security", 10000, "Provide secure account password recovery."),
  defineAddon("session_management", "Session Management", "security", 15000, "Manage active sessions and provide session logout controls."),
  defineAddon("security_hardening", "Security Hardening", "security", 20000, "Harden application configuration according to the agreed scope."),
  defineAddon("error_monitoring", "Error Monitoring Integration", "security", 15000, "Connect an agreed monitoring provider to track application errors."),
  defineAddon("performance_optimization", "Performance Optimization", "security", 15000, "Improve agreed page loading, query, and rendering bottlenecks."),
  defineAddon("accessibility_improvements", "Accessibility Improvements", "security", 15000, "Improve keyboard access and accessibility for agreed workflows."),
  defineAddon("data_retention_tools", "Data Retention / Deletion Tools", "security", 15000, "Configure data cleanup and deletion workflows."),
  defineAddon("maintenance_updates", "Maintenance & Updates", "security", 15000, "Agreed fixes and updates during a monthly maintenance period.", "monthly"),

  defineAddon("restaurant_qr_menu", "Restaurant Digital Menu & QR Codes", "industry", 10000, "Publish a digital restaurant menu with scannable item or table QR codes."),
  defineAddon("kitchen_order_tickets", "Kitchen Order Ticket (KOT)", "industry", 20000, "Route and track restaurant orders through a kitchen ticket workflow."),
  defineAddon("table_reservations", "Restaurant Table Reservations", "industry", 15000, "Let customers request and manage table reservations."),
  defineAddon("clinic_appointments", "Clinic Appointment Scheduling", "industry", 15000, "Accept and manage clinic appointments."),
  defineAddon("staff_schedules", "Doctor / Staff Schedules", "industry", 15000, "Manage availability and schedules for doctors or staff."),
  defineAddon("school_attendance", "School Attendance Management", "industry", 20000, "Record and review student attendance."),
  defineAddon("parent_student_portal", "Parent / Student Portal", "industry", 25000, "Provide parents and students with a dedicated information portal."),
  defineAddon("property_filters", "Advanced Property Filters", "industry", 10000, "Filter property listings by agreed characteristics and criteria."),
  defineAddon("real_estate_agent_dashboard", "Real Estate Agent Dashboard", "industry", 20000, "Give agents a workspace for property listings and lead follow-up."),
  defineAddon("booking_calendar", "Booking Availability Calendar", "industry", 15000, "Display availability and accept booking requests."),
  defineAddon("booking_refund_workflow", "Booking Cancellation / Refund Workflow", "industry", 20000, "Manage booking cancellations and agreed refund states."),
  defineAddon("employer_dashboard", "Job Portal Employer Dashboard", "industry", 20000, "Allow employers to manage company profiles and job listings."),
  defineAddon("cv_application_tracking", "CV Upload & Application Tracking", "industry", 20000, "Accept CV uploads and track job application status."),
  defineAddon("course_progress", "Education Course Progress Tracking", "industry", 20000, "Track learner progress through courses and lessons."),
  defineAddon("quizzes_assessments", "Quizzes & Assessments", "industry", 25000, "Create quizzes and review learner assessment results."),
  defineAddon("event_ticketing", "Digital Tickets & QR Check-In", "industry", 20000, "Issue event tickets and validate entry with QR check-in."),
];

export const ADDON_CATEGORY_LABELS: Record<AddonOption["category"], string> = {
  auth: "Database & Authentication",
  database: "Database & Authentication",
  payment: "E-commerce & Payments",
  admin: "Business Tools & Admin",
  ai: "AI & Automation",
  custom: "Business Tools & Admin",
  feature: "Website & Design",
  website: "Website & Design",
  business: "Business Tools & Admin",
  ecommerce: "E-commerce & Payments",
  saas: "SaaS & Multi-Vendor",
  automation: "AI & Automation",
  security: "Security & Reliability",
  industry: "Industry-Specific",
};

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
    ...Object.fromEntries(EXTENDED_ADDONS.map((addon) => [addon.id, addon])),
  },
};

export function mergePricingConfigWithDefaults(
  config?: Partial<PricingRuleConfig> | null
): PricingRuleConfig {
  return {
    ...DEFAULT_PRICING_CONFIG,
    ...config,
    addons: {
      ...DEFAULT_PRICING_CONFIG.addons,
      ...(config?.addons || {}),
    },
  };
}

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
  ecommerce_business: ["supabase_db", "payment_gateway", "admin_dashboard", "advanced_product_management", "inventory_management", "order_invoice_management"],
  ecommerce_advanced: ["supabase_db", "payment_gateway", "advanced_dashboard", "admin_dashboard", "advanced_product_management", "inventory_management", "order_invoice_management"],
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
  packageId?: PricingPackageId | null,
  adminPanelType?: "none" | "client_admin"
): string[] {
  const includedAddons = new Set(packageId ? PACKAGE_INCLUDED_ADDONS[packageId] : []);
  if (adminPanelType === "client_admin") includedAddons.add("admin_dashboard");
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
  const selectedDetails: CalculationBreakdown["selectedAddonDetails"] = [];
  let addonsTotal = 0;
  let monthlyAddonTotal = 0;

  for (const id of uniqueAddonIds) {
    const addon = pricingConfig.addons[id];
    if (addon && addon.enabled) {
      if (addon.billingPeriod === "monthly") monthlyAddonTotal += addon.price;
      else addonsTotal += addon.price;
      selectedDetails.push({
        id: addon.id,
        label: addon.label,
        price: addon.price,
        billingPeriod: addon.billingPeriod || "one_time",
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
    monthlyAddonTotal,
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
