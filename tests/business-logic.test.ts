import assert from "node:assert/strict";
import test from "node:test";
import { createHmac } from "crypto";
import {
  calculateBudget,
  DEFAULT_PRICING_CONFIG,
  EXTENDED_ADDONS,
  BUSINESS_INFO,
  buildWhatsAppLink,
  buildWhatsAppLinkTo,
  ECOMMERCE_PACKAGES,
  SAAS_PACKAGES,
  getEcommercePricingConfig,
  getSaasPricingConfig,
  getChargeableAddonIds,
  mergePricingConfigWithDefaults,
  isEcommerceProjectType,
  getDefaultPricingPackageForProjectType,
} from "../src/lib/constants";
import { signToken, verifyToken } from "../src/lib/auth";
import {
  hashAdminPassword,
  verifyAdminPasswordHash,
} from "../src/lib/admin-credentials";
import { checkRateLimit } from "../src/lib/rateLimit";
import { DataStore } from "../src/lib/store";
import { buildInstallmentSchedule } from "../src/lib/client-finances";
import {
  hashVisitorId,
  isVisitorAnalyticsEvent,
} from "../src/lib/visitor-analytics";
import { detectWebsiteFeatures, estimateWebsite } from "../src/lib/website-estimator";
import { sendInquiryWhatsappConfirmation } from "../src/lib/admin-notifications";
import {
  canStartProjectAfterVerifiedAdvance,
  sumVerifiedInquiryAdvances,
} from "../src/lib/inquiry-advance";
import { currencyForCountry, getRegionalPricingConfig } from "../src/lib/currency";
import {
  describePaymentBackendError,
  getPublicPaymentOptions,
  PaymentConfigurationError,
  validatePaymentSettings,
} from "../src/lib/payment-server";
import { DEFAULT_PAYMENT_SETTINGS } from "../src/lib/payment-types";
import {
  getSafepaySetupStatus,
  isSafepayCurrency,
  toSafepayMinorUnits,
  verifySafepayWebhookSignature,
} from "../src/lib/safepay";

test("Package 1: Web App Without Client Admin Panel (PKR 35,000)", () => {
  const calc = calculateBudget("none", []);

  assert.equal(calc.basePrice, 35000, "Base price without admin must be 35,000");
  assert.equal(calc.adminFee, 0, "Admin fee for managed tier must be 0");
  assert.equal(calc.addonsTotal, 0, "No addons selected");
  assert.equal(calc.estimatedTotal, 35000, "Total must be 35,000");
  assert.equal(calc.advanceAmount, 10000, "Default advance must be 10,000");
  assert.equal(calc.remainingBalance, 25000, "Remaining balance must be 25,000");

  assert.equal(calc.installmentsCount, 11, "Must have 11 installments");
  assert.equal(calc.regularInstallment, 2272.73, "Regular installment must be 2,272.73");
  assert.equal(calc.finalInstallment, 2272.70, "Final installment must be adjusted to 2,272.70");

  // Exact penny reconciliation
  const sum = Number((calc.regularInstallment * 10 + calc.finalInstallment).toFixed(2));
  assert.equal(sum, 25000.0, "Sum of 10 installments + final installment must equal 25,000 exactly");

  // Daily cost verification (35,000 / 365 = ~95.89)
  assert.equal(calc.dailyCost, 95.89, "Daily cost must be 95.89");
});

