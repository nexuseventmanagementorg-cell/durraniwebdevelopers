import { isIP } from "node:net";
import { LookupAddress, LookupOptions } from "node:dns";
import { lookup as dnsLookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import type { PortfolioProject, PricingRuleConfig } from "./types";
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
const HOSTED_DOMAIN_SUFFIXES = [
  "vercel.app",
  "netlify.app",
  "github.io",
  "pages.dev",
  "web.app",
  "firebaseapp.com",
  "onrender.com",
  "fly.dev",
  "herokuapp.com",
  "azurewebsites.net",
  "example",
  "test",
  "invalid",
  "localhost",
];

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

export interface ScannedPage {
  url: string;
  html: string;
}

export type WebsiteEvidenceStatus =
  | "public_signal"
  | "owner_confirmed"
  | "unknown"
  | "not_detected";

export interface WebsiteEstimateFeature {
  id: string;
  title: string;
  explanation: string;
  evidence: string;
  evidenceStatus: WebsiteEvidenceStatus;
  sourcePages: string[];
  addonId?: string;
}

export interface WebsiteEstimateResult {
  url: string;
  currency: CurrencyCode;
  internationalPricing: boolean;
  adminPanel: boolean;
  pricingPackage?: PricingPackageId;
  pricingOptions: WebsitePricingOption[];
  suggestedPricingOptionId: string;
  matchedTemplateId?: string;
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
  scannedPages: string[];
  features: WebsiteEstimateFeature[];
  addonCatalog: {
    id: string;
    title: string;
    description: string;
    price: number;
    basePrice?: number;
    billingPeriod?: "one_time" | "monthly";
  }[];
  basePackage: string;
  basePrice: number;
  basePriceWithAdmin: number;
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

export interface WebsitePricingOption {
  id: string;
  label: string;
  basePrice: number;
  basePriceWithAdmin: number;
  adminPanelType: "none" | "client_admin";
  pricingPackage?: PricingPackageId;
  maximumPrice?: number;
}

export function applyPortfolioTemplateStartingPrice(
  estimate: WebsiteEstimateResult,
  template: PortfolioProject,
  startingPrice: number
): WebsiteEstimateResult {
  const packageId = template.templatePricingPackage || estimate.pricingPackage;
  const selectedPackage = packageId
    ? estimate.pricingOptions.find((option) => option.id === packageId)
    : undefined;
  const templateOption: WebsitePricingOption = {
    id: `template_${template.id}`,
    label: `${template.title} — template starting plan`,
    basePrice: startingPrice,
    basePriceWithAdmin: startingPrice,
    adminPanelType: selectedPackage?.adminPanelType || (packageId ? "client_admin" : "none"),
    ...(packageId ? { pricingPackage: packageId } : {}),
  };
  const higherPricedOptions = estimate.pricingOptions.filter((option) => {
    if (option.id === packageId) return false;
    const price = option.adminPanelType === "client_admin"
      ? option.basePriceWithAdmin
      : option.basePrice;
    return price >= startingPrice;
  });

  return {
    ...estimate,
    pricingPackage: packageId,
    pricingOptions: [
      templateOption,
      ...higherPricedOptions.sort((left, right) => {
        const leftPrice = left.adminPanelType === "client_admin" ? left.basePriceWithAdmin : left.basePrice;
        const rightPrice = right.adminPanelType === "client_admin" ? right.basePriceWithAdmin : right.basePrice;
        return leftPrice - rightPrice;
      }),
    ],
    suggestedPricingOptionId: templateOption.id,
    matchedTemplateId: template.id,
    basePackage: templateOption.label,
    basePrice: startingPrice,
    basePriceWithAdmin: startingPrice,
    addons: [],
    monthlyAddonTotal: 0,
    estimatedTotal: startingPrice,
    assumptions: [
      `This URL matches the published ${template.title}. Its visible template features are included in the fixed ${estimate.currency} ${startingPrice.toLocaleString()} starting price; detected feature signals do not add inconsistent charges.`,
      ...estimate.assumptions,
    ],
  };
}

export type WebsiteScopeMode = "new_build" | "existing_site";
export type ExistingFeatureScope = "unknown" | "existing" | "new" | "repair";

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

function isPersonalDomainHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (isIP(host) || HOSTED_DOMAIN_SUFFIXES.some((suffix) =>
    host === suffix || host.endsWith(`.${suffix}`)
  )) {
    return false;
  }
  const labels = host.split(".");
  return labels.length >= 2 && /^[a-z]{2,24}$/.test(labels[labels.length - 1]);
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

function requestOnce(
  url: URL,
  addresses: PublicAddress[],
  allowXml = false
): Promise<HttpResult> {
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

        const isHtml = /^(text\/html|application\/xhtml\+xml)(;|$)/i.test(contentType);
        const isXml = allowXml && /^(application\/xml|text\/xml)(;|$)/i.test(contentType);
        if (!isHtml && !isXml) {
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

async function fetchPublicDocument(input: string, allowXml: boolean): Promise<ScannedPage> {
  let currentInput = input;
  const initialUrl = new URL(input);

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const { url, addresses } = await validateAndResolveUrl(currentInput);
    if (url.origin !== initialUrl.origin) {
      throw new Error("Cross-origin redirects are not scanned.");
    }
    const result = await requestOnce(url, addresses, allowXml);

    if (!result.location) {
      if (
        !allowXml &&
        !/^(text\/html|application\/xhtml\+xml)(;|$)/i.test(result.contentType)
      ) {
        throw new Error("Yeh URL HTML website page nahi hai.");
      }
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

      const anchorText = stripHtml(match[0]);
      const relevance = /product|shop|store|menu|category|order|booking|reservation|pricing|service|feature|about|account|login|dashboard|contact|cart|checkout|track|status|blog|faq/i
        .test(`${url.pathname} ${url.search} ${anchorText}`)
        ? 2
        : 0;
      const key = url.toString();
      scored.set(key, Math.max(scored.get(key) ?? -1, relevance));
    } catch {
      continue;
    }
  }

  return Array.from(scored.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_PAGES - 1)
    .map(([url]) => url);
}

async function getSitemapCandidates(
  origin: string,
  fetchDocument: (input: string, allowXml?: boolean) => Promise<ScannedPage>
): Promise<string[]> {
  try {
    const sitemap = await fetchDocument(new URL("/sitemap.xml", origin).toString(), true);
    const urls = Array.from(sitemap.html.matchAll(/<loc\b[^>]*>\s*([\s\S]*?)\s*<\/loc>/gi))
      .map((match) => decodeHtml(match[1]).trim())
      .filter((candidate) => {
        try {
          const parsed = new URL(candidate);
          return (
            parsed.origin === origin &&
            (parsed.protocol === "https:" || parsed.protocol === "http:") &&
            /product|shop|store|menu|category|order|booking|reservation|pricing|service|about|account|login|dashboard|contact|cart|checkout|track|status|blog|faq/i
              .test(`${parsed.pathname} ${parsed.search}`)
          );
        } catch {
          return false;
        }
      });
    return Array.from(new Set(urls)).slice(0, 20);
  } catch {
    return [];
  }
}

function getPageSignalText(page: ScannedPage): string {
  const linkedEvidence = Array.from(
    page.html.matchAll(/<a\b[^>]*href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a\s*>/gi)
  ).map((match) => `${match[1] || match[2] || match[3] || ""} ${stripHtml(match[4] || "")}`);
  const controlEvidence = Array.from(
    page.html.matchAll(/<(button|input|form|select|textarea|img)\b[^>]*>/gi)
  ).map((match) => match[0].replace(/<|>/g, " "));
  return `${stripHtml(page.html)} ${decodeHtml([...linkedEvidence, ...controlEvidence].join(" "))}`;
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
  { id: "user_accounts", pattern: /\b(customer accounts?|customer registration|register as a customer|create (a )?customer account|customer login|customer sign[ -]?in)\b/i },
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

export function detectWebsiteFeatures(
  text: string,
  sourcePages: string[] = [],
  pricingConfig: PricingRuleConfig = DEFAULT_PRICING_CONFIG
): {
  features: WebsiteEstimateFeature[];
  adminPanel: boolean;
  pricingPackage: PricingPackageId | null;
  addonIds: string[];
  assumptions: string[];
} {
  const features: Omit<
    WebsiteEstimateFeature,
    "id" | "evidenceStatus" | "sourcePages"
  >[] = [];
  const addonIds: string[] = [];
  const assumptions: string[] = [];
  const has = (pattern: RegExp) => pattern.test(text);
  const adminAreaSignal = has(/\b(admin|staff)\s+(dashboard|panel|portal|login|sign[ -]?in)\b|\bmanage products\b|\bproduct management\b|\/admin(?:\/|\b)/i);
  const adminPanel = false;

  const productCatalog = has(/\b(products?|catalog|shop|store|menu|items for sale)\b/);
  const cartSignal = has(/\b(add to cart|shopping cart|view cart|cart page|\/cart(?:\/|\b))/i);
  const checkoutSignal = has(/\b(checkout|\/checkout(?:\/|\b)|complete (your )?order|place (an )?order)\b/i);
  const whatsappSignal = has(/\bwhatsapp\b|wa\.me\/|api\.whatsapp\.com\/send|whatsapp:\/\/send/i);
  const onlineOrderingSignal = has(/\b(order online|online ordering)\b/);
  const ordering = cartSignal || checkoutSignal || has(/\b(order online|online ordering)\b/);
  const ecommerceCatalog = has(/\b(products?|catalog|shop|store|menu|items for sale)\b/);
  const ecommerceStore = ecommerceCatalog && cartSignal &&
    (checkoutSignal || onlineOrderingSignal || whatsappSignal);
  const explicitSaas = has(/\b(saas|software as a service|subscription software|cloud[ -]based software)\b/i);
  const saasPlatform = has(
    /\b(?:software|crm|erp|project management|team collaboration|invoicing|accounting|hr management)\s+(?:as a )?(?:platform|system|software|tool)\b|\b(?:cloud|online|web)[ -]based platform\b/i
  );
  const saasCommercialSignals = has(
    /\b(subscription|free trial|pricing plans|monthly plan|annual plan|per user|workspace|dashboard|customer portal|sign[ -]?in|log[ -]?in)\b/i
  );
  const saasApplication = explicitSaas || (saasPlatform && saasCommercialSignals);
  const booking = has(/\b(book(ing)?|reservation|appointment|reserve a table|schedule a visit)\b/);
  const accounts = has(/\b(customer registration|register as a customer|create (a )?customer account|customer login|customer sign[ -]?in|my customer account)\b/);
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
  if (has(/\b(search (products?|menu)|filter by categor(y|ies)|menu categor(y|ies)|category filter|filter and sort)\b/i)) {
    features.push({
      title: "Catalog search or category filtering signal",
      explanation: "Public text suggests catalog search or category filtering; the interaction has not been exercised.",
      evidence: "Search/filter wording appeared in the public page content.",
    });
  }
  if (checkoutSignal) {
    features.push({
      title: "Checkout or order-submission signal",
      explanation: "A public checkout/order-submission phrase or route was found; server-side validation and order handling are not verified.",
      evidence: "Checkout/order-submission wording or route matched.",
    });
  }
  if (ordering) {
    features.push({
      title: cartSignal ? "Cart interaction signal" : "Online order-submission wording",
      explanation: cartSignal
        ? "A public cart action or route was found; cart state, totals, and persistence are not verified."
        : "Public wording suggests online ordering, but it does not establish a cart or checkout workflow.",
      evidence: `Cart signal: ${cartSignal ? "yes" : "no"}; checkout/order signal: ${checkoutSignal ? "yes" : "no"}.`,
    });
  }
  if (whatsappSignal) {
    features.push({
      title: "WhatsApp click-to-chat signal",
      explanation: "A public WhatsApp contact/order link or reference was found. The customer may need to send the prepared message manually.",
      evidence: "WhatsApp text or a public click-to-chat URL was found; automated messaging is not verified.",
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
      addonId: "booking_calendar",
    });
  }
  if (accounts || adminAreaSignal) {
    features.push({
      title: adminAreaSignal ? "Admin/staff route or reference" : "Customer registration/login signal",
      explanation: adminAreaSignal
        ? "A public page references an admin/staff area. This does not prove a working dashboard or its capabilities."
        : "A customer-specific registration/login signal was found; authentication and account workflows are not verified.",
      evidence: adminAreaSignal
        ? "A public label, route, or management phrase matched an admin/staff signal."
        : "Customer-specific account wording appeared in public page text.",
      ...(adminAreaSignal ? { addonId: "admin_dashboard" } : {}),
    });
  }
  if (payment) {
    features.push({
      title: "Online payment ka ishara",
      explanation: "Gateway ya card-based online payment ka public page par ishara mila.",
      evidence: "Page text mein online payment ya payment provider ka naam mila.",
      addonId: "payment_gateway",
    });
    addonIds.push("payment_gateway");
  }
  if (analytics) {
    features.push({
      title: "Analytics ya reports",
      explanation: "Business performance charts, sales, ya financial reports ka zikr mila.",
      evidence: "Page text mein analytics/reporting dashboard ka ishara mila.",
      addonId: "advanced_dashboard",
    });
    addonIds.push("advanced_dashboard");
  }
  if (has(/\b(qr|qr code|qr-code)\b/i)) {
    const tableOrderingSignal = has(/\b(table|dine[- ]in|scan (to )?order|order from (your )?table)\b/i);
    features.push({
      title: tableOrderingSignal ? "Table QR ordering signal" : "QR code reference",
      explanation: tableOrderingSignal
        ? "Public text associates a QR code with table/dine-in ordering; QR operation and staff management are not verified."
        : "A QR reference or image may be present, but it does not establish table ordering.",
      evidence: tableOrderingSignal
        ? "QR signal and table/dine-in/order context appeared together."
        : "A QR reference appeared without corroborating table-ordering context.",
      ...(tableOrderingSignal ? { addonId: "restaurant_qr_menu" } : {}),
    });
  }
  if (chatbot) {
    features.push({
      title: "Chatbot ya AI assistant",
      explanation: "Website par chatbot ya AI assistant ka public ishara mila.",
      evidence: "Page text mein chatbot/AI assistant ka zikr mila.",
      addonId: "ai_chatbot",
    });
    addonIds.push("ai_chatbot");
  }
  if (customIntegration) {
    features.push({
      title: "Custom API ya system integration",
      explanation: "Kisi external service ya doosray software ke saath integration ka ishara mila.",
      evidence: "Page text mein API, webhook, ya system sync ka zikr mila.",
      addonId: "api_integration",
    });
    addonIds.push("api_integration");
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
  } else if (adminAreaSignal) {
    assumptions.push("A public admin/staff route or label is only a signal; it does not select the client-admin package or prove dashboard functionality.");
  } else {
    assumptions.push("Client admin panel public page se confirm nahi hua, is liye Package 1 (Durrani-managed) use kiya gaya hai.");
  }
  if (payment && addonIds.includes("payment_gateway")) {
    assumptions.push("Payment add-on sirf visible gateway/card-payment signals par lagaya gaya hai; gateway account, third-party fees, aur exact integration scope shamil nahi.");
  }

  const detectedAddonIds = new Set(addonIds);
  for (const rule of ADDON_SCAN_RULES) {
    if (!has(rule.pattern)) continue;
    const addon = pricingConfig.addons[rule.id];
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
      explanation: "No supported advanced feature signal was found in the scanned public pages; this does not establish that the feature is absent.",
      evidence: "Public page content mein supported feature signals nahi mile.",
    });
  }

  assumptions.push("Yeh visible public pages par mabni rough development estimate hai, asal invoice ya confirmed project price nahi.");
  assumptions.push("Scanner reads returned HTML only; JavaScript-rendered behavior, forms after submission, private routes, source code, and backend state are not verified.");
  assumptions.push("A feature not detected in the scanned pages may still exist on other pages, behind login, or in JavaScript; it is not proof that the feature is absent.");
  assumptions.push("Detected priced add-ons are included in the starting new-build estimate; uncheck any item that is not needed. Public signals are not proof that the feature is fully implemented.");
  assumptions.push("Login ke peechay ke features, private admin panels, source code, database, aur hidden integrations scan nahi kiye ja sakte. Unknown backend state is not treated as a Supabase integration.");
  assumptions.push("Personal domain setup is a PKR 10,000 one-time add-on; domain registration and renewal fees charged by the registrar are separate. Third-party subscriptions, payment gateway accounts, and external API accounts are arranged and paid for by the client.");

  const featuresWithEvidence = features.map((feature) => {
    const matchingAddon = Object.values(pricingConfig.addons)
      .find((addon) => addon.label.toLowerCase() === feature.title.toLowerCase());
    const id = matchingAddon?.id || feature.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    return {
      ...feature,
      id,
      evidenceStatus: "public_signal" as const,
      sourcePages: sourcePages.slice(0, 3),
      ...(feature.addonId || matchingAddon
        ? { addonId: feature.addonId || matchingAddon?.id }
        : {}),
    };
  });

  return {
    features: featuresWithEvidence,
    adminPanel,
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
  exchangeRateDate?: string,
  fetchDocument: (
    input: string,
    allowXml?: boolean
  ) => Promise<ScannedPage> = (input, allowXml = false) =>
    fetchPublicDocument(input, allowXml),
  configuredPricing: PricingRuleConfig = DEFAULT_PRICING_CONFIG
): Promise<WebsiteEstimateResult> {
  const firstPage = await fetchDocument(input, false);
  const pages: ScannedPage[] = [firstPage];
  const warnings: string[] = [];
  const visited = new Set([new URL(firstPage.url).toString()]);
  const sitemapCandidates = await getSitemapCandidates(new URL(firstPage.url).origin, fetchDocument);

  const candidates = [
    ...sitemapCandidates,
    ...getCandidateLinks(firstPage.html, firstPage.url),
  ];
  for (const candidate of candidates) {
    if (pages.length >= MAX_PAGES) break;
    const normalizedCandidate = new URL(candidate).toString();
    if (visited.has(normalizedCandidate)) continue;
    visited.add(normalizedCandidate);
    try {
      const page = await fetchDocument(candidate, false);
      if (new URL(page.url).origin === new URL(firstPage.url).origin) {
        pages.push(page);
      }
    } catch {
      warnings.push("Website ke kuch additional public pages nahi khul sake; estimate available pages par based hai.");
    }
  }

  const text = pages.map(getPageSignalText).join(" ");
  const detected = detectWebsiteFeatures(text, [], configuredPricing);
  const featuresByPage = pages.map((page) => ({
    url: page.url,
    ids: new Set(
      detectWebsiteFeatures(getPageSignalText(page), [], configuredPricing)
        .features.map((feature) => feature.id)
    ),
  }));
  detected.features = detected.features.map((feature) => ({
    ...feature,
    sourcePages: featuresByPage
      .filter((page) => page.ids.has(feature.id))
      .map((page) => page.url),
  }));
  if (isPersonalDomainHost(new URL(firstPage.url).hostname)) {
    detected.features.push({
      id: "personal_domain",
      title: "Personal domain setup signal",
      explanation: "The scanned site uses a personal/custom domain. Select this one-time setup add-on for a new build; registrar purchase and renewal fees are separate.",
      evidence: `The public website uses the custom domain ${new URL(firstPage.url).hostname}.`,
      evidenceStatus: "public_signal",
      sourcePages: [firstPage.url],
      addonId: "personal_domain",
    });
  }
  const standardPricingConfig = {
    ...configuredPricing,
    baseWithoutAdmin: DEFAULT_PRICING_CONFIG.baseWithoutAdmin,
    baseWithAdmin: DEFAULT_PRICING_CONFIG.baseWithAdmin,
  };
  const basePricingConfig = detected.pricingPackage
    ? getPricingPackageConfig(configuredPricing, detected.pricingPackage)
    : standardPricingConfig;
  const pricingConfig = getRegionalPricingConfig(basePricingConfig, currency, rates);
  const standardPricing = getRegionalPricingConfig(standardPricingConfig, currency, rates);
  const pricingOptions: WebsitePricingOption[] = [
    {
      id: "package_1",
      label: "Package 1: Durrani-Managed",
      basePrice: standardPricing.baseWithoutAdmin,
      basePriceWithAdmin: standardPricing.baseWithAdmin,
      adminPanelType: "none",
    },
    {
      id: "package_2",
      label: "Package 2: Client Admin Panel",
      basePrice: standardPricing.baseWithoutAdmin,
      basePriceWithAdmin: standardPricing.baseWithAdmin,
      adminPanelType: "client_admin",
    },
    ...Object.entries(ECOMMERCE_PACKAGES).map(([id, packageDetails]) => {
      const packageConfig = getRegionalPricingConfig(
        getPricingPackageConfig(configuredPricing, id as PricingPackageId),
        currency,
        rates
      );
      const maximumPrice = "maximumPrice" in packageDetails
        ? getRegionalPricingConfig(
            {
              ...getPricingPackageConfig(configuredPricing, id as PricingPackageId),
              baseWithoutAdmin: packageDetails.maximumPrice,
              baseWithAdmin: packageDetails.maximumPrice,
            },
            currency,
            rates
          ).baseWithoutAdmin
        : undefined;
      return {
        id,
        label: packageDetails.label,
        basePrice: packageConfig.baseWithoutAdmin,
        basePriceWithAdmin: packageConfig.baseWithAdmin,
        adminPanelType: "client_admin" as const,
        pricingPackage: id as PricingPackageId,
        ...(maximumPrice !== undefined ? { maximumPrice } : {}),
      };
    }),
    ...Object.entries(SAAS_PACKAGES).map(([id, packageDetails]) => {
      const packageConfig = getRegionalPricingConfig(
        getPricingPackageConfig(configuredPricing, id as PricingPackageId),
        currency,
        rates
      );
      return {
        id,
        label: packageDetails.label,
        basePrice: packageConfig.baseWithoutAdmin,
        basePriceWithAdmin: packageConfig.baseWithAdmin,
        adminPanelType: "none" as const,
        pricingPackage: id as PricingPackageId,
      };
    }),
  ];
  const suggestedPricingOptionId = detected.pricingPackage ||
    (detected.adminPanel ? "package_2" : "package_1");
  if (currency !== "PKR") {
    detected.assumptions.unshift(
      "International base packages use 2x Pakistan rates converted with the latest available exchange rate; each selected one-time add-on is a flat 100 units in the selected currency."
    );
  }
  const selectedPricingOption = pricingOptions.find(
    (option) => option.id === suggestedPricingOptionId
  );
  const selectedPackageId = selectedPricingOption?.pricingPackage;
  const requestedAddonIds = Array.from(new Set([
    ...detected.addonIds,
    ...detected.features.flatMap((feature) => feature.addonId ? [feature.addonId] : []),
    ...(isPersonalDomainHost(new URL(firstPage.url).hostname) ? ["personal_domain"] : []),
  ]));
  const chargeableAddonIds = getChargeableAddonIds(
    requestedAddonIds,
    selectedPackageId,
    selectedPricingOption?.adminPanelType
  );
  const calculation = calculateBudget(
    selectedPricingOption?.adminPanelType || "none",
    chargeableAddonIds,
    pricingConfig
  );
  const adminPanelCalculation = calculateBudget("client_admin", [], pricingConfig);
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
    pricingOptions,
    suggestedPricingOptionId,
    ...(currency !== "PKR" ? { exchangeRate: rates[currency], exchangeRateDate } : {}),
    siteTitle,
    siteDescription,
    pagesScanned: pages.length,
    scannedPages: pages.map((page) => page.url),
    features: detected.features,
    addonCatalog: Object.values(pricingConfig.addons)
      .filter((addon) => addon.enabled)
      .map((addon) => ({
        id: addon.id,
        title: addon.label,
        description: addon.description,
        price: addon.price,
        ...(currency === "PKR"
          ? { basePrice: configuredPricing.addons[addon.id]?.price ?? addon.price }
          : {}),
        billingPeriod: addon.billingPeriod || "one_time",
      })),
    basePackage: detected.pricingPackage
      ? isEcommercePackageId(detected.pricingPackage)
        ? ECOMMERCE_PACKAGES[detected.pricingPackage].label
        : SAAS_PACKAGES[detected.pricingPackage].label
      : detected.adminPanel ? "Package 2: Client Admin Panel" : "Package 1: Durrani-Managed",
    basePrice: calculation.basePrice,
    basePriceWithAdmin: adminPanelCalculation.basePrice,
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
