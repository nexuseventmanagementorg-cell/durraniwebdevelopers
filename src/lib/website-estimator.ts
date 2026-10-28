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
import { getPortfolioFeatureLabels, getTemplatePriceBreakdown, getTemplateRequestPlans } from "./template-pricing";
import { CurrencyCode, ExchangeRates, getRegionalPricingConfig } from "./currency";
import {
  getBusinessAddonDetectionRules,
  getBusinessAddonCatalog,
} from "./business-addon-catalog";

const MAX_URL_LENGTH = 2048;
const MAX_HTML_BYTES = 5_000_000;
const MAX_STYLESHEET_BYTES = 512_000;
const MAX_STYLESHEETS = 2;
const MAX_REDIRECTS = 3;
const MAX_PAGES = 24;
const MAX_CANDIDATE_URLS = 80;
const PAGE_FETCH_CONCURRENCY = 6;
const REQUEST_TIMEOUT_MS = 8000;
const MAX_SCAN_DURATION_MS = 45_000;
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
  truncated?: boolean;
}

export function readBoundedHtmlBody(
  response: NodeJS.ReadableStream & { destroy?: (error?: Error) => unknown },
  maxBytes = MAX_HTML_BYTES
): Promise<{ body: string; truncated: boolean }> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    let settled = false;
    const finish = (error?: Error, truncated = false) => {
      if (settled) return;
      settled = true;
      if (error) {
        reject(error);
        return;
      }
      resolve({
        body: Buffer.concat(chunks).toString("utf8"),
        truncated,
      });
    };

    response.on("data", (chunk: Buffer | string) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      const remainingBytes = maxBytes - totalBytes;
      if (buffer.length > remainingBytes) {
        if (remainingBytes > 0) chunks.push(buffer.subarray(0, remainingBytes));
        totalBytes = maxBytes;
        finish(undefined, true);
        queueMicrotask(() => response.destroy?.());
        return;
      }
      chunks.push(buffer);
      totalBytes += buffer.length;
    });

    response.on("end", () => finish());
    response.on("error", (error: Error) => finish(error));
  });
}

