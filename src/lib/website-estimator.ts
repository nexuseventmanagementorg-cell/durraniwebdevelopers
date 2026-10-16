import { isIP } from "node:net";
import { LookupAddress, LookupOptions } from "node:dns";
import { lookup as dnsLookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import {
  calculateBudget,
  DEFAULT_PRICING_CONFIG,
  ECOMMERCE_PACKAGES,
  getChargeableAddonIds,
  getPricingPackageConfig,
  isEcommercePackageId,
  isSaasPackageId,
  PricingPackageId,
  SAAS_PACKAGES,
} from "./constants";
import { CurrencyCode, ExchangeRates, getRegionalPricingConfig } from "./currency";

const MAX_URL_LENGTH = 2048;
const MAX_HTML_BYTES = 1_000_000;
const MAX_REDIRECTS = 3;
const MAX_PAGES = 3;
const REQUEST_TIMEOUT_MS = 5000;

interface PublicAddress {
  address: string;
  family: number;
}

type PinnedLookupFunction = (
  hostname: string,
  options: LookupOptions,
  callback: (
    error: NodeJS.ErrnoException | null,
    address: string | LookupAddress[],
    family?: number
  ) => void
) => void;

interface HttpResult {
  statusCode: number;
  location?: string;
  contentType: string;
  body: string;
}

interface ScannedPage {
  url: string;
  html: string;
}

export interface WebsiteEstimateFeature {
  title: string;
  explanation: string;
  evidence: string;
}

export interface WebsiteEstimateResult {
  url: string;
  currency: CurrencyCode;
  internationalPricing: boolean;
  adminPanel: boolean;
  pricingPackage?: PricingPackageId;
  exchangeRate?: number;
  exchangeRateDate?: string;
  historicalProjectReference?: {
    title: string;
    amountPKR: number;
    convertedAmount: number;
    currency: CurrencyCode;
  };
  siteTitle: string;
  siteDescription: string;
  pagesScanned: number;
  features: WebsiteEstimateFeature[];
  basePackage: string;
  basePrice: number;
  addons: {
    id: string;
    title: string;
    price: number;
    billingPeriod?: "one_time" | "monthly";
  }[];
  monthlyAddonTotal: number;
  estimatedTotal: number;
  assumptions: string[];
  warnings: string[];
}

function isPublicAddress(address: string): boolean {
  const family = isIP(address);

  if (family === 4) {
    const octets = address.split(".").map(Number);
    const [first, second] = octets;

    return !(
      first === 0 ||
      first === 10 ||
      first === 127 ||
      (first === 100 && second >= 64 && second <= 127) ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 0 && octets[2] === 0) ||
      (first === 192 && second === 0 && octets[2] === 2) ||
      (first === 192 && second === 88 && octets[2] === 99) ||
      (first === 192 && second === 168) ||
      (first === 198 && (second === 18 || second === 19)) ||
      (first === 198 && second === 51 && octets[2] === 100) ||
      (first === 203 && second === 0 && octets[2] === 113) ||
      first >= 224
    );
  }

  if (family === 6) {
    const normalized = address.toLowerCase();
    const firstHextet = parseInt(normalized.split(":")[0] || "0", 16);

    return (
      firstHextet >= 0x2000 &&
      firstHextet <= 0x3fff &&
      !normalized.startsWith("2001:db8:") &&
      !normalized.startsWith("2002:")
    );
  }

  return false;
}

async function validateAndResolveUrl(input: string): Promise<{ url: URL; addresses: PublicAddress[] }> {
  if (input.length > MAX_URL_LENGTH) {
    throw new Error("URL zyada lamba hai. Mukhtasar public website URL enter karein.");
  }

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("URL durust nahi. Misal ke taur par https://example.com enter karein.");
  }

  if (
    (url.protocol !== "https:" && url.protocol !== "http:") ||
    url.username ||
    url.password ||
    url.hash ||
    (url.port && url.port !== "80" && url.port !== "443") ||
    (url.protocol === "https:" && url.port === "80") ||
    (url.protocol === "http:" && url.port === "443")
  ) {
    throw new Error("Sirf public HTTP/HTTPS website links (standard ports) scan kiye ja sakte hain.");
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new Error("Local ya private network websites scan nahi ki ja sakti.");
  }

  let addresses: PublicAddress[];
  if (isIP(hostname)) {
    addresses = [{ address: hostname, family: isIP(hostname) }];
  } else {
    try {
      addresses = await dnsLookup(hostname, { all: true, verbatim: true });
    } catch {
      throw new Error("Is website ka public server address nahi mil saka.");
    }
  }

  if (addresses.length === 0 || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new Error("Yeh link public website nahi lagti; private ya restricted network addresses scan nahi kiye ja sakte.");
  }

  return { url, addresses };
}

