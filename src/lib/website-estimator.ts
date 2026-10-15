import { isIP } from "node:net";
import { LookupAddress, LookupOptions } from "node:dns";
import { lookup as dnsLookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { calculateBudget, DEFAULT_PRICING_CONFIG } from "./constants";
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
  addons: { id: string; title: string; price: number }[];
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

export function detectWebsiteFeatures(text: string): {
  features: WebsiteEstimateFeature[];
  adminPanel: boolean;
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
  const booking = has(/\b(book(ing)?|reservation|appointment|reserve a table|schedule a visit)\b/);
  const accounts = has(/\b(sign[ -]?in|log[ -]?in|create account|register|my account|customer portal)\b/);
  const payment = has(/\b(stripe|paypal|razorpay|paystack|authorize\.net|credit card|debit card|pay online|online payment gateway|payment gateway|online payment integration)\b/);
  const analytics = has(/\b(analytics dashboard|sales report|financial report|business analytics|revenue chart)\b/);
  const chatbot = has(
    /\b(?:chat|talk|message)\s+(?:to|with)\s+(?:our\s+)?(?:ai(?:\s+(?:chatbot|assistant))?|chatbot|virtual assistant)\b|\b(?:ask|try|open|start)\s+(?:our\s+)?(?:ai(?:\s+(?:chatbot|assistant))?|chatbot|virtual assistant)\b/i
  );
  const customIntegration = has(/\b(webhook integration|api integration|automated system sync|connect to (our )?(erp|crm|accounting software))\b/);

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
    addonIds.push("custom_advanced_feature");
  }

  const needsPersistentData = productCatalog || ordering || booking || accounts;
  if (needsPersistentData) {
    addonIds.push("supabase_db");
    assumptions.push("Listings, orders, bookings, ya accounts ke liye persistent database add-on farz kiya gaya hai; asal backend public page se verify nahi ho sakta.");
  }
  if (adminPanel) {
    assumptions.push("Public page par admin/staff area ka link mila, is liye Package 2 estimate kiya gaya hai; link se dashboard ka exact scope confirm nahi hota.");
  } else {
    assumptions.push("Client admin panel public page se confirm nahi hua, is liye Package 1 (Durrani-managed) use kiya gaya hai.");
  }
  if (payment) {
    assumptions.push("Payment add-on sirf visible gateway/card-payment signals par lagaya gaya hai; gateway account, third-party fees, aur exact integration scope shamil nahi.");
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
    adminPanel,
    addonIds: Array.from(new Set(addonIds)),
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
  const pricingConfig = getRegionalPricingConfig(DEFAULT_PRICING_CONFIG, currency, rates);
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
    ...(currency !== "PKR" ? { exchangeRate: rates[currency], exchangeRateDate } : {}),
    siteTitle,
    siteDescription,
    pagesScanned: pages.length,
    features: detected.features,
    basePackage: detected.adminPanel ? "Package 2: Client Admin Panel" : "Package 1: Durrani-Managed",
    basePrice: calculation.basePrice,
    addons: calculation.selectedAddonDetails.map((addon) => ({
      id: addon.id,
      title: addon.label,
      price: addon.price,
    })),
    estimatedTotal: calculation.estimatedTotal,
    assumptions: detected.assumptions,
    warnings,
  };
}
