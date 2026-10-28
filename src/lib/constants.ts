import { AddonOption, PricingRuleConfig, CalculationBreakdown } from "./types";
import { BUSINESS_ADDON_DEFINITIONS, buildBusinessCatalogAddons } from "./business-addon-catalog";

export const BUSINESS_INFO = {
  name: "Durrani Web Developers",
  shortName: "DWD",
  tagline: "Ideas | Code | Real Solutions",
  headline: "We Turn Your Ideas Into Powerful Web Applications",
  subHeadline: "Your Vision, Our Development",
  email: "durraniwebdevelopers@gmail.com",
  phone: "+923054359098",
  phoneDisplay: "+923054359098",
  whatsappInternational: "923054359098",
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

export const FEATURE_ADDON_PRICE_PKR = 10000;

function defineAddon(
  id: string,
  label: string,
  category: AddonOption["category"],
  price: number,
  description: string,
  billingPeriod: AddonOption["billingPeriod"] = "one_time"
): AddonOption {
  return {
    id,
    label,
    category,
    price: billingPeriod === "monthly" ||
    category === "creative" ||
    category === "ecommerce" ||
      category === "saas" ||
      category === "propertytech" ||
      category === "businesscatalog" ||
      id === "kitchen_order_tickets"
      ? price
      : FEATURE_ADDON_PRICE_PKR,
    description,
    enabled: true,
    billingPeriod,
  };
}

export const EXTENDED_ADDONS: AddonOption[] = [
  defineAddon("personal_domain", "Personal Domain Setup (.com, .pk, etc.)", "website", FEATURE_ADDON_PRICE_PKR, "Configure a personal domain for the website. Domain registration and renewal fees charged by the registrar are separate."),
  defineAddon("responsive_design", "Responsive Design Enhancement", "website", 10000, "Additional mobile, tablet, and desktop layout optimization."),
  defineAddon("cms", "Content Management System (CMS)", "website", 15000, "Edit website pages, text, banners, and images without code."),
  defineAddon("advanced_seo", "Advanced SEO Setup", "website", 10000, "Page metadata, sitemap, canonical URLs, and applicable structured data."),
  defineAddon("multilingual_support", "Multi-language Support", "website", 15000, "Language switching and translated content for supported locales."),
  defineAddon("email_notifications", "Email Notifications", "website", 10000, "Email notifications for contact forms, inquiries, and agreed website events."),
  defineAddon("theme_switcher", "Dark / Light Mode", "website", 10000, "Selectable color theme with a saved user preference."),

  defineAddon("admin_dashboard", "Admin Dashboard", "business", 15000, "Manage website data, records, and settings from a protected dashboard."),
  defineAddon("daily_sales_records", "Daily Sales Records", "business", 10000, "Record and review daily restaurant sales from the admin panel."),
  defineAddon("daily_sales_calendar", "Daily Sales Calendar", "business", 10000, "Browse daily sales records by selecting a report date in the admin panel."),
  defineAddon("monthly_credit_accounts", "Customer Monthly Credit Accounts", "business", FEATURE_ADDON_PRICE_PKR, "Manage monthly customer credit accounts, recorded payments, and outstanding balances."),
  defineAddon("csv_data_export", "Order CSV Export", "business", FEATURE_ADDON_PRICE_PKR, "Download restaurant order records as CSV files."),
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

  defineAddon("advanced_product_management", "Advanced Product Management", "ecommerce", 40000, "Manage product variants, SKUs, stock, and product attributes."),
  defineAddon("inventory_management", "Inventory Management", "ecommerce", 30000, "Track stock quantities and configure low-stock alerts."),
  defineAddon("discount_coupons", "Discount & Coupon System", "ecommerce", 25000, "Create promotional codes and apply discount rules to orders."),
  defineAddon("wishlist", "Wishlist", "ecommerce", 20000, "Let customers save products to revisit later."),
  defineAddon("product_reviews", "Product Reviews & Ratings", "ecommerce", 25000, "Collect product ratings and provide review moderation."),
  defineAddon("shipping_rules", "Shipping & Delivery Rules", "ecommerce", 40000, "Calculate delivery charges by area, weight, or order total."),
  defineAddon("order_tracking", "Order Tracking", "ecommerce", 25000, "Show customers order status and tracking information."),
  defineAddon("abandoned_cart", "Abandoned Cart Recovery", "ecommerce", 50000, "Create a recovery workflow for unfinished shopping carts."),
  defineAddon("invoice_receipts", "Invoice & Receipt Generator", "ecommerce", 25000, "Generate downloadable PDF order invoices and receipts."),
  defineAddon("product_qr_codes", "Product QR Codes", "ecommerce", 20000, "Generate product QR codes and printable labels."),
  defineAddon("loyalty_rewards", "Customer Loyalty / Rewards", "ecommerce", 50000, "Reward repeat customers with points and loyalty benefits."),
  defineAddon("bulk_product_import", "Bulk Product Import", "ecommerce", 35000, "Import and update product catalogs from CSV or Excel files."),
  defineAddon("product_comparison", "Product Comparison", "ecommerce", 25000, "Compare selected products and their attributes side by side."),
  defineAddon("multi_warehouse", "Multiple Warehouses", "ecommerce", 80000, "Track stock across multiple storage locations; final scope may vary."),

  defineAddon("multi_tenant_architecture", "Multi-Tenant Architecture", "saas", 180000, "Separate business workspaces and enforce tenant data boundaries."),
  defineAddon("subscription_plans", "Subscription & Plan Management", "saas", 120000, "Configure Free, Basic, Pro, or Enterprise plans, limits, and status."),
  defineAddon("usage_metering", "Usage Limits & Metering", "saas", 90000, "Track users, storage, products, API calls, or usage credits."),
  defineAddon("saas_super_admin", "Super Admin Panel", "saas", 125000, "Manage platform businesses, users, plans, and account status."),
  defineAddon("vendor_management", "Vendor Management System", "saas", 150000, "Manage seller registration, shop profiles, listings, and orders."),
  defineAddon("commission_payouts", "Commission & Payout Management", "saas", 100000, "Calculate seller commissions, payable balances, and settlements."),
  defineAddon("team_invitations", "Team Members & Invitations", "saas", 60000, "Invite team members and assign workspace roles."),
  defineAddon("white_label", "White-Label Branding", "saas", 100000, "Configure supported client-specific logos, colors, and branding."),
  defineAddon("automated_onboarding", "Automated Onboarding", "saas", 60000, "Guide new accounts through setup steps and initial configuration."),
  defineAddon("trial_expiry", "Trial Periods & Plan Expiry", "saas", 50000, "Configure trial windows, expiration states, and plan transitions."),
  defineAddon("referral_affiliate", "Referral / Affiliate System", "saas", 90000, "Track referral links, attribution, and agreed reward rules."),
  defineAddon("usage_based_billing", "Usage-Based Billing Calculations", "saas", 140000, "Calculate charges from configured usage metrics and billing rules."),
  defineAddon("tenant_domains", "Tenant-Specific Custom Domains", "saas", 80000, "Connect and manage approved custom domains for tenant workspaces."),
  defineAddon("data_import_export", "Data Import / Export Tools", "saas", 70000, "Move tenant data through agreed import and export formats."),
  defineAddon("feature_flags", "Feature Flags & Plan-Based Access", "saas", 70000, "Control features and access according to account plans."),
  defineAddon("in_app_notifications", "In-App Notifications", "saas", 50000, "Show account and workflow notifications inside the application."),
  defineAddon("support_tickets", "Support Ticket System", "saas", 80000, "Create and manage customer support requests and responses."),
  defineAddon("knowledge_base", "Customer Help Center / Knowledge Base", "saas", 50000, "Publish searchable help articles and customer guidance."),
  defineAddon("platform_audit_monitoring", "Platform-Wide Audit & Monitoring", "saas", 125000, "Track platform-wide operational events and important changes."),

  defineAddon("ai_product_recommendations", "AI Product Recommendations", "ai", 25000, "Suggest products based on configured customer interest signals."),
  defineAddon("ai_content_assistant", "AI Content Assistant", "ai", 15000, "Generate product descriptions and content drafts with an AI provider."),
  defineAddon("smart_search", "Smart Search", "ai", 20000, "Improve search relevance across supported site content."),
  defineAddon("custom_image_editing", "Custom Image Editing & Optimization", "creative", 15000, "Prepare and customize agreed customer-supplied website images, including crop, resize, and web optimization. Image rights and source files must be provided or approved by the customer."),
  defineAddon("ai_generated_images", "AI-Generated Website Images", "creative", 20000, "Create an agreed set of custom AI-generated website visuals, subject to customer review. Third-party generation and licensing costs, if any, are separate."),
  defineAddon("ai_product_images", "AI-Generated Product & Menu Images", "creative", 20000, "Create an agreed set of AI-assisted product or menu visuals for the customer's website, subject to product accuracy and customer approval."),
  defineAddon("ai_generated_video", "AI-Generated Website Video", "creative", 40000, "Create an agreed short AI-assisted video asset for the customer's website, subject to review. Third-party generation and licensing costs, if any, are separate."),
  defineAddon("promotional_ad_video", "Promotional / Advertisement Video", "creative", 30000, "Produce an agreed short promotional video from approved brand assets and messaging for the customer's campaign."),
  defineAddon("hero_video_section", "Website Hero Video Section", "creative", 15000, "Add a responsive, performance-conscious hero video section with poster image and reduced-motion fallback. The video asset is separate unless included in scope."),
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
  defineAddon("kitchen_order_tickets", "Kitchen Order Ticket (KOT)", "industry", 20000, "Prepare and print kitchen tickets and customer receipts from order details."),
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

  defineAddon("property_listing_management", "Advanced Property Listing Management", "propertytech", 35000, "Create, edit, archive, and manage property listings with structured details, pricing, location, property type, purpose, and listing status."),
  defineAddon("property_submission_wizard", "Property Listing Submission Wizard", "propertytech", 25000, "A guided multi-step form for owners and agents to submit property details, pricing, location, descriptions, and media."),
  defineAddon("property_media_gallery", "Property Media Gallery & Upload System", "propertytech", 25000, "Upload, organize, optimize, and display property photos, galleries, floor plans, and approved media files."),
  defineAddon("property_map_explorer", "Property Map & Location Explorer", "propertytech", 35000, "Display properties on interactive maps with location markers, map-based search, and supported location filters. Third-party map usage fees are separate."),
  defineAddon("property_detail_comparison", "Property Detail & Comparison System", "propertytech", 25000, "Create detailed property pages and let users compare selected properties by price, size, location, features, and other supported attributes."),
  defineAddon("property_availability_status", "Property Availability & Listing Status Management", "propertytech", 20000, "Manage available, reserved, sold, rented, archived, and other approved listing states with controlled transitions."),
  defineAddon("agent_directory_profiles", "Agent Directory & Public Profiles", "propertytech", 25000, "Publish searchable agent profiles with contact details, agency affiliation, service areas, listed properties, and verification status."),
  defineAddon("agency_workspace_team_management", "Agency Workspace & Team Management", "propertytech", 60000, "Give agencies a dedicated workspace to manage team members, assigned listings, lead activity, and permitted agency information."),
  defineAddon("agent_verification_kyc", "Agent Verification & KYC Workflow", "propertytech", 50000, "Collect approved identity and credential evidence, manage verification statuses, and support authorized human review. Verification does not guarantee legal ownership or prevent all fraud."),
  defineAddon("agent_performance_leaderboards", "Agent Performance & Area Leaderboards", "propertytech", 35000, "Display configured performance metrics such as active listings, verified activity, completed transactions, and area-level rankings based on reliable records."),
  defineAddon("real_estate_lead_crm", "Real Estate Lead CRM", "propertytech", 50000, "Capture, assign, organize, and follow up on buyer, seller, landlord, tenant, and agent inquiries with persistent lead records."),
  defineAddon("exclusive_lead_lock", "Exclusive Lead Lock System", "propertytech", 60000, "Provide configurable exclusive lead claiming, lock expiry, conflict prevention, and release rules enforced by the backend."),
  defineAddon("property_visit_scheduling", "Property Visit & Appointment Scheduling", "propertytech", 25000, "Manage property visit requests, agent availability, appointment status, and customer notifications."),
  defineAddon("deal_pipeline_transactions", "Deal Pipeline & Transaction Management", "propertytech", 60000, "Track deals through approved stages such as inquiry, visit, negotiation, documentation, and completion, with role-based access."),
  defineAddon("deal_lock_expiry", "Deal Lock & Expiry Management", "propertytech", 50000, "Implement configurable transaction protection periods, expiry checks, extensions, and release rules. Business rules must be agreed before implementation."),
  defineAddon("commission_settlement_records", "Commission & Deal Settlement Records", "propertytech", 35000, "Record agreed commissions, transaction participants, payable amounts, and settlement status with access controls and audit history."),
  defineAddon("property_review_approval", "Property Review & Approval Queue", "propertytech", 40000, "Let authorized reviewers inspect submitted listings, request corrections, approve or reject submissions, and record decision reasons."),
  defineAddon("property_fraud_case_management", "Property Fraud Reporting & Case Management", "propertytech", 40000, "Allow users to report suspicious listings and provide administrators with a controlled workflow for investigation, evidence, decisions, and case history."),
  defineAddon("property_portal_subscriptions", "Property Portal Subscription Plans", "propertytech", 50000, "Configure agent and agency plans, subscription status, listing limits, and plan-based feature access. Payment-provider fees and gateway integration are separate."),
  defineAddon("featured_property_listings", "Featured Listings & Promotion Management", "propertytech", 30000, "Manage sponsored property placements, featured listing periods, promotion status, and agreed ranking rules."),
  defineAddon("real_estate_lead_analytics", "Real Estate Inquiry & Lead Analytics", "propertytech", 35000, "Report on inquiries, listing engagement, lead conversion, agent activity, and supported area-level metrics using available verified data."),
  defineAddon("property_secure_documents", "Property Documents & Secure File Access", "propertytech", 35000, "Manage permitted property-related documents with access controls, upload validation, and defined retention rules. Sensitive identity documents require a separately approved security design."),
  defineAddon("ai_property_search", "AI Property Search Assistant", "propertytech", 40000, "Help visitors discover suitable properties using natural-language questions and supported listing filters. Responses must be grounded in available property data."),
  defineAddon("ai_lead_qualification", "AI Lead Qualification Assistant", "propertytech", 30000, "Collect buyer or renter preferences, budget, property requirements, and contact details through a guided conversational workflow."),
  defineAddon("automated_lead_followup", "Automated Lead Follow-Up", "propertytech", 25000, "Configure agreed follow-up reminders and communication workflows based on lead status, consent, and supported messaging integrations."),
  defineAddon("ai_property_description", "AI Property Description Assistant", "propertytech", 20000, "Generate editable property descriptions and marketing drafts from agent-provided details. Generated content requires review and must not invent property facts."),
  defineAddon("real_estate_whatsapp", "Real Estate WhatsApp Integration", "propertytech", 30000, "Connect supported WhatsApp workflows for inquiries, notifications, and follow-ups. WhatsApp Business access, provider approval, message charges, and API usage are separate."),
  defineAddon("property_portal_api_integration", "Property Portal API & Partner Integration", "propertytech", 40000, "Exchange agreed property or lead data with approved external systems through documented API endpoints and access controls. Third-party accounts and complex integrations are separately scoped."),
  defineAddon("property_data_import_migration", "Property Data Import & Migration", "propertytech", 25000, "Import property records from agreed CSV or spreadsheet formats with field mapping, validation, duplicate checks, and error reports."),
  defineAddon("property_change_audit_trail", "Property Change History & Audit Trail", "propertytech", 30000, "Maintain durable records of important listing changes, administrative decisions, and authorized actions, including who performed them and when."),
  defineAddon("property_seo_structured_data", "Real Estate SEO & Structured Property Data", "propertytech", 25000, "Configure property-page metadata, canonical URLs, sitemaps, indexation rules, and applicable structured data. Search-engine display is not guaranteed."),
  defineAddon("property_portal_monitoring_backups", "Property Portal Monitoring & Backup Planning", "propertytech", 30000, "Configure agreed application monitoring, error reporting, backup procedures, and restore documentation. Provider availability, backup storage, and recurring service costs are separate."),
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
  creative: "Website Images & Video",
  ecommerce: "E-commerce & Payments",
  saas: "SaaS & Multi-Vendor",
  automation: "AI & Automation",
  security: "Security & Reliability",
  industry: "Industry-Specific",
  propertytech: "Real Estate & PropertyTech",
  businesscatalog: "Business-Specific Add-ons",
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
    ...Object.fromEntries(buildBusinessCatalogAddons().map((addon) => [addon.id, addon])),
  },
};