function requestOnce(url: URL, addresses: PublicAddress[]): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    const client = url.protocol === "https:" ? https : http;
    const pinnedAddress = addresses[0];
    const pinnedLookup: PinnedLookupFunction = (_hostname, options, callback) => {
      if (options.all) {
        callback(null, [pinnedAddress]);
      } else {
        callback(null, pinnedAddress.address, pinnedAddress.family);
      }
    };

    const request = client.request(
      url,
      {
        method: "GET",
        lookup: pinnedLookup,
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "Accept-Encoding": "identity",
          "User-Agent": "DurraniWebDevelopers-FeatureEstimator/1.0",
        },
      },
      (response) => {
        const statusCode = response.statusCode || 0;
        const location = response.headers.location;
        const contentType = response.headers["content-type"] || "";

        if (statusCode >= 300 && statusCode < 400 && location) {
          response.resume();
          resolve({ statusCode, location, contentType, body: "" });
          return;
        }

        if (statusCode < 200 || statusCode >= 300) {
          response.resume();
          reject(new Error(`Website ne HTTP ${statusCode} response diya.`));
          return;
        }

        if (!/^(text\/html|application\/xhtml\+xml)(;|$)/i.test(contentType)) {
          response.resume();
          reject(new Error("Yeh URL HTML website page nahi hai."));
          return;
        }

        const chunks: Buffer[] = [];
        let totalBytes = 0;

        response.on("data", (chunk: Buffer | string) => {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          totalBytes += buffer.length;
          if (totalBytes > MAX_HTML_BYTES) {
            request.destroy(new Error("Website page file size limit se bara hai."));
            return;
          }
          chunks.push(buffer);
        });

        response.on("end", () => {
          resolve({
            statusCode,
            contentType,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
        response.on("error", reject);
      }
    );

    request.setTimeout(REQUEST_TIMEOUT_MS, () => {
      request.destroy(new Error("Website ne waqt par response nahi diya."));
    });
    request.on("error", reject);
    request.end();
  });
}

async function fetchPublicHtml(input: string): Promise<ScannedPage> {
  let currentInput = input;

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const { url, addresses } = await validateAndResolveUrl(currentInput);
    const result = await requestOnce(url, addresses);

    if (!result.location) {
      return { url: url.toString(), html: result.body };
    }
    if (redirects === MAX_REDIRECTS) {
      throw new Error("Website par bohat zyada redirects hain.");
    }

    currentInput = new URL(result.location, url).toString();
  }

  throw new Error("Website ko scan nahi kiya ja saka.");
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code: string) => decodeCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => decodeCodePoint(parseInt(code, 16)));
}

function decodeCodePoint(codePoint: number): string {
  return codePoint >= 0 && codePoint <= 0x10ffff
    ? String.fromCodePoint(codePoint)
    : "\uFFFD";
}

function stripHtml(html: string): string {
  return decodeHtml(
    html
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(script|style|noscript|svg|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
      .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/section|\/article|\/form)\b[^>]*>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function getMetaContent(html: string, key: string, attribute: "name" | "property"): string {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const keyMatch = tag.match(new RegExp(`\\b${attribute}\\s*=\\s*["']${key}["']`, "i"));
    const contentMatch = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i);
    if (keyMatch && contentMatch) return decodeHtml(contentMatch[1]).trim();
  }
  return "";
}

function getPageTitle(html: string): string {
  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1];
  return title ? decodeHtml(title.replace(/<[^>]+>/g, " ").trim()) : "";
}