export interface ScannedPage {
  url: string;
  html: string;
  truncated?: boolean;
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
  pageInventory: {
    url: string;
    title: string;
    type: string;
  }[];
  designSignals: string[];
  architectureSignals: string[];
  features: WebsiteEstimateFeature[];
  addonCatalog: {
    id: string;
    title: string;
    description: string;
    price: number;
    basePrice?: number;
    billingPeriod?: "one_time" | "monthly";
    businessCategories?: string[];
    businessTypes?: string[];
    pricingLevel?: "basic" | "expanded" | "complex";
    origin?: "existing" | "new";
    requiresCustomQuote?: boolean;
  }[];
  suggestedBusinessCategoryId?: string;
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
  estimatedMaximumTotal?: number;
  contingencyPercentage?: number;
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
  startingPrice: number,
  startingAddonIds: string[] = template.templateIncludedAddonIds || [],
  pricingConfig: PricingRuleConfig = DEFAULT_PRICING_CONFIG
): WebsiteEstimateResult {
  const packageId = template.templatePricingPackage || estimate.pricingPackage;
  const selectedPackage = packageId
    ? estimate.pricingOptions.find((option) => option.id === packageId)
    : undefined;
  const templateOption: WebsitePricingOption = {
    id: packageId || `template_${template.id}`,
    label: selectedPackage?.label || `${template.title} — template starting plan`,
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
  const templatePlan = getTemplateRequestPlans(template)[0];
  const templateBreakdown = getTemplatePriceBreakdown(
    template,
    estimate.addonCatalog.map((addon) => ({
      ...addon,
      label: addon.title,
      category: pricingConfig.addons[addon.id]?.category || "business",
      enabled: true,
    })),
    templatePlan
  );
  const conversionRate = templatePlan.price > 0
    ? startingPrice / templatePlan.price
    : 1;
  const includedAddonIdSet = new Set(startingAddonIds);
  const addons = templateBreakdown.includedAddons
    .filter((addon) => includedAddonIdSet.has(addon.id))
    .map((addon) => ({
      id: addon.id,
      title: addon.label,
      price: Math.round(addon.includedPrice * conversionRate * 100) / 100,
      billingPeriod: addon.billingPeriod,
    }));
  const addonTotal = addons
    .filter((addon) => addon.billingPeriod !== "monthly")
    .reduce((total, addon) => total + addon.price, 0);
  const monthlyAddonTotal = addons
    .filter((addon) => addon.billingPeriod === "monthly")
    .reduce((total, addon) => total + addon.price, 0);
  const confirmedFeatures = getPortfolioFeatureLabels(
    template,
    estimate.addonCatalog.map((addon) => ({
      ...addon,
      label: addon.title,
      category: pricingConfig.addons[addon.id]?.category || "business",
      enabled: true,
    }))
  );
  const includedAddonIds = new Set(startingAddonIds);
  if (templateOption.adminPanelType === "client_admin") {
    includedAddonIds.add("admin_dashboard");
  }
  const features = [...estimate.features];
  for (const id of Array.from(includedAddonIds)) {
    const catalogAddon = estimate.addonCatalog.find((addon) => addon.id === id);
    if (!catalogAddon) continue;
    const existingFeature = features.find((feature) => feature.addonId === id);
    if (existingFeature) {
      existingFeature.evidenceStatus = "owner_confirmed";
      existingFeature.explanation = `Included in the verified ${template.title} project scope.`;
      existingFeature.evidence = "Confirmed project record; this feature is not inferred from the public page scan.";
      existingFeature.sourcePages = [];
      continue;
    }
    features.push({
      id,
      title: catalogAddon.title,
      explanation: `Included in the verified ${template.title} project scope.`,
      evidence: "Confirmed project record; this feature is not inferred from the public page scan.",
      evidenceStatus: "owner_confirmed",
      sourcePages: [],
      addonId: id,
    });
  }
  for (const title of confirmedFeatures) {
    const normalizedTitle = title.toLowerCase();
    if (features.some((feature) =>
      feature.title.toLowerCase() === normalizedTitle ||
      (feature.addonId && estimate.addonCatalog.find((addon) =>
        addon.id === feature.addonId && addon.title.toLowerCase() === normalizedTitle
      ))
    )) continue;
    features.push({
      id: `verified-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
      title,
      explanation: `Listed in the verified ${template.title} project feature record.`,
      evidence: "Confirmed project record; this feature is not inferred from the public page scan.",
      evidenceStatus: "owner_confirmed",
      sourcePages: [],
    });
  }

  return {
    ...estimate,
    features,
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
    basePackage: selectedPackage?.label || templateOption.label,
    basePrice: startingPrice,
    basePriceWithAdmin: startingPrice,
    addons,
    monthlyAddonTotal,
    estimatedTotal: startingPrice + addonTotal,
    assumptions: [
      `This URL matches the published ${template.title}. The ${estimate.currency} ${startingPrice.toLocaleString()} ${templateOption.label} starting price is stable; template-specific add-ons are listed separately.`,
      "Features listed for this known template are owner-confirmed from its project record; other public scan signals remain unverified.",
      ...estimate.assumptions,
    ],
  };
}

export type WebsiteScopeMode =
  | "unselected"
  | "basic_informational"
  | "standard_ecommerce"
  | "advanced_ecommerce"
  | "saas_platform"
  | "multi_vendor_marketplace"
  | "enterprise_marketplace"
  | "existing_site"
  | "custom_review";
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
  allowXml = false,
  allowCss = false
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
          "User-Agent": "curl",
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
        const isCss = allowCss && /^text\/css(?:;|$)/i.test(contentType);
        if (!isHtml && !isXml && !isCss && contentType) {
          response.resume();
          reject(new Error(allowCss
            ? "Stylesheet response type is not supported."
            : "Yeh URL HTML website page nahi hai."));
          return;
        }

        readBoundedHtmlBody(response, allowCss ? MAX_STYLESHEET_BYTES : MAX_HTML_BYTES).then(({ body, truncated }) => {
          resolve({
            statusCode,
            contentType,
            body,
            truncated,
          });
        }, reject);
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

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const { url, addresses } = await validateAndResolveUrl(currentInput);
    const result = await requestOnce(url, addresses, allowXml);

    if (!result.location) {
      if (!isSupportedPublicDocument(result.contentType, result.body, allowXml)) {
        throw new Error("Yeh URL HTML website page nahi hai.");
      }
      return {
        url: url.toString(),
        html: result.body,
        ...(result.truncated ? { truncated: true } : {}),
      };
    }
    if (redirects === MAX_REDIRECTS) {
      throw new Error("Website par bohat zyada redirects hain.");
    }

    currentInput = new URL(result.location, url).toString();
  }

  throw new Error("Website ko scan nahi kiya ja saka.");
}

async function fetchPublicStylesheet(input: string, expectedOrigin: string): Promise<string> {
  let currentInput = input;

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const { url, addresses } = await validateAndResolveUrl(currentInput);
    if (url.origin !== expectedOrigin) {
      throw new Error("Cross-origin stylesheets are not scanned.");
    }

    const result = await requestOnce(url, addresses, false, true);
    if (!result.location) {
      if (!/^text\/css(?:;|$)/i.test(result.contentType)) {
        throw new Error("Stylesheet response type is not supported.");
      }
      return result.body;
    }
    if (redirects === MAX_REDIRECTS) {
      throw new Error("Stylesheet has too many redirects.");
    }

    const nextUrl = new URL(result.location, url);
    if (nextUrl.origin !== expectedOrigin) {
      throw new Error("Cross-origin stylesheet redirects are not scanned.");
    }
    currentInput = nextUrl.toString();
  }

  throw new Error("Stylesheet could not be scanned.");
}

function getStylesheetCandidates(pages: ScannedPage[], origin: string): string[] {
  const candidates = new Set<string>();
  for (const page of pages.slice(0, 6)) {
    const base = new URL(page.url);
    for (const tag of page.html.match(/<link\b[^>]*>/gi) || []) {
      const rel = tag.match(/\brel\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
      if (!/\bstylesheet\b/i.test(rel?.[1] || rel?.[2] || rel?.[3] || "")) continue;
      const href = tag.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const value = decodeHtml(href?.[1] || href?.[2] || href?.[3] || "").trim();
      if (!value) continue;
      try {
        const stylesheet = new URL(value, base);
        if (stylesheet.origin !== origin || stylesheet.protocol !== base.protocol) continue;
        stylesheet.hash = "";
        stylesheet.search = "";
        candidates.add(stylesheet.toString());
      } catch {
        continue;
      }
    }
  }
  return Array.from(candidates).slice(0, MAX_STYLESHEETS);
}

async function readPublicStylesheets(
  pages: ScannedPage[],
  origin: string,
  fetchStylesheet: (input: string, expectedOrigin: string) => Promise<string>
): Promise<{ stylesheets: string[]; incomplete: boolean }> {
  const candidates = getStylesheetCandidates(pages, origin);
  const results = await Promise.all(candidates.map(async (candidate) => {
    try {
      return await fetchStylesheet(candidate, origin);
    } catch {
      return null;
    }
  }));
  return {
    stylesheets: results.filter((result): result is string => result !== null),
    incomplete: results.some((result) => result === null),
  };
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

function isScannablePublicPagePath(pathname: string): boolean {
  return !/\.(?:avif|css|csv|docx?|gif|ico|jpe?g|js|json|pdf|png|svg|txt|webp|xml|zip)$/i.test(pathname) &&
    !/(?:^|\/)api(?:\/|$)/i.test(pathname);
}

export function isSupportedPublicDocument(
  contentType: string,
  body: string,
  allowXml = false
): boolean {
  const isHtml = /^(text\/html|application\/xhtml\+xml)(;|$)/i.test(contentType);
  const isXml = allowXml && /^(application\/xml|text\/xml)(;|$)/i.test(contentType);
  if (isHtml || isXml) return true;

  if (contentType && !/^text\/plain(?:;|$)/i.test(contentType)) return false;

  const prefix = body.replace(/^\uFEFF/, "").trimStart().replace(/^<!--[\s\S]*?-->\s*/, "");
  return /^(?:<!doctype\s+html\b|<html\b|<head\b|<body\b|<title\b)/i.test(prefix) ||
    (allowXml && /^(?:<\?xml\b|<(?:urlset|sitemapindex)\b)/i.test(prefix));
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
        url.password ||
        !isScannablePublicPagePath(url.pathname)
      ) continue;

      url.hash = "";
      url.search = "";
      if (url.pathname === base.pathname) continue;

      const anchorText = stripHtml(match[0]);
      const candidateText = `${url.pathname} ${anchorText}`;
      const relevance = /product|category|collection|shop|store|menu|service|pricing|about|contact|faq|blog|seller|vendor|marketplace|feature|integration|subscription|inventory|review/i
        .test(candidateText) ? 3 : 1;
      const key = url.toString();
      scored.set(key, Math.max(scored.get(key) ?? -1, relevance));
    } catch {
      continue;
    }
  }

  return Array.from(scored.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_CANDIDATE_URLS)
    .map(([url]) => url);
}

async function getSitemapCandidates(
  origin: string,
  fetchDocument: (input: string, allowXml?: boolean) => Promise<ScannedPage>
): Promise<string[]> {
  try {
    const sitemap = await fetchDocument(new URL("/sitemap.xml", origin).toString(), true);
    let sitemapHtml = sitemap.html;
    if (/<sitemapindex\b/i.test(sitemapHtml)) {
      const childSitemaps = Array.from(sitemapHtml.matchAll(/<loc\b[^>]*>\s*([\s\S]*?)\s*<\/loc>/gi))
        .map((match) => decodeHtml(match[1]).trim())
        .filter((candidate) => {
          try {
            return new URL(candidate).origin === origin;
          } catch {
            return false;
          }
        })
        .slice(0, 3);
      const childResults = await Promise.all(
        childSitemaps.map(async (candidate) => {
          try {
            return await fetchDocument(candidate, true);
          } catch {
            return null;
          }
        })
      );
      sitemapHtml = childResults
        .filter((result): result is ScannedPage => result !== null)
        .map((result) => result.html)
        .join(" ");
    }
    const urls = Array.from(sitemapHtml.matchAll(/<loc\b[^>]*>\s*([\s\S]*?)\s*<\/loc>/gi))
      .map((match) => decodeHtml(match[1]).trim())
      .filter((candidate) => {
        try {
          const parsed = new URL(candidate);
          return (
            parsed.origin === origin &&
            (parsed.protocol === "https:" || parsed.protocol === "http:") &&
          isScannablePublicPagePath(parsed.pathname) &&
          /product|shop|store|menu|category|order|booking|reservation|pricing|service|about|contact|account|login|dashboard|cart|checkout|track|status|blog|faq|customer|sales|report|credit|payment|delivery|table|qr|staff|admin|feature|seller|vendor|marketplace|integration|subscription|inventory|review/i
            .test(`${parsed.pathname} ${parsed.search}`)
          );
        } catch {
          return false;
        }
      });
    const normalizeCandidate = (candidate: string) => {
      const url = new URL(candidate);
      url.hash = "";
      url.search = "";
      return url.toString();
    };
    const relevance = (candidate: string) =>
      /product|shop|store|menu|category|pricing|service|about|contact|blog|faq|feature|seller|vendor|marketplace|integration|subscription|inventory|review/i
        .test(candidate) ? 3 : 1;
    return Array.from(new Set(urls.map(normalizeCandidate)))
      .sort((left, right) => relevance(right) - relevance(left))
      .slice(0, MAX_CANDIDATE_URLS);
  } catch {
    return [];
  }
}

function getPageSignalText(page: ScannedPage): string {
  const markup = page.html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ");
  const linkedEvidence = Array.from(
    page.html.matchAll(/<a\b[^>]*href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a\s*>/gi)
  ).map((match) => {
    const href = decodeHtml(match[1] || match[2] || match[3] || "").trim();
    let hrefSignal = href;
    try {
      const link = new URL(href, page.url);
      link.hash = "";
      link.search = "";
      hrefSignal = `${link.hostname}${link.pathname}`;
    } catch {
      hrefSignal = href.split(/[?#]/, 1)[0];
    }
    return `${hrefSignal} ${stripHtml(match[4] || "")}`;
  });
  const controlEvidence = Array.from(
    markup.matchAll(/<(a|button|input|form|select|textarea|img|div|span)\b[^>]*>/gi)
  ).flatMap((match) => {
    const attributes = match[0].matchAll(
      /\b(aria-label|alt|data-target|id|name|placeholder|role|title)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi
    );
    return Array.from(attributes, (attribute) =>
      attribute[2] || attribute[3] || attribute[4] || ""
    );
  });
  const metadata = [
    getPageTitle(page.html),
    getMetaContent(page.html, "description", "name"),
    getMetaContent(page.html, "keywords", "name"),
    getMetaContent(page.html, "og:title", "property"),
    getMetaContent(page.html, "og:description", "property"),
    getMetaContent(page.html, "og:type", "property"),
  ];
  return `${stripHtml(page.html)} ${decodeHtml([...metadata, ...linkedEvidence, ...controlEvidence].join(" "))}`;
}

function classifyPublicPage(page: ScannedPage): string {
  const url = new URL(page.url);
  const path = `${url.pathname} ${getPageTitle(page.html)}`.toLowerCase();
  if (url.pathname === "/" || url.pathname === "") return "Home";
  if (/\/dp\/|\/products?\/[^/]+|\/p\/[^/]+/.test(path)) return "Product detail";
  if (/product|category|collection|catalog|shop/.test(path)) return "Product/category listing";
  if (/seller|vendor|marketplace/.test(path)) return "Seller or marketplace";
  if (/service|solution/.test(path)) return "Services";
  if (/about|team|company/.test(path)) return "About";
  if (/contact|support|help/.test(path)) return "Contact/support";
  if (/pricing|plans/.test(path)) return "Pricing/plans";
  if (/blog|article|news/.test(path)) return "Blog/article";
  if (/faq|policy|terms|privacy/.test(path)) return "Information/policy";
  if (/booking|reservation|appointment/.test(path)) return "Booking";
  return "Public content";
}

function getPageInventory(pages: ScannedPage[]): WebsiteEstimateResult["pageInventory"] {
  return pages.map((page) => ({
    url: page.url,
    title: getPageTitle(page.html) || new URL(page.url).pathname || "Home",
    type: classifyPublicPage(page),
  }));
}

function getDesignSignals(pages: ScannedPage[], externalStylesheets: string[] = []): string[] {
  const html = pages.slice(0, 6).map((page) => page.html).join(" ");
  const styles = [
    ...(html.match(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi) || []),
    ...(html.match(/\bstyle\s*=\s*(?:"[^"]*"|'[^']*')/gi) || []),
    ...externalStylesheets,
  ].join(" ");
  const classNames = Array.from(html.matchAll(/\bclass\s*=\s*(?:"([^"]*)"|'([^']*)')/gi))
    .map((match) => match[1] || match[2] || "")
    .join(" ");
  const signals: string[] = [];
  const colors = Array.from(new Set([
    ...Array.from(html.matchAll(/<meta\b[^>]*name\s*=\s*["']theme-color["'][^>]*content\s*=\s*["']([^"']+)["']/gi), (match) => match[1]),
    ...Array.from(styles.matchAll(/#[0-9a-f]{3,8}\b|rgba?\([^)]{1,80}\)|hsla?\([^)]{1,80}\)/gi), (match) => match[0]),
  ])).slice(0, 6);
  if (colors.length) signals.push(`Visible CSS color palette signals: ${colors.join(", ")}`);

  const fonts = Array.from(new Set(
    Array.from(styles.matchAll(/font-family\s*:\s*([^;}]+)/gi), (match) =>
      match[1].trim().replace(/!important/gi, "").slice(0, 80)
    )
  )).slice(0, 3);
  if (fonts.length) signals.push(`Typography declarations: ${fonts.join("; ")}`);

  if (/<meta\b[^>]*name\s*=\s*["']viewport["']/i.test(html) || /@media\b/i.test(styles) || /(?:^|\s)(?:sm|md|lg|xl):/i.test(classNames)) {
    signals.push("Responsive layout signal found (viewport, breakpoints, or responsive utility classes).");
  }
  if (/wp-content|wp-includes/i.test(html)) signals.push("WordPress asset/path signal found.");
  if (/cdn\.shopify\.com|Shopify\.theme|\/cdn\/shop\//i.test(html)) signals.push("Shopify storefront asset signal found.");
  if (/static\.wixstatic\.com|wix-code/i.test(html)) signals.push("Wix asset/runtime signal found.");
  if (/squarespace\.com\/static|static1\.squarespace\.com/i.test(html)) signals.push("Squarespace asset signal found.");
  if (/\b(?:Mui[A-Z]\w*|MuiButton-root)\b/.test(classNames)) signals.push("Material UI component-class signal found.");
  if (/\b(?:container-fluid|navbar-expand-|btn-primary|col-(?:sm|md|lg)-\d)\b/.test(classNames)) signals.push("Bootstrap-style component classes found.");
  if (/\b(?:sm|md|lg|xl):(?:flex|grid|block|hidden|w-|text-)/.test(classNames)) signals.push("Tailwind-style responsive utility classes found.");
  if (!signals.some((signal) => /Responsive layout signal/.test(signal))) {
    signals.push("Responsive behavior could not be confirmed from the returned static HTML/CSS.");
  }
  return signals;
}

function getArchitectureSignals(pages: ScannedPage[]): string[] {
  const text = pages.map(getPageSignalText).join(" ");
  const signals: string[] = [];
  if (/\b(?:become a seller|sell on (?:our|the|amazon)|seller central|seller dashboard|vendor portal|join (?:our|the) marketplace|multi[- ]vendor marketplace)\b/i.test(text)) {
    signals.push("Public seller/vendor enrollment or marketplace wording found; seller dashboards, payouts, and backend operations are not verified.");
  }
  if (/\b(?:multiple domains per (?:seller|vendor|store)|multi[- ]domain (?:platform|storefront)|custom domains? for (?:each|every) (?:seller|vendor|store)|domain mapping for stores)\b/i.test(text)) {
    signals.push("Explicit multi-domain storefront wording found; domain routing and tenant isolation are not verified.");
  }
  const primaryHost = new URL(pages[0].url).hostname.replace(/^www\./i, "");
  const linkedSubdomains = new Set<string>();
  for (const page of pages) {
    for (const match of Array.from(page.html.matchAll(/<a\b[^>]*href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi))) {
      try {
        const host = new URL(decodeHtml(match[1] || match[2] || match[3] || ""), page.url).hostname.toLowerCase();
        const canonicalHost = host.replace(/^www\./i, "");
        if (canonicalHost !== primaryHost && canonicalHost.endsWith(`.${primaryHost}`)) {
          linkedSubdomains.add(host);
        }
      } catch {
        continue;
      }
    }
  }
  if (linkedSubdomains.size > 0) {
    signals.push(`Public links point to related subdomains: ${Array.from(linkedSubdomains).slice(0, 5).join(", ")}; this does not prove a multi-domain tenant/storefront model.`);
  }
  if (/\b(?:admin|staff)\s+(?:dashboard|panel|portal|login|sign[ -]?in)\b|\/admin(?:\/|\b)/i.test(text)) {
    signals.push("Public admin/staff route or reference found; access and dashboard functionality are not verified.");
  }
  return signals;
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
  { id: "search_filter_sort", pattern: /\b(search and filters?|filter and sort|sorting and filtering|advanced search)\b|\b(?:site|nav|product|catalog)[ -]search\b/i },
  { id: "order_invoice_management", pattern: /\b(order management|manage orders|order statuses|order and invoice management)\b/i },
  { id: "activity_logs", pattern: /\b(activity logs?|admin action logs?|user activity history)\b/i },
  { id: "pdf_excel_export", pattern: /\b(pdf|excel) (report|data|records?) export|export (reports?|records?) to (pdf|excel)\b/i },
  { id: "csv_data_export", pattern: /\bcsv (?:order )?(?:data )?export|export (?:order )?records? to csv|download (?:order )?records? as csv|export orders to csv\b/i },
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
  { id: "kitchen_order_tickets", pattern: /\b(kitchen order tickets?|kitchen tickets?|kot system|print(?:able)? kitchen (?:orders?|tickets?)|print kot)\b/i },
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
  { id: "tenant_domains", pattern: /\b(tenant[- ]specific domains?|custom domains? for (each )?(tenant|seller|vendor|store)|multi[- ]domain storefronts?|seller storefront domains?)\b/i },
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
  { id: "daily_sales_records", pattern: /\b(daily sales (?:records?|reports?|tracking)|day[- ]wise sales reports?|daily item sales|sales item breakdown|daily purchases|daily expenses|profit and loss report|estimated profit\/loss)\b/i },
  { id: "daily_sales_calendar", pattern: /\b(daily sales calendar|sales reports? by date|daily sales by date|select (?:a )?report date|monthly sales calendar|browse sales by date)\b/i },
  { id: "monthly_credit_accounts", pattern: /\b(monthly credit accounts?|customer credit balances?|record(?:ed|ing)? customer payments?|outstanding credit|credit due|credit ledger)\b/i },
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

  const productCatalog = has(/\b(products?|catalog|shop|shopping|store|menu|items for sale)\b/);
  const cartSignal = has(/\b(cart|shopping bag|basket)\b|\b(add to cart|view cart|cart page|\/cart(?:\/|\b))/i);
  const marketplaceSignal = has(/\b(?:become a seller|sell on (?:our|the|amazon)|seller central|seller dashboard|vendor portal|join (?:our|the) marketplace|multi[- ]vendor marketplace)\b/i);
  const checkoutSignal = has(/\b(checkout|\/checkout(?:\/|\b)|complete (your )?order|place (an )?order)\b/i);
  const whatsappSignal = has(/\bwhatsapp\b|wa\.me\/|api\.whatsapp\.com\/send|whatsapp:\/\/send/i);
  const onlineOrderingSignal = has(/\b(order online|online ordering)\b/);
  const ordering = cartSignal || checkoutSignal || has(/\b(order online|online ordering)\b/);
  const ecommerceCatalog = has(/\b(products?|catalog|shop|shopping|store|menu|items for sale)\b/);
  const ecommerceStore = ecommerceCatalog && cartSignal;
  const explicitSaas = has(/\b(saas|software as a service|subscription software|cloud[ -]based software)\b/i);
  const saasPlatform = has(
    /\b(?:software|crm|erp|project management|team collaboration|invoicing|accounting|hr management)\s+(?:as a )?(?:platform|system|software|tool)\b|\b(?:cloud|online|web)[ -]based platform\b/i
  );
  const saasCommercialSignals = has(
    /\b(subscription|free trial|pricing plans|monthly plan|annual plan|per user|workspace|dashboard|customer portal|sign[ -]?in|log[ -]?in)\b/i
  );
  const saasApplication = explicitSaas || (saasPlatform && saasCommercialSignals);
  const booking = has(
    /\b(bookings?|reservations?|appointments?)\b|\bbook (?:a|an|your) (?:appointment|table|room|consultation|service|session)\b|\breserve (?:a|your) table\b|\bschedule (?:a|an) (?:visit|appointment)\b/i
  );
  const accounts = has(/\b(customer registration|register as a customer|create (a )?customer account|customer login|customer sign[ -]?in|my customer account)\b/);
  const payment = has(/\b(stripe|paypal|razorpay|paystack|authorize\.net|credit card|debit card|pay online|online payment gateway|payment gateway|online payment integration)\b/);
  const analytics = has(/\b(analytics dashboard|sales analytics|financial report|business analytics|revenue chart)\b/);
  const chatbot = has(
    /\b(?:chat|talk|message)\s+(?:to|with)\s+(?:our\s+)?(?:ai(?:\s+(?:chatbot|assistant))?|chatbot|virtual assistant)\b|\b(?:ask|try|open|start)\s+(?:our\s+)?(?:ai(?:\s+(?:chatbot|assistant))?|chatbot|virtual assistant)\b/i
  );
  const customIntegration = has(/\b(webhook integration|api integration|automated system sync|connect to (our )?(erp|crm|accounting software))\b/);
  const advancedEcommerce = ecommerceStore && (
    analytics ||
    customIntegration ||
    marketplaceSignal ||
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
  if (has(/\b(search (products?|menu)|filter by categor(y|ies)|menu categor(y|ies)|category filter|filter and sort)\b|\b(?:site|nav|product|catalog)[ -]search\b/i)) {
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
  if (marketplaceSignal) {
    features.push({
      title: "Multi-vendor marketplace signal",
      explanation: "Public seller/vendor enrollment or marketplace wording was found; seller dashboards, verification, commissions, and payouts are not verified.",
      evidence: "A public seller enrollment, vendor portal, or marketplace reference matched.",
      addonId: "vendor_management",
    });
    addonIds.push("vendor_management");
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
    const tableOrderingSignal = has(
      /\b(?:scan|use|open)\s+(?:the\s+)?qr(?:\s+code)?\s+(?:at|from|on|for)\s+(?:(?:your|a|the)\s+)?(?:dine[- ]in\s+)?table\b|\btable\s+qr(?:\s+code)?\s+(?:for\s+)?(?:dine[- ]in\s+)?(?:order|ordering|menu)\b|\bqr(?:\s+code)?\s+to\s+(?:place\s+)?order\s+from\s+(?:your\s+)?table\b/i
    );
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
    assumptions.push("Public page signals did not match a published base package; a basic or admin package is not assumed solely from a limited scan.");
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

  const businessAddonRules = getBusinessAddonDetectionRules();
  for (const rule of businessAddonRules) {
    if (!has(rule.pattern)) continue;
    const addon = pricingConfig.addons[rule.id];
    if (!addon || !addon.enabled) continue;
    detectedAddonIds.add(rule.id);
    if (!features.some((feature) => feature.addonId === rule.id)) {
      features.push({
        title: addon.label,
        explanation: addon.description,
        evidence: `Public page text matched a feature-name signal for ${addon.label.toLowerCase()}.`,
        addonId: rule.id,
      });
    }
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
  assumptions.push("Detected catalog-priced features are listed in the provisional scan estimate. Public signals are not proof that a feature is fully implemented or required in a new build.");
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
  configuredPricing: PricingRuleConfig = DEFAULT_PRICING_CONFIG,
  fetchStylesheet: (input: string, expectedOrigin: string) => Promise<string> = fetchPublicStylesheet
): Promise<WebsiteEstimateResult> {
  const scanStartedAt = Date.now();
  const firstPage = await fetchDocument(input, false);
  const pages: ScannedPage[] = [firstPage];
  const warnings: string[] = [];
  if (firstPage.truncated) {
    warnings.push(`Homepage content was capped at ${MAX_HTML_BYTES / 1_000_000} MB to keep scanning bounded; findings may be incomplete.`);
  }
  const visited = new Set([new URL(firstPage.url).toString()]);
  const sitemapCandidates = await getSitemapCandidates(new URL(firstPage.url).origin, fetchDocument);
  const queued = new Set<string>();
  const candidates = [
    ...sitemapCandidates,
    ...getCandidateLinks(firstPage.html, firstPage.url),
  ].filter((candidate) => {
    const normalizedCandidate = new URL(candidate).toString();
    if (visited.has(normalizedCandidate) || queued.has(normalizedCandidate)) return false;
    queued.add(normalizedCandidate);
    return true;
  }).slice(0, MAX_CANDIDATE_URLS);

  let scanTimeLimitReached = false;
  while (candidates.length > 0 && pages.length < MAX_PAGES) {
    if (Date.now() - scanStartedAt >= MAX_SCAN_DURATION_MS - REQUEST_TIMEOUT_MS * 2) {
      scanTimeLimitReached = true;
      break;
    }
    const batch = candidates.splice(0, Math.min(
      PAGE_FETCH_CONCURRENCY,
      MAX_PAGES - pages.length
    ));
    const fetchedPages = await Promise.all(batch.map(async (candidate) => {
      visited.add(candidate);
      try {
        const page = await fetchDocument(candidate, false);
        return new URL(page.url).origin === new URL(firstPage.url).origin ? page : null;
      } catch {
        warnings.push("Website ke kuch additional public pages nahi khul sake; estimate available pages par based hai.");
        return null;
      }
    }));
    for (const page of fetchedPages) {
      if (!page) continue;
      pages.push(page);
    if (page.truncated) {
      warnings.push(`Some page content was capped at ${MAX_HTML_BYTES / 1_000_000} MB to keep scanning bounded; findings may be incomplete.`);
    }
      for (const candidate of getCandidateLinks(page.html, page.url)) {
        const normalizedCandidate = new URL(candidate).toString();
        if (visited.has(normalizedCandidate) || queued.has(normalizedCandidate)) continue;
        queued.add(normalizedCandidate);
        candidates.push(normalizedCandidate);
      }
    }
  }
  if (scanTimeLimitReached) {
    warnings.push("The scan reached its time limit; the estimate uses public pages collected so far.");
  } else if (candidates.length > 0) {
    warnings.push(`Public scan limit reached (${MAX_PAGES} pages); more same-site pages may contain additional features.`);
  }
  const stylesheetResult = await readPublicStylesheets(
    pages,
    new URL(firstPage.url).origin,
    fetchStylesheet
  );
  if (stylesheetResult.incomplete) {
    warnings.push("Some same-site stylesheets could not be read; design and theme clues may be incomplete.");
  }
  if (warnings.length > 0) {
    warnings.splice(0, warnings.length, ...Array.from(new Set(warnings)));
  }

  const text = pages.map(getPageSignalText).join(" ");
  const detected = detectWebsiteFeatures(text, [], configuredPricing);
  const homepageText = getPageSignalText(firstPage);
  const homepageIdentity = [
    getPageTitle(firstPage.html),
    getMetaContent(firstPage.html, "description", "name"),
    ...Array.from(firstPage.html.matchAll(/<h[1-2]\b[^>]*>([\s\S]*?)<\/h[1-2]\s*>/gi), (match) => stripHtml(match[1])),
  ].join(" ");
  const restaurantBusinessContext =
    /\b(?:restaurant|caf[eé]|hotel|catering|bakery)\b/i.test(homepageIdentity) ||
    /\b(?:restaurant|caf[eé]|hotel|catering|bakery)\s+(?:website|web app(?:lication)?|ordering|menu|management|software|system|solution)\b/i.test(homepageText);
  if (detected.pricingPackage?.startsWith("ecommerce_") && !restaurantBusinessContext) {
    const foodHospitalityAddonIds = new Set([
      ...getBusinessAddonDetectionRules()
        .filter((rule) => rule.categoryId === "food-hospitality")
        .map((rule) => rule.id),
      "restaurant_qr_menu",
      "kitchen_order_tickets",
      "table_reservations",
    ]);
    detected.addonIds = detected.addonIds.filter((id) => !foodHospitalityAddonIds.has(id));
    detected.features = detected.features.filter((feature) => {
      const addonId = feature.addonId || Object.entries(configuredPricing.addons)
        .find(([, addon]) => addon.label === feature.title)?.[0];
      return !addonId || !foodHospitalityAddonIds.has(addonId);
    });
  }
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
  const pageInventory = getPageInventory(pages);
  const informationalPageTypes = new Set(
    pageInventory
      .map((page) => page.type)
      .filter((type) =>
        ["About", "Services", "Contact/support", "Blog/article", "Information/policy"].includes(type)
      )
  );
  const hasBasicInformationalScope = !detected.pricingPackage &&
    pages.length >= 3 &&
    informationalPageTypes.size >= 2 &&
    !detected.features.some((feature) =>
      ["E-commerce store package", "SaaS application package"].includes(feature.title)
    );
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
  const detectedPricingOptionId = detected.pricingPackage ||
    (hasBasicInformationalScope ? "package_1" : "");
  const suggestedPricingOptionId = detectedPricingOptionId;
  if (hasBasicInformationalScope) {
    detected.assumptions.unshift(
      "A basic informational package is included because the scan opened at least three public pages and identified at least two standard page types. This assumes a limited informational rebuild, not an unverified backend or custom platform."
    );
  }
  if (currency !== "PKR") {
    detected.assumptions.unshift(
      "International base packages use 2x Pakistan rates converted with the latest available exchange rate; each selected one-time add-on is a flat 100 units in the selected currency."
    );
  }
  const selectedPricingOption = pricingOptions.find(
    (option) => option.id === detectedPricingOptionId
  );
  const selectedPackageId = selectedPricingOption?.pricingPackage;
  const requestedAddonIds = Array.from(new Set([
    ...detected.addonIds,
    ...detected.features.flatMap((feature) => feature.addonId ? [feature.addonId] : []),
  ]));
  const chargeableAddonIds = getChargeableAddonIds(
    requestedAddonIds,
    selectedPackageId,
    selectedPricingOption?.adminPanelType
  );
  const estimatePricingConfig = selectedPricingOption
    ? pricingConfig
    : {
        ...standardPricing,
        baseWithoutAdmin: 0,
        baseWithAdmin: 0,
      };
  const calculation = calculateBudget(
    selectedPricingOption?.adminPanelType || "none",
    chargeableAddonIds,
    estimatePricingConfig
  );
  const estimatedMaximumTotal = selectedPricingOption?.maximumPrice === undefined
    ? undefined
    : (() => {
        const maximumSubtotal = calculation.estimatedTotal -
          calculation.contingencyAmount +
          selectedPricingOption.maximumPrice -
          calculation.basePrice;
        const contingency = Math.round(
          maximumSubtotal * (estimatePricingConfig.contingencyPercentage || 0) / 100
        );
        return maximumSubtotal + contingency;
      })();
  const siteTitle = getPageTitle(firstPage.html) || new URL(firstPage.url).hostname;
  const siteDescription =
    getMetaContent(firstPage.html, "description", "name") ||
    getMetaContent(firstPage.html, "og:description", "property");
  const businessCatalog = getBusinessAddonCatalog(pricingConfig.addons);
  const businessAddonMetadata = new Map(
    businessCatalog.map((addon) => [addon.id, addon])
  );
  const suggestedBusinessCategoryId = businessCatalog.find((addon) =>
    detected.features.some((feature) => feature.addonId === addon.id)
  )?.categoryId;

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
    pageInventory,
    designSignals: getDesignSignals(pages, stylesheetResult.stylesheets),
    architectureSignals: getArchitectureSignals(pages),
    features: detected.features,
    addonCatalog: Object.values(pricingConfig.addons)
      .filter((addon) => addon.enabled)
      .map((addon) => {
        const businessMetadata = businessAddonMetadata.get(addon.id);
        const businessCategories = addon.businessCategories ||
          (businessMetadata ? [businessMetadata.categoryId] : undefined);
        return {
          id: addon.id,
          title: addon.label,
          description: addon.description,
          price: addon.price,
          ...(currency === "PKR"
            ? { basePrice: configuredPricing.addons[addon.id]?.price ?? addon.price }
            : {}),
          billingPeriod: addon.billingPeriod || "one_time",
          ...(businessCategories ? { businessCategories } : {}),
          ...(addon.businessTypes || businessMetadata?.businessTypes
            ? { businessTypes: addon.businessTypes || businessMetadata?.businessTypes }
            : {}),
          ...(addon.pricingLevel || businessMetadata?.level
            ? { pricingLevel: addon.pricingLevel || businessMetadata?.level }
            : {}),
          origin: addon.origin || businessMetadata?.origin || "existing",
          ...(addon.requiresCustomQuote || businessMetadata?.requiresCustomQuote
            ? { requiresCustomQuote: true }
            : {}),
        };
      }),
    ...(suggestedBusinessCategoryId ? { suggestedBusinessCategoryId } : {}),
    basePackage: selectedPricingOption?.label || "Public scan feature estimate",
    basePrice: selectedPricingOption ? calculation.basePrice : 0,
    basePriceWithAdmin: selectedPricingOption?.basePriceWithAdmin || 0,
    addons: calculation.selectedAddonDetails.map((addon) => ({
      id: addon.id,
      title: addon.label,
      price: addon.price,
      billingPeriod: addon.billingPeriod,
    })),
    monthlyAddonTotal: calculation.monthlyAddonTotal,
    estimatedTotal: calculation.estimatedTotal,
    ...(estimatedMaximumTotal !== undefined ? { estimatedMaximumTotal } : {}),
    contingencyPercentage: estimatePricingConfig.contingencyPercentage || 0,
    assumptions: detected.assumptions,
    warnings,
  };
}