const LEGACY_ADDON_DESCRIPTIONS: Record<string, string> = {
  kitchen_order_tickets: "Route and track restaurant orders through a kitchen ticket workflow.",
  daily_sales_calendar: "Review daily sales records by date in the admin panel calendar.",
};

export function mergePricingConfigWithDefaults(
  config?: Partial<PricingRuleConfig> | null
): PricingRuleConfig {
  const addons = {
    ...DEFAULT_PRICING_CONFIG.addons,
    ...(config?.addons || {}),
  };
  return {
    ...DEFAULT_PRICING_CONFIG,
    ...config,
    addons: Object.fromEntries(Object.entries(addons).map(([id, addon]) => {
      const defaultAddon = DEFAULT_PRICING_CONFIG.addons[id];
      const planSpecificAddon = addon.category === "ecommerce" || addon.category === "saas";
      const businessCatalogAddon = addon.category === "businesscatalog";
      const isLegacyFlatPrice =
        addon.billingPeriod !== "monthly" &&
        addon.price === FEATURE_ADDON_PRICE_PKR &&
        planSpecificAddon &&
        (defaultAddon?.price || 0) > FEATURE_ADDON_PRICE_PKR;
      const shouldMigrateDescription =
        defaultAddon && LEGACY_ADDON_DESCRIPTIONS[id] === addon.description;
      return [
        id,
        {
          ...defaultAddon,
          ...addon,
          ...(shouldMigrateDescription ? { description: defaultAddon.description } : {}),
          ...(addon.billingPeriod === "monthly" || planSpecificAddon || addon.category === "creative" || addon.category === "propertytech" || businessCatalogAddon
            ? isLegacyFlatPrice
              ? { price: defaultAddon.price }
              : businessCatalogAddon
                ? {}
                : planSpecificAddon
                ? {
                    price: Math.max(
                      addon.price,
                      addon.id === "order_tracking"
                        ? 25000
                        : addon.category === "ecommerce" ? 20000 : 50000
                    ),
                  }
                : {}
            : addon.id === "kitchen_order_tickets"
              ? { price: Math.max(addon.price, defaultAddon?.price || 0) }
              : { price: FEATURE_ADDON_PRICE_PKR }),
          ...(() => {
            const mappings = BUSINESS_ADDON_DEFINITIONS.filter(
            (entry) => entry.existingAddonId === id
            );
            if (businessCatalogAddon) return {};
            if (!mappings.length && !addon.businessCategories) return {};
            return {
            businessCategories: addon.businessCategories || Array.from(new Set(mappings.map((entry) => entry.categoryId))),
            businessTypes: addon.businessTypes || Array.from(new Set(mappings.flatMap((entry) => entry.businessTypes || []))),
            pricingLevel: addon.pricingLevel || mappings[0]?.level,
            origin: addon.origin || "existing" as const,
            status: addon.status || (addon.enabled ? "active" as const : "inactive" as const),
            };
          })(),
        },
      ];
    })),
  };
}