function getCandidateLinks(html: string, baseUrl: string): string[] {
  const base = new URL(baseUrl);
  const matches = Array.from(html.matchAll(/<a\b[^>]*href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>/gi));
  const scored = new Map<string, number>();

  for (const match of matches) {
    const href = decodeHtml(match[1] || match[2] || match[3] || "").trim();
    if (!href || /^(mailto:|tel:|javascript:|#)/i.test(href)) continue;

    try {
      const url = new URL(href, base);
      if (
        url.origin !== base.origin ||
        url.protocol !== base.protocol ||
        url.username ||
        url.password
      ) continue;

      url.hash = "";
      if (url.pathname === base.pathname && !url.search) continue;

      const relevance = /product|shop|store|menu|order|booking|reservation|pricing|service|feature|about|account|login|dashboard|contact|cart|checkout/i
        .test(`${url.pathname} ${url.search}`)
        ? 1
        : 0;
      if (!scored.has(url.toString())) scored.set(url.toString(), relevance);
    } catch {
      continue;
    }
  }

  return Array.from(scored.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_PAGES - 1)
    .map(([url]) => url);
}

const ADDON_SCAN_RULES: Array<{ id: string; pattern: RegExp }> = [
  { id: "google_auth", pattern: /\b(google authentication|google login|sign in with google|continue with google)\b/i },
  { id: "custom_advanced_feature", pattern: /\b(custom advanced feature|bespoke workflow|custom functionality)\b/i },
  { id: "responsive_design", pattern: /\b(responsive design|mobile[- ]friendly|mobile[- ]optimized)\b/i },
  { id: "cms", pattern: /\b(cms|content management system|edit (pages|content|banners)|manage (pages|content|banners))\b/i },
  { id: "advanced_seo", pattern: /\b(advanced seo|search engine optimization|structured data|schema markup|canonical url)\b/i },
  { id: "multilingual_support", pattern: /\b(multilingual|multiple languages|language switcher|translated content)\b/i },
  { id: "email_notifications", pattern: /\b(email notifications?|confirmation emails?|contact form emails?)\b/i },
  { id: "theme_switcher", pattern: /\b(dark mode|light mode|theme switcher|switch themes?)\b/i },
  { id: "admin_dashboard", pattern: /\b(admin|staff)\s+(dashboard|panel|portal)\b/i },
  { id: "user_accounts", pattern: /\b(customer accounts?|user registration|create account|customer login|sign[ -]?in|log[ -]?in)\b/i },
  { id: "role_permissions", pattern: /\b(role[- ]based (access|permissions?)|custom (staff )?roles?|staff permissions?|user permissions?)\b/i },
  { id: "media_uploads", pattern: /\b(file uploads?|media uploads?|upload (images|videos|pdfs|documents))\b/i },
  { id: "search_filter_sort", pattern: /\b(search and filters?|filter and sort|sorting and filtering|advanced search)\b/i },
  { id: "order_invoice_management", pattern: /\b(order management|manage orders|order statuses|order and invoice management)\b/i },
  { id: "activity_logs", pattern: /\b(activity logs?|admin action logs?|user activity history)\b/i },
  { id: "pdf_excel_export", pattern: /\b(pdf|excel|csv) (report|data|records?) export|export (reports?|records?) to (pdf|excel|csv)\b/i },
  { id: "automated_backups", pattern: /\b(automated backups?|scheduled backups?|backup and restore)\b/i },
  { id: "audit_trail", pattern: /\b(audit trails?|who changed|change history|record of changes)\b/i },
  { id: "api_integration", pattern: /\b(api integration|connect to (an? )?(external|third[- ]party) service|system integration)\b/i },

  { id: "advanced_product_management", pattern: /\b(product variants?|skus?|product attributes|variant management)\b/i },
  { id: "inventory_management", pattern: /\b(inventory management|stock management|low[- ]stock alerts?)\b/i },
  { id: "discount_coupons", pattern: /\b(coupons?|promo codes?|discount codes?)\b/i },
  { id: "wishlist", pattern: /\b(wishlists?|save (products?|items?) for later|favourite products?)\b/i },
  { id: "product_reviews", pattern: /\b(product reviews?|ratings? and reviews?|customer ratings?)\b/i },
  { id: "shipping_rules", pattern: /\b(shipping rules?|delivery charges? by|delivery fee calculation)\b/i },
  { id: "order_tracking", pattern: /\b(order tracking|track (my |your )?order|shipment tracking)\b/i },
  { id: "abandoned_cart", pattern: /\b(abandoned carts?|recover (unfinished|abandoned) carts?)\b/i },
  { id: "invoice_receipts", pattern: /\b(order invoices?|purchase receipts?|downloadable invoices?)\b/i },
  { id: "product_qr_codes", pattern: /\b(product qr codes?|qr labels? for products?)\b/i },
  { id: "loyalty_rewards", pattern: /\b(loyalty points?|rewards program|repeat[- ]customer rewards?)\b/i },
  { id: "bulk_product_import", pattern: /\b(bulk product imports?|import products? from (csv|excel)|product catalog import)\b/i },
  { id: "product_comparison", pattern: /\b(product comparisons?|compare products?)\b/i },
  { id: "multi_warehouse", pattern: /\b(multiple warehouses?|multi[- ]warehouse|warehouse stock)\b/i },

  { id: "multi_tenant_architecture", pattern: /\b(multi[- ]tenant|separate tenant workspaces?|tenant data isolation)\b/i },
  { id: "subscription_plans", pattern: /\b(subscription (plans?|management)|monthly and annual plans?|free basic pro enterprise plans?)\b/i },
  { id: "usage_metering", pattern: /\b(usage limits?|usage metering|api call limits?|storage limits?)\b/i },
  { id: "saas_super_admin", pattern: /\b(super admin|platform owner dashboard|manage all tenants)\b/i },
  { id: "vendor_management", pattern: /\b(vendor management|seller registration|vendor dashboard|multi[- ]vendor)\b/i },
  { id: "commission_payouts", pattern: /\b(commission (and|&)? ?payouts?|seller settlements?|vendor commissions?)\b/i },
  { id: "team_invitations", pattern: /\b(team invitations?|invite team members?|workspace members?)\b/i },
  { id: "white_label", pattern: /\b(white[- ]label|client[- ]specific branding|custom logos? per tenant)\b/i },
  { id: "automated_onboarding", pattern: /\b(onboarding wizard|automated onboarding|setup checklist)\b/i },
  { id: "trial_expiry", pattern: /\b(trial periods?|trial expiry|plan expiration)\b/i },
  { id: "referral_affiliate", pattern: /\b(referral (program|system)|affiliate system|referral links?)\b/i },
  { id: "usage_based_billing", pattern: /\b(usage[- ]based billing|billing by usage|pay per api call)\b/i },
  { id: "tenant_domains", pattern: /\b(tenant[- ]specific domains?|custom domains? for (each )?tenant)\b/i },
  { id: "data_import_export", pattern: /\b(tenant data import|data import and export|bulk data export)\b/i },
  { id: "feature_flags", pattern: /\b(feature flags?|plan[- ]based access|plan[- ]gated features?)\b/i },
  { id: "in_app_notifications", pattern: /\b(in[- ]app notifications?|application notifications?)\b/i },
  { id: "support_tickets", pattern: /\b(support ticket systems?|customer support tickets?)\b/i },
  { id: "knowledge_base", pattern: /\b(knowledge bases?|customer help cent(er|re)|help articles?)\b/i },
  { id: "platform_audit_monitoring", pattern: /\b(platform[- ]wide monitoring|platform audit|system monitoring dashboard)\b/i },

  { id: "ai_product_recommendations", pattern: /\b(ai product recommendations?|personalized product suggestions?)\b/i },
  { id: "ai_content_assistant", pattern: /\b(ai content assistant|generate (product )?descriptions? with ai|ai writing assistant)\b/i },
  { id: "smart_search", pattern: /\b(semantic search|ai[- ]powered search|smart search)\b/i },
  { id: "automated_email_workflows", pattern: /\b(automated email workflows?|email sequences?|drip email campaigns?)\b/i },
  { id: "scheduled_reports", pattern: /\b(scheduled reports?|weekly reports? by email|monthly report generation)\b/i },
  { id: "document_generation", pattern: /\b(generate (custom )?(certificates?|pdf documents?)|document generation)\b/i },
  { id: "third_party_webhooks", pattern: /\b(third[- ]party webhooks?|webhook notifications?)\b/i },
  { id: "crm_integration", pattern: /\b(crm integration|sync leads? (to|with) (a )?crm)\b/i },
  { id: "calendar_integration", pattern: /\b(calendar integration|sync bookings? (to|with) (google|outlook)? ?calendar)\b/i },

  { id: "two_factor_auth", pattern: /\b(two[- ]factor authentication|2fa|multi[- ]factor authentication)\b/i },
  { id: "login_rate_limiting", pattern: /\b(login rate limiting|limit login attempts?|brute[- ]force protection)\b/i },
  { id: "password_reset", pattern: /\b(password reset|forgot password workflow|account recovery)\b/i },
  { id: "session_management", pattern: /\b(session management|active sessions?|revoke sessions?)\b/i },
  { id: "security_hardening", pattern: /\b(security hardening|security audit|hardened configuration)\b/i },
  { id: "error_monitoring", pattern: /\b(error monitoring|error tracking|sentry integration)\b/i },
  { id: "performance_optimization", pattern: /\b(performance optimization|page speed optimization|core web vitals)\b/i },
  { id: "accessibility_improvements", pattern: /\b(accessibility improvements?|wcag compliance|keyboard accessibility)\b/i },
  { id: "data_retention_tools", pattern: /\b(data retention|data deletion (tools?|workflow)|delete my data workflow)\b/i },
  { id: "maintenance_updates", pattern: /\b(monthly maintenance|maintenance and updates|ongoing maintenance plan)\b/i },

  { id: "restaurant_qr_menu", pattern: /\b(digital menu|restaurant qr menu|menu qr codes?)\b/i },
  { id: "kitchen_order_tickets", pattern: /\b(kitchen order tickets?|kot system|kitchen display system)\b/i },
  { id: "table_reservations", pattern: /\b(table reservations?|reserve a table)\b/i },
  { id: "clinic_appointments", pattern: /\b(clinic appointments?|patient appointment scheduling)\b/i },
  { id: "staff_schedules", pattern: /\b(doctor schedules?|staff schedules?|provider availability)\b/i },
  { id: "school_attendance", pattern: /\b(student attendance|school attendance management)\b/i },
  { id: "parent_student_portal", pattern: /\b(parent portal|student portal|parent and student portal)\b/i },
  { id: "property_filters", pattern: /\b(property filters?|real estate filters?|filter properties by)\b/i },
  { id: "real_estate_agent_dashboard", pattern: /\b(real estate agent dashboard|agent listing dashboard)\b/i },
  { id: "booking_calendar", pattern: /\b(booking availability calendar|availability calendar|booking calendar)\b/i },
  { id: "booking_refund_workflow", pattern: /\b(booking cancellations? and refunds?|booking refund workflow)\b/i },
  { id: "employer_dashboard", pattern: /\b(employer dashboard|employer job listings?)\b/i },
  { id: "cv_application_tracking", pattern: /\b(cv uploads?|resume uploads?|application tracking)\b/i },
  { id: "course_progress", pattern: /\b(course progress( tracking)?|learning progress dashboard)\b/i },
  { id: "quizzes_assessments", pattern: /\b(quizzes and assessments|online assessments?|student quizzes)\b/i },
  { id: "event_ticketing", pattern: /\b(digital event tickets?|qr check[- ]in|event ticketing)\b/i },
];

export function detectWebsiteFeatures(text: string): {
  features: WebsiteEstimateFeature[];
  adminPanel: boolean;
  pricingPackage: PricingPackageId | null;
  addonIds: string[];
  assumptions: string[];
} {
  const features: WebsiteEstimateFeature[] = [];
  const addonIds: string[] = [];
  const assumptions: string[] = [];
  const has = (pattern: RegExp) => pattern.test(text);
  const adminPanel = has(/\b(admin|staff)\s+(dashboard|panel|portal|login|sign[ -]?in)\b|\bmanage products\b|\bproduct management\b/);

  const productCatalog = has(/\b(products?|catalog|shop|store|menu|items for sale)\b/);
  const ordering = has(/\b(add to cart|shopping cart|cart|checkout|place (an )?order|order online|online ordering|whatsapp order)\b/);
  const ecommerceCatalog = has(/\b(products?|catalog|shop|store|items for sale)\b/);
  const ecommerceStore = ecommerceCatalog && (
    ordering || has(/\b(e[ -]?commerce|online store|online shop|shop online)\b/)
  );
  const explicitSaas = has(/\b(saas|software as a service|subscription software|cloud[ -]based software)\b/i);
  const saasPlatform = has(
    /\b(?:software|crm|erp|project management|team collaboration|invoicing|accounting|hr management)\s+(?:as a )?(?:platform|system|software|tool)\b|\b(?:cloud|online|web)[ -]based platform\b/i
  );
  const saasCommercialSignals = has(
    /\b(subscription|free trial|pricing plans|monthly plan|annual plan|per user|workspace|dashboard|customer portal|sign[ -]?in|log[ -]?in)\b/i
  );
  const saasApplication = explicitSaas || (saasPlatform && saasCommercialSignals);
  const booking = has(/\b(book(ing)?|reservation|appointment|reserve a table|schedule a visit)\b/);
  const accounts = has(/\b(sign[ -]?in|log[ -]?in|create account|register|my account|customer portal)\b/);
  const payment = has(/\b(stripe|paypal|razorpay|paystack|authorize\.net|credit card|debit card|pay online|online payment gateway|payment gateway|online payment integration)\b/);
  const analytics = has(/\b(analytics dashboard|sales report|financial report|business analytics|revenue chart)\b/);
  const chatbot = has(
    /\b(?:chat|talk|message)\s+(?:to|with)\s+(?:our\s+)?(?:ai(?:\s+(?:chatbot|assistant))?|chatbot|virtual assistant)\b|\b(?:ask|try|open|start)\s+(?:our\s+)?(?:ai(?:\s+(?:chatbot|assistant))?|chatbot|virtual assistant)\b/i
  );
  const customIntegration = has(/\b(webhook integration|api integration|automated system sync|connect to (our )?(erp|crm|accounting software))\b/);
  const advancedEcommerce = ecommerceStore && (
    analytics ||
    customIntegration ||
    has(/\b(advanced inventory|multi[ -]?vendor|enterprise store|custom checkout)\b/)
  );
  const enterpriseSaas = saasApplication && has(
    /\b(enterprise|multi[ -]?tenant|white[ -]?label|single sign[ -]?on|sso|audit logs?|custom roles|advanced compliance)\b/i
  );
  const businessSaas = saasApplication && (
    analytics ||
    customIntegration ||
    has(/\b(team collaboration|workspaces?|crm|erp|billing|subscription management|multiple users|role[ -]?based access)\b/i)
  );
  const pricingPackage: PricingPackageId | null = ecommerceStore
    ? advancedEcommerce ? "ecommerce_advanced" : "ecommerce_business"
    : saasApplication
      ? enterpriseSaas ? "saas_enterprise" : businessSaas ? "saas_business" : "saas_starter"
      : null;

  if (productCatalog) {
    features.push({
      title: "Product ya menu catalog",
      explanation: "Public page par products, services, menu, ya items ki listing nazar aayi.",
      evidence: "Page text mein product/catalog/shop/menu se mutaliq alfaaz mile.",
    });
  }
  if (ordering) {
    features.push({
      title: "Online order aur cart",
      explanation: "Website par cart, checkout, online order, ya WhatsApp order ka ishara mila.",
      evidence: "Page text mein cart/checkout/order action ka zikr mila.",
    });
  }
  if (ecommerceStore) {
    features.push({
      title: "E-commerce store package",
      explanation: `Store signals match the ${advancedEcommerce ? ECOMMERCE_PACKAGES.ecommerce_advanced.label : ECOMMERCE_PACKAGES.ecommerce_business.label} starting package; final scope still needs review.`,
      evidence: "Product catalog and online shopping/cart signals were found on the public pages.",
    });
  }
  if (saasApplication && !ecommerceStore) {
    const packageLabel = pricingPackage && isSaasPackageId(pricingPackage)
      ? SAAS_PACKAGES[pricingPackage].label
      : "SaaS Starter";
    features.push({
      title: "SaaS application package",
      explanation: `Software platform signals match the ${packageLabel} starting package; final scope still needs review.`,
      evidence: "Public page par SaaS/software platform, subscription, trial, workspace, ya account signals mile.",
    });
  }
  if (booking) {
    features.push({
      title: "Booking ya appointment",
      explanation: "Customer booking, table reservation, ya appointment request kar sakta hai.",
      evidence: "Page text mein booking, reservation, ya appointment ka zikr mila.",
    });
  }
  if (accounts || adminPanel) {
    features.push({
      title: adminPanel ? "Admin ya staff area ka link" : "Customer login/account",
      explanation: adminPanel
        ? "Public website par admin/staff area ka link mila; is se admin access ki poori functionality confirm nahi hoti."
        : "Public page par account banane ya login karne ka option nazar aaya.",
      evidence: "Page text mein admin/staff ya customer account/login ka zikr mila.",
    });
  }
  if (payment) {
    features.push({
      title: "Online payment ka ishara",
      explanation: "Gateway ya card-based online payment ka public page par ishara mila.",
      evidence: "Page text mein online payment ya payment provider ka naam mila.",
    });
    addonIds.push("payment_gateway");
  }
  if (analytics) {
    features.push({
      title: "Analytics ya reports",
      explanation: "Business performance charts, sales, ya financial reports ka zikr mila.",
      evidence: "Page text mein analytics/reporting dashboard ka ishara mila.",
    });
    addonIds.push("advanced_dashboard");
  }
  if (chatbot) {
    features.push({
      title: "Chatbot ya AI assistant",
      explanation: "Website par chatbot ya AI assistant ka public ishara mila.",
      evidence: "Page text mein chatbot/AI assistant ka zikr mila.",
    });
    addonIds.push("ai_chatbot");
  }
  if (customIntegration) {
    features.push({
      title: "Custom API ya system integration",
      explanation: "Kisi external service ya doosray software ke saath integration ka ishara mila.",
      evidence: "Page text mein API, webhook, ya system sync ka zikr mila.",
    });
    addonIds.push("api_integration");
  }

  const needsPersistentData = productCatalog || ordering || booking || accounts;
  if (needsPersistentData && !ecommerceStore) {
    addonIds.push("supabase_db");
    assumptions.push("Listings, orders, bookings, ya accounts ke liye persistent database add-on farz kiya gaya hai; asal backend public page se verify nahi ho sakta.");
  }
  if (ecommerceStore) {
    assumptions.push(
      advancedEcommerce
        ? `Advanced e-commerce package use hua: ${ECOMMERCE_PACKAGES.ecommerce_advanced.label} ki starting price PKR 200,000 hai; final scope PKR 200,000–300,000 range mein confirm hota hai.`
        : `E-commerce business package use hua: ${ECOMMERCE_PACKAGES.ecommerce_business.label} ki starting price PKR 150,000 hai.`
    );
    assumptions.push("E-commerce package mein client admin, product/order management, inventory, aur standard checkout shamil hain; inhein generic add-ons ke taur par dobara charge nahi kiya gaya.");
  } else if (saasApplication && pricingPackage && isSaasPackageId(pricingPackage)) {
    const saasPackage = SAAS_PACKAGES[pricingPackage];
    const priceText = saasPackage.startingAt
      ? `PKR ${saasPackage.basePrice.toLocaleString("en-PK")}+`
      : `PKR ${saasPackage.basePrice.toLocaleString("en-PK")}`;
    assumptions.push(
      `${saasPackage.label} package use hua; is package ki listed base price ${priceText} hai.`
    );
    assumptions.push("SaaS package mein persistent database aur package ke mutabiq authentication, payment, aur analytics shamil hain; included features dobara charge nahi kiye gaye.");
  } else if (adminPanel) {
    assumptions.push("Public page par admin/staff area ka link mila, is liye Package 2 estimate kiya gaya hai; link se dashboard ka exact scope confirm nahi hota.");
  } else {
    assumptions.push("Client admin panel public page se confirm nahi hua, is liye Package 1 (Durrani-managed) use kiya gaya hai.");
  }
  if (payment && addonIds.includes("payment_gateway")) {
    assumptions.push("Payment add-on sirf visible gateway/card-payment signals par lagaya gaya hai; gateway account, third-party fees, aur exact integration scope shamil nahi.");
  }

  const detectedAddonIds = new Set(addonIds);
  for (const rule of ADDON_SCAN_RULES) {
    if (!has(rule.pattern)) continue;
    const addon = DEFAULT_PRICING_CONFIG.addons[rule.id];
    if (!addon) continue;
    if (!features.some((feature) => feature.title === addon.label)) {
      features.push({
        title: addon.label,
        explanation: addon.description,
        evidence: `Public page text matched a signal for ${addon.label.toLowerCase()}.`,
      });
    }
    if (addon.enabled) detectedAddonIds.add(rule.id);
  }

  if (features.length === 0) {
    features.push({
      title: "Public informational website",
      explanation: "Sirf public text aur pages dekhe gaye; koi advanced feature yaqini taur par detect nahi hua.",
      evidence: "Public page content mein supported feature signals nahi mile.",
    });
  }

  assumptions.push("Yeh visible public pages par mabni rough development estimate hai, asal invoice ya confirmed project price nahi.");
  assumptions.push("Login ke peechay ke features, private admin panels, source code, database, aur hidden integrations scan nahi kiye ja sakte.");
  assumptions.push("Hum third-party subscriptions, paid domains, payment gateway accounts, ya external API accounts provide nahi karte; client zaroorat par provider se khud arrange aur pay karta hai. Hamara Vercel deployment kaam web-app budget mein included hai, lekin Vercel ka paid hosting plan nahi.");

  return {
    features,
    adminPanel: ecommerceStore || saasApplication || adminPanel,
    pricingPackage,
    addonIds: Array.from(getChargeableAddonIds(
      Array.from(detectedAddonIds),
      pricingPackage,
      adminPanel ? "client_admin" : "none"
    )),
    assumptions,
  };
}

export async function estimateWebsite(
  input: string,
  currency: CurrencyCode = "PKR",
  rates: ExchangeRates = { PKR: 1 },
  exchangeRateDate?: string
): Promise<WebsiteEstimateResult> {
  const firstPage = await fetchPublicHtml(input);
  const pages: ScannedPage[] = [firstPage];
  const warnings: string[] = [];

  for (const candidate of getCandidateLinks(firstPage.html, firstPage.url)) {
    if (pages.length >= MAX_PAGES) break;
    try {
      const page = await fetchPublicHtml(candidate);
      if (new URL(page.url).origin === new URL(firstPage.url).origin) {
        pages.push(page);
      }
    } catch {
      warnings.push("Website ke kuch additional public pages nahi khul sake; estimate available pages par based hai.");
    }
  }

  const combinedHtml = pages
    .map((page) => {
      const controls = (page.html.match(/<(a|button|input|form)\b[^>]*>/gi) || []).join(" ");
      return `${page.html} ${controls}`;
    })
    .join(" ");
  const text = stripHtml(combinedHtml);
  const detected = detectWebsiteFeatures(text);
  const basePricingConfig = detected.pricingPackage
    ? getPricingPackageConfig(DEFAULT_PRICING_CONFIG, detected.pricingPackage)
    : DEFAULT_PRICING_CONFIG;
  const pricingConfig = getRegionalPricingConfig(basePricingConfig, currency, rates);
  if (currency !== "PKR") {
    detected.assumptions.unshift(
      "International base packages use 2x Pakistan rates converted with the latest available exchange rate; each detected add-on is a flat 100 units in the selected currency."
    );
  }
  const calculation = calculateBudget(
    detected.adminPanel ? "client_admin" : "none",
    detected.addonIds,
    pricingConfig
  );
  const siteTitle = getPageTitle(firstPage.html) || new URL(firstPage.url).hostname;
  const siteDescription =
    getMetaContent(firstPage.html, "description", "name") ||
    getMetaContent(firstPage.html, "og:description", "property");

  return {
    url: firstPage.url,
    currency,
    internationalPricing: currency !== "PKR",
    adminPanel: detected.adminPanel,
    ...(detected.pricingPackage ? { pricingPackage: detected.pricingPackage } : {}),
    ...(currency !== "PKR" ? { exchangeRate: rates[currency], exchangeRateDate } : {}),
    siteTitle,
    siteDescription,
    pagesScanned: pages.length,
    features: detected.features,
    basePackage: detected.pricingPackage
      ? isEcommercePackageId(detected.pricingPackage)
        ? ECOMMERCE_PACKAGES[detected.pricingPackage].label
        : SAAS_PACKAGES[detected.pricingPackage].label
      : detected.adminPanel ? "Package 2: Client Admin Panel" : "Package 1: Durrani-Managed",
    basePrice: calculation.basePrice,
    addons: calculation.selectedAddonDetails.map((addon) => ({
      id: addon.id,
      title: addon.label,
      price: addon.price,
      billingPeriod: addon.billingPeriod,
    })),
    monthlyAddonTotal: calculation.monthlyAddonTotal,
    estimatedTotal: calculation.estimatedTotal,
    assumptions: detected.assumptions,
    warnings,
  };
}