test("Package 2: Web App With Client Admin Panel Support (PKR 45,000)", () => {
  const calc = calculateBudget("client_admin", []);

  assert.equal(calc.basePrice, 45000, "Base price with admin must be 45,000");
  assert.equal(calc.adminFee, 10000, "Admin fee difference must be 10,000");
  assert.equal(calc.estimatedTotal, 45000, "Total must be 45,000");
  assert.equal(calc.advanceAmount, 10000, "Advance must be 10,000");
  assert.equal(calc.remainingBalance, 35000, "Remaining balance must be 35,000");

  assert.equal(calc.installmentsCount, 11, "Must have 11 installments");
  assert.equal(calc.regularInstallment, 3181.82, "Regular installment must be 3,181.82");
  assert.equal(calc.finalInstallment, 3181.80, "Final installment must be adjusted to 3,181.80");

  // Exact penny reconciliation
  const sum = Number((calc.regularInstallment * 10 + calc.finalInstallment).toFixed(2));
  assert.equal(sum, 35000.0, "Sum of 10 installments + final installment must equal 35,000 exactly");

  // Daily cost verification (45,000 / 365 = ~123.29)
  assert.equal(calc.dailyCost, 123.29, "Daily cost must be 123.29");
});

test("Addon selection and deduplication protects against double charges", () => {
  // Pass duplicates of google_auth and supabase_db
  const calc = calculateBudget("client_admin", [
    "google_auth",
    "google_auth",
    "supabase_db",
    "google_auth",
  ]);

  assert.equal(calc.selectedAddonDetails.length, 2, "Only 2 unique addons should be counted");
  assert.equal(calc.addonsTotal, 20000, "2 addons at 10,000 each = 20,000");
  assert.equal(calc.estimatedTotal, 45000 + 20000, "45k base + 20k addons = 65,000");
  assert.equal(calc.advanceAmount, 10000, "Advance is 10,000");
  assert.equal(calc.remainingBalance, 55000, "Remaining balance is 55,000");

  const sum = Number((calc.regularInstallment * 10 + calc.finalInstallment).toFixed(2));
  assert.equal(sum, 55000.0, "Sum of installments must equal 55,000.00 exactly");
});

test("Expanded add-ons preserve saved prices and separate monthly maintenance", () => {
  const merged = mergePricingConfigWithDefaults({
    addons: {
      ...DEFAULT_PRICING_CONFIG.addons,
      google_auth: { ...DEFAULT_PRICING_CONFIG.addons.google_auth, price: 23000 },
    },
  });
  assert.equal(merged.addons.google_auth.price, 23000);
  assert.equal(merged.addons.cms.price, 15000);
  assert.equal(merged.addons.multi_tenant_architecture.price, 50000);

  const calculation = calculateBudget("none", ["maintenance_updates", "cms"], merged);
  assert.equal(calculation.addonsTotal, 15000);
  assert.equal(calculation.monthlyAddonTotal, 15000);
  assert.equal(
    calculation.selectedAddonDetails.find((addon) => addon.id === "maintenance_updates")?.billingPeriod,
    "monthly"
  );
});

test("Client admin and e-commerce packages do not double-charge included modules", () => {
  assert.deepEqual(
    getChargeableAddonIds(["admin_dashboard"], null, "client_admin"),
    []
  );
  assert.deepEqual(
    getChargeableAddonIds(
      ["admin_dashboard", "inventory_management", "order_invoice_management", "discount_coupons"],
      "ecommerce_business",
      "client_admin"
    ),
    ["discount_coupons"]
  );
});

test("WhatsApp link formatting with country code 92 and no leading zero", () => {
  const link = buildWhatsAppLink("Hello Durrani Web Developers");
  assert.equal(BUSINESS_INFO.phone, "+923299669565");
  assert.equal(BUSINESS_INFO.phoneDisplay, "+923299669565");
  assert.match(link, /^https:\/\/wa\.me\/923299669565\?text=/, "Must use 923299669565 without leading zero");
  assert.ok(link.includes("Hello%20Durrani%20Web%20Developers"), "Must properly url-encode message text");
});

test("Admin WhatsApp links target the customer's normalized phone number", () => {
  assert.match(
    buildWhatsAppLinkTo("03367317379", "Inquiry DW-123456") || "",
    /^https:\/\/wa\.me\/923367317379\?text=/
  );
  assert.match(
    buildWhatsAppLinkTo("+923367317379", "Inquiry DW-123456") || "",
    /^https:\/\/wa\.me\/923367317379\?text=/
  );
  assert.equal(buildWhatsAppLinkTo("Not provided", "Inquiry DW-123456"), null);
});