export const ECOMMERCE_PACKAGES = {
  ecommerce_starter: {
    label: "E-Commerce Starter",
    basePrice: 100000,
    advance: 40000,
  },
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
  ecommerce_starter: ["supabase_db", "payment_gateway", "admin_dashboard", "order_invoice_management"],
  ecommerce_business: ["supabase_db", "payment_gateway", "admin_dashboard", "advanced_product_management", "inventory_management", "order_invoice_management"],
  ecommerce_advanced: ["supabase_db", "payment_gateway", "advanced_dashboard", "admin_dashboard", "advanced_product_management", "inventory_management", "order_invoice_management"],
  saas_starter: ["supabase_db", "google_auth"],
  saas_business: ["supabase_db", "google_auth", "payment_gateway", "advanced_dashboard"],
  saas_enterprise: ["supabase_db", "google_auth", "payment_gateway", "advanced_dashboard"],
};

const PACKAGE_ADDON_MULTIPLIERS: Record<PricingPackageId, number> = {
  ecommerce_starter: 1,
  ecommerce_business: 1.25,
  ecommerce_advanced: 1.5,
  saas_starter: 1,
  saas_business: 1.2,
  saas_enterprise: 1.4,
};

export function getAddonPriceForPackage(
  addon: AddonOption,
  packageId?: PricingPackageId | null
): number {
  if (!packageId || addon.billingPeriod === "monthly") return addon.price;
  const matchingCategory =
    (isEcommercePackageId(packageId) && addon.category === "ecommerce") ||
    (isSaasPackageId(packageId) && addon.category === "saas");
  return matchingCategory
    ? Math.round(addon.price * PACKAGE_ADDON_MULTIPLIERS[packageId])
    : addon.price;
}

function withPackageAddonPrices(
  config: PricingRuleConfig,
  packageId: PricingPackageId
): PricingRuleConfig {
  return {
    ...config,
    addons: Object.fromEntries(
      Object.entries(config.addons).map(([id, addon]) => [
        id,
        { ...addon, price: getAddonPriceForPackage(addon, packageId) },
      ])
    ),
  };
}

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
    ...withPackageAddonPrices(config, packageId),
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
    ...withPackageAddonPrices(config, packageId),
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