test("Admin Token Signing and Tamper Prevention", () => {
  const email = "admin@durraniwebdevelopers.com";
  const token = signToken({ email, timestamp: Date.now() });

  const verified = verifyToken(token);
  assert.ok(verified, "Valid token must be verified");
  assert.equal(verified?.email, email);

  // Tampered signature
  const parts = token.split(".");
  const tamperedToken = `${parts[0]}.0000000000000000000000000000000000000000000000000000000000000000`;
  assert.equal(verifyToken(tamperedToken), null, "Tampered token must be rejected");
});

test("Admin password hashes are salted and verified without storing plaintext", async () => {
  const password = "long-test-password-value";
  const firstHash = await hashAdminPassword(password);
  const secondHash = await hashAdminPassword(password);

  assert.notEqual(firstHash, secondHash, "Each password hash must use a random salt");
  assert.equal(await verifyAdminPasswordHash(password, firstHash), true);
  assert.equal(await verifyAdminPasswordHash("incorrect-password", firstHash), false);
  assert.equal(firstHash.includes(password), false);
});

test("Rate limiter threshold enforcement", () => {
  const testKey = `test_rate_limit_${Date.now()}`;
  for (let i = 0; i < 5; i++) {
    const res = checkRateLimit(testKey, 5, 10000);
    assert.ok(res.allowed, `Request ${i + 1} should be allowed`);
  }

  // 6th request exceeds limit
  const exceedRes = checkRateLimit(testKey, 5, 10000);
  assert.equal(exceedRes.allowed, false, "6th request exceeding limit of 5 must be blocked");
});

test("DataStore Ledger Calculations & Isolation", () => {
  const portfolio = DataStore.getPortfolio(false);
  assert.ok(portfolio.length > 0, "Public portfolio must have items");
  assert.ok(portfolio.every((p) => p.isPublic === true), "All items returned by public portfolio must be public");

  const pricingConfig = DataStore.getPricingConfig();
  assert.equal(pricingConfig.baseWithoutAdmin, 35000);
  assert.equal(pricingConfig.baseWithAdmin, 45000);
});

test("Client project installment schedule preserves the agreed total and clamps month ends", () => {
  const installments = buildInstallmentSchedule("proj-test", 100, 3, "2026-01-31");

  assert.deepEqual(
    installments.map(({ installmentNumber, amount, dueDate }) => ({
      installmentNumber,
      amount,
      dueDate,
    })),
    [
      { installmentNumber: 1, amount: 33.33, dueDate: "2026-01-31" },
      { installmentNumber: 2, amount: 33.33, dueDate: "2026-02-28" },
      { installmentNumber: 3, amount: 33.34, dueDate: "2026-03-31" },
    ]
  );
  assert.equal(installments.reduce((sum, installment) => sum + installment.amount, 0), 100);
  assert.throws(
    () => buildInstallmentSchedule("proj-test", 100, 3, "2026-02-30"),
    /valid first installment due date/
  );
});

test("All-time analytics hash browser identifiers and accept supported events", () => {
  assert.match(hashVisitorId("persistent-browser-id"), /^[0-9a-f]{64}$/);
  assert.notEqual(hashVisitorId("persistent-browser-id"), "persistent-browser-id");
  assert.equal(isVisitorAnalyticsEvent("visitor"), true);
  assert.equal(isVisitorAnalyticsEvent("estimator"), true);
  assert.equal(isVisitorAnalyticsEvent("payment"), false);
});

test("WhatsApp inquiry confirmation requires opt-in and an approved template", async () => {
  const envKeys = [
    "WHATSAPP_API_TOKEN",
    "WHATSAPP_PHONE_NUMBER_ID",
    "WHATSAPP_CUSTOMER_TEMPLATE_NAME",
  ] as const;
  const previousValues = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  for (const key of envKeys) delete process.env[key];

  try {
    assert.equal(
      await sendInquiryWhatsappConfirmation({
        customerName: "Test Customer",
        customerPhone: "03001234567",
        reference: "DW-123456",
        optedIn: false,
      }),
      "not_requested"
    );
    assert.equal(
      await sendInquiryWhatsappConfirmation({
        customerName: "Test Customer",
        customerPhone: "03001234567",
        reference: "DW-123456",
        optedIn: true,
      }),
      "not_configured"
    );
  } finally {
    for (const key of envKeys) {
      const value = previousValues[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("Project start requires a sent quote and fully verified advance receipts", () => {
  assert.equal(canStartProjectAfterVerifiedAdvance("New Inquiry", 10000, 10000), false);
  assert.equal(canStartProjectAfterVerifiedAdvance("Quotation Sent", 10000, 10000), false);
  assert.equal(canStartProjectAfterVerifiedAdvance("Awaiting Advance", 9999, 10000), false);
  assert.equal(canStartProjectAfterVerifiedAdvance("Awaiting Advance", 10000, 10000), true);
  assert.equal(canStartProjectAfterVerifiedAdvance("Advance Received", 12000, 10000), true);
  assert.equal(
    sumVerifiedInquiryAdvances([
      { amount: 6000, status: "verified" },
      { amount: 4000, status: "pending" },
      { amount: "5000", status: "verified" },
    ]),
    11000
  );
});

test("Website estimator maps visible store and admin signals to calculator pricing", () => {
  const detected = detectWebsiteFeatures(
    "Restaurant menu, add to cart, online ordering, staff admin dashboard"
  );

  assert.equal(detected.adminPanel, true);
  assert.ok(detected.addonIds.includes("supabase_db"));
  assert.equal(detected.features.some((feature) => feature.title === "Online order aur cart"), true);
  assert.equal(detected.features.some((feature) => feature.title === "Product ya menu catalog"), true);
  const manualPaymentSignals = detectWebsiteFeatures(
    "Accepted payments: Easypaisa, JazzCash, Cash on Delivery"
  );
  assert.equal(manualPaymentSignals.addonIds.includes("payment_gateway"), false);
});

test("E-commerce packages use their published starting prices and advances", () => {
  assert.equal(isEcommerceProjectType("E-Commerce Stores"), true);
  assert.equal(isEcommerceProjectType("E-commerce store"), true);
  assert.equal(isEcommerceProjectType("Jewellery Stores"), true);
  assert.equal(isEcommerceProjectType("Cosmetics & Beauty"), true);
  assert.equal(isEcommerceProjectType("Fashion Stores"), true);
  assert.equal(isEcommerceProjectType("Grocery Stores"), true);
  assert.equal(isEcommerceProjectType("Custom web application"), false);
  assert.equal(getDefaultPricingPackageForProjectType("E-Commerce Stores"), "ecommerce_business");
  assert.equal(getDefaultPricingPackageForProjectType("SaaS Projects"), "saas_starter");

  const business = calculateBudget(
    "client_admin",
    [],
    getEcommercePricingConfig(DEFAULT_PRICING_CONFIG, "ecommerce_business")
  );
  assert.equal(business.basePrice, ECOMMERCE_PACKAGES.ecommerce_business.basePrice);
  assert.equal(business.advanceAmount, 60000);
  assert.equal(business.regularInstallment, 8181.82);

  const advanced = calculateBudget(
    "client_admin",
    [],
    getEcommercePricingConfig(DEFAULT_PRICING_CONFIG, "ecommerce_advanced")
  );
  assert.equal(advanced.basePrice, ECOMMERCE_PACKAGES.ecommerce_advanced.basePrice);
  assert.equal(advanced.advanceAmount, 80000);
  assert.equal(advanced.regularInstallment, 10909.09);
  assert.equal(advanced.finalInstallment, 10909.1);
  assert.deepEqual(
    getChargeableAddonIds(
      ["supabase_db", "payment_gateway", "advanced_dashboard", "ai_chatbot"],
      "ecommerce_business"
    ),
    ["advanced_dashboard", "ai_chatbot"]
  );
  assert.deepEqual(
    getChargeableAddonIds(
      ["supabase_db", "payment_gateway", "advanced_dashboard", "ai_chatbot"],
      "ecommerce_advanced"
    ),
    ["ai_chatbot"]
  );
});

test("SaaS budget plans use published prices, advances, and included features", () => {
  const starter = calculateBudget(
    "client_admin",
    [],
    getSaasPricingConfig(DEFAULT_PRICING_CONFIG, "saas_starter")
  );
  assert.equal(starter.basePrice, SAAS_PACKAGES.saas_starter.basePrice);
  assert.equal(starter.advanceAmount, 100000);
  assert.equal(starter.regularInstallment, 13636.36);

  const business = calculateBudget(
    "client_admin",
    [],
    getSaasPricingConfig(DEFAULT_PRICING_CONFIG, "saas_business")
  );
  assert.equal(business.basePrice, SAAS_PACKAGES.saas_business.basePrice);
  assert.equal(business.advanceAmount, 200000);
  assert.equal(business.regularInstallment, 27272.73);

  const enterprise = calculateBudget(
    "client_admin",
    [],
    getSaasPricingConfig(DEFAULT_PRICING_CONFIG, "saas_enterprise")
  );
  assert.equal(enterprise.basePrice, SAAS_PACKAGES.saas_enterprise.basePrice);
  assert.equal(enterprise.advanceAmount, 400000);
  assert.equal(enterprise.regularInstallment, 54545.45);
  assert.deepEqual(
    getChargeableAddonIds(
      ["supabase_db", "google_auth", "payment_gateway", "advanced_dashboard", "ai_chatbot"],
      "saas_starter"
    ),
    ["payment_gateway", "advanced_dashboard", "ai_chatbot"]
  );
  assert.deepEqual(
    getChargeableAddonIds(
      ["supabase_db", "google_auth", "payment_gateway", "advanced_dashboard", "ai_chatbot"],
      "saas_business"
    ),
    ["ai_chatbot"]
  );
});

test("Website estimator routes ecommerce stores to matching packages without duplicate core add-ons", () => {
  const businessStore = detectWebsiteFeatures(
    "Online shop with product catalog, shopping cart, and checkout."
  );
  assert.equal(businessStore.pricingPackage, "ecommerce_business");
  assert.equal(businessStore.adminPanel, true);
  assert.equal(businessStore.addonIds.includes("supabase_db"), false);
  assert.equal(businessStore.addonIds.includes("payment_gateway"), false);

  const advancedStore = detectWebsiteFeatures(
    "Online store with products, add to cart, sales reports, and advanced inventory."
  );
  assert.equal(advancedStore.pricingPackage, "ecommerce_advanced");
  assert.equal(advancedStore.addonIds.includes("advanced_dashboard"), false);
});

test("Website estimator routes SaaS platforms to SaaS pricing tiers instead of generic web-app rates", () => {
  const starter = detectWebsiteFeatures(
    "SaaS cloud software platform with subscriptions and a customer dashboard."
  );
  assert.equal(starter.pricingPackage, "saas_starter");
  assert.equal(starter.adminPanel, true);
  assert.equal(starter.addonIds.includes("supabase_db"), false);
  assert.equal(starter.addonIds.includes("google_auth"), false);
  assert.equal(
    calculateBudget(
      "client_admin",
      starter.addonIds,
      getSaasPricingConfig(DEFAULT_PRICING_CONFIG, "saas_starter")
    ).basePrice,
    SAAS_PACKAGES.saas_starter.basePrice
  );

  const business = detectWebsiteFeatures(
    "SaaS project management platform with team workspaces, billing, analytics dashboard, and API integration."
  );
  assert.equal(business.pricingPackage, "saas_business");
  assert.equal(business.addonIds.includes("advanced_dashboard"), false);

  const enterprise = detectWebsiteFeatures(
    "Enterprise SaaS with multi-tenant workspaces, SSO, white-label controls, audit logs, and custom roles."
  );
  assert.equal(enterprise.pricingPackage, "saas_enterprise");

  const ecommerce = detectWebsiteFeatures(
    "SaaS-enabled e-commerce store with product catalog, shopping cart, and checkout."
  );
  assert.equal(ecommerce.pricingPackage, "ecommerce_business");
});

test("Website estimator ignores chatbot mentions unless the page invites users to open or use one", () => {
  const informationalMention = detectWebsiteFeatures(
    "Our budget calculator offers AI chatbots as an optional add-on. Learn about chatbot development. Pakistan add-ons include AI chatbots."
  );
  assert.equal(informationalMention.addonIds.includes("ai_chatbot"), false);
  assert.equal(
    informationalMention.features.some((feature) => feature.title === "Chatbot ya AI assistant"),
    false
  );

  const chatbotCallToAction = detectWebsiteFeatures(
    "Chat with our AI assistant now to get help."
  );
  assert.equal(chatbotCallToAction.addonIds.includes("ai_chatbot"), true);
});

test("Website scan maps visible modules to priced add-ons and records evidence", () => {
  const detected = detectWebsiteFeatures(
    "Online store with product variants, inventory management and low-stock alerts, " +
    "coupon codes, wishlists, product reviews, shipping rules, order tracking, abandoned carts, " +
    "bulk product import, multiple warehouses, responsive design, content management system, " +
    "advanced SEO, multilingual support, email notifications, dark mode, role-based permissions, " +
    "file uploads, CSV report export, automated backups, audit trail, API integration, " +
    "multi-tenant SaaS platform, subscription plans, usage limits, vendor management, " +
    "commission payouts, white-label branding, two-factor authentication, digital event tickets, " +
    "sign in with Google, and a bespoke workflow."
  );

  for (const addonId of [
    "responsive_design",
    "cms",
    "advanced_seo",
    "multilingual_support",
    "email_notifications",
    "theme_switcher",
    "advanced_product_management",
    "inventory_management",
    "discount_coupons",
    "wishlist",
    "product_reviews",
    "shipping_rules",
    "order_tracking",
    "abandoned_cart",
    "bulk_product_import",
    "multi_warehouse",
    "role_permissions",
    "media_uploads",
    "pdf_excel_export",
    "automated_backups",
    "audit_trail",
    "api_integration",
    "multi_tenant_architecture",
    "subscription_plans",
    "usage_metering",
    "vendor_management",
    "commission_payouts",
    "white_label",
    "two_factor_auth",
    "event_ticketing",
    "custom_advanced_feature",
  ]) {
    assert.ok(detected.addonIds.includes(addonId), `expected ${addonId} from scan text`);
  }
  assert.ok(detected.features.some((feature) => feature.title === "Responsive Design Enhancement"));
  assert.ok(detected.features.some((feature) => feature.title === "Google Authentication"));
  assert.equal(detected.addonIds.includes("google_auth"), false);
  assert.ok(detected.features.every((feature) => feature.evidence.length > 0));
});

test("URL scans recognize behavior signals across business, SaaS, security, and industry modules", () => {
  const detected = detectWebsiteFeatures(
    "Google login, edit pages, schema markup, confirmation emails, theme switcher, " +
    "custom staff roles, upload documents, order statuses, Excel report export, " +
    "scheduled backups, SKUs, product ratings and reviews, shipment tracking, " +
    "digital menu, KOT system, clinic appointment scheduling, student attendance, " +
    "parent portal, employer dashboard, course progress, quizzes and assessments, " +
    "AI writing assistant, email sequences, 2FA, account recovery, session management, " +
    "error tracking, performance optimization, data deletion workflow, monthly maintenance."
  );
  for (const addonId of [
    "google_auth",
    "cms",
    "advanced_seo",
    "email_notifications",
    "theme_switcher",
    "role_permissions",
    "media_uploads",
    "order_invoice_management",
    "pdf_excel_export",
    "automated_backups",
    "advanced_product_management",
    "product_reviews",
    "order_tracking",
    "restaurant_qr_menu",
    "kitchen_order_tickets",
    "clinic_appointments",
    "school_attendance",
    "parent_student_portal",
    "employer_dashboard",
    "course_progress",
    "quizzes_assessments",
    "ai_content_assistant",
    "automated_email_workflows",
    "two_factor_auth",
    "password_reset",
    "session_management",
    "error_monitoring",
    "performance_optimization",
    "data_retention_tools",
    "maintenance_updates",
  ]) {
    assert.ok(detected.addonIds.includes(addonId), `expected ${addonId} from scan signals`);
  }
});

test("Website estimator rejects local URLs before making a request", async () => {
  await assert.rejects(
    estimateWebsite("http://localhost/"),
    /public website|URL|address|host|local|private/i
  );
});

test("Website estimator rejects non-HTTP URL schemes", async () => {
  await assert.rejects(
    estimateWebsite("file:///etc/passwd"),
    /HTTP|HTTPS|URL/i
  );
});

test("International pricing doubles PKR rates before converting to the selected currency", () => {
  const regionalConfig = getRegionalPricingConfig(DEFAULT_PRICING_CONFIG, "EUR", {
    PKR: 1,
    EUR: 0.003,
  });

  assert.equal(regionalConfig.baseWithoutAdmin, 210);
  assert.equal(regionalConfig.baseWithAdmin, 270);
  assert.equal(regionalConfig.addons.supabase_db.price, 100);
  assert.equal(regionalConfig.addons.google_auth.price, 100);
  assert.equal(regionalConfig.addons.maintenance_updates.price, 100);
  assert.equal(regionalConfig.advanceDefault, 60);
  const calculatorTotal = calculateBudget(
    "none",
    ["supabase_db"],
    regionalConfig
  );
  assert.equal(calculatorTotal.estimatedTotal, 310);

  const internationalEcommerce = getRegionalPricingConfig(
    getEcommercePricingConfig(DEFAULT_PRICING_CONFIG, "ecommerce_business"),
    "EUR",
    { PKR: 1, EUR: 0.003 }
  );
  assert.equal(internationalEcommerce.baseWithAdmin, 900);
  assert.equal(internationalEcommerce.advanceDefault, 360);
});

test("Regional currency maps Germany, UK, Canada, US, Australia, and other European regions", () => {
  assert.equal(currencyForCountry(null), "PKR");
  assert.equal(currencyForCountry(undefined), "PKR");
  assert.equal(currencyForCountry("DE"), "EUR");
  assert.equal(currencyForCountry("GB"), "GBP");
  assert.equal(currencyForCountry("US"), "USD");
  assert.equal(currencyForCountry("CA"), "CAD");
  assert.equal(currencyForCountry("AU"), "AUD");
  assert.equal(currencyForCountry("NO"), "NOK");
  assert.equal(currencyForCountry("PL"), "PLN");
  assert.equal(currencyForCountry("XX"), "USD");
});

test("Safepay checkout accepts supported quote currencies and converts amounts to minor units", () => {
  assert.equal(isSafepayCurrency("PKR"), true);
  assert.equal(isSafepayCurrency("EUR"), true);
  assert.equal(isSafepayCurrency("INR"), false);
  assert.equal(toSafepayMinorUnits("123.45", "USD"), 12345);
  assert.equal(toSafepayMinorUnits("4000", "PKR"), 400000);
  assert.throws(() => toSafepayMinorUnits("1.001", "EUR"), /decimal places/i);
  assert.throws(() => toSafepayMinorUnits("0", "PKR"), /valid payment amount/i);
});

test("Safepay checkout only enables with Sandbox configuration and a public HTTPS URL", () => {
  const variableNames = [
    "SAFEPAY_PUBLIC_KEY",
    "SAFEPAY_SECRET_KEY",
    "SAFEPAY_WEBHOOK_SECRET",
    "SAFEPAY_ENVIRONMENT",
    "NEXT_PUBLIC_SITE_URL",
  ] as const;
  const previousValues = new Map(
    variableNames.map((name) => [name, process.env[name]] as const)
  );

  try {
    process.env.SAFEPAY_PUBLIC_KEY = "sandbox-public-key";
    process.env.SAFEPAY_SECRET_KEY = "sandbox-secret-key";
    process.env.SAFEPAY_WEBHOOK_SECRET = "sandbox-webhook-secret";
    process.env.SAFEPAY_ENVIRONMENT = "sandbox";
    process.env.NEXT_PUBLIC_SITE_URL = "https://dwd-sandbox.test";
    assert.equal(getSafepaySetupStatus().configured, true);
    assert.equal(getSafepaySetupStatus().environment, "sandbox");

    process.env.SAFEPAY_ENVIRONMENT = "production";
    const productionStatus = getSafepaySetupStatus();
    assert.equal(productionStatus.configured, false);
    assert.equal(productionStatus.environment, null);
    assert.match(productionStatus.message, /production checkout is disabled/i);

    process.env.SAFEPAY_ENVIRONMENT = "sandbox";
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    assert.equal(getSafepaySetupStatus().configured, false);
  } finally {
    for (const name of variableNames) {
      const previousValue = previousValues.get(name);
      if (previousValue === undefined) delete process.env[name];
      else process.env[name] = previousValue;
    }
  }
});

test("Safepay webhook signature checks signed payloads and rejects modified or malformed events", () => {
  const payload = {
    type: "payment.succeeded",
    data: { tracker: "track_test", amount: 10000, currency: "PKR" },
  };
  const secret = "test-webhook-secret";
  const signature = createHmac("sha512", secret)
    .update(Buffer.from(JSON.stringify(payload)))
    .digest("hex");

  assert.equal(verifySafepayWebhookSignature(payload, signature, secret), true);
  assert.equal(
    verifySafepayWebhookSignature({ ...payload, type: "payment.failed" }, signature, secret),
    false
  );
  assert.equal(verifySafepayWebhookSignature(payload, "bad-signature", secret), false);
  assert.equal(verifySafepayWebhookSignature(payload, signature, ""), false);
});

test("Manual payment instructions only expose complete Pakistan methods", () => {
  const settings = {
    ...DEFAULT_PAYMENT_SETTINGS,
    accountHolder: "Test Recipient",
    walletNumber: "03000000000",
    bankName: "Test Bank",
    accountNumber: "000000000000",
  };

  assert.equal(validatePaymentSettings(settings), true);
  assert.equal(validatePaymentSettings({ ...settings, bankTransferEnabled: "yes" }), false);

  const pakistanOptions = getPublicPaymentOptions(settings, true);
  assert.equal(pakistanOptions.methods.JazzCash, true);
  assert.equal(pakistanOptions.methods.Easypaisa, true);
  assert.equal(pakistanOptions.methods["Bank Transfer"], true);
  assert.equal(pakistanOptions.cardCheckoutAvailable, false);

  const internationalOptions = getPublicPaymentOptions(settings, false);
  assert.equal(internationalOptions.methods.JazzCash, false);
  assert.equal(internationalOptions.methods["Bank Transfer"], false);
  assert.equal(internationalOptions.accountNumber, "");
  assert.equal(internationalOptions.walletNumber, "");
});

test("Payment backend errors distinguish missing configuration, missing schema, and Storage", () => {
  assert.match(
    describePaymentBackendError(new PaymentConfigurationError(), "database"),
    /NEXT_PUBLIC_SUPABASE_URL/
  );
  assert.match(
    describePaymentBackendError({ code: "PGRST205" }, "database"),
    /payment-workflow\.sql/
  );
  assert.match(
    describePaymentBackendError({ code: "NoSuchBucket" }, "storage"),
    /payment-receipts/
  );
});
