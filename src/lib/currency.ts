import { PricingRuleConfig } from "./types";

export const CURRENCY_OPTIONS = [
  { code: "PKR", name: "Pakistani Rupee" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "USD", name: "US Dollar" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "NZD", name: "New Zealand Dollar" },
  { code: "AED", name: "UAE Dirham" },
  { code: "SAR", name: "Saudi Riyal" },
  { code: "INR", name: "Indian Rupee" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "ZAR", name: "South African Rand" },
  { code: "DKK", name: "Danish Krone" },
  { code: "SEK", name: "Swedish Krona" },
  { code: "NOK", name: "Norwegian Krone" },
  { code: "PLN", name: "Polish Zloty" },
  { code: "CZK", name: "Czech Koruna" },
  { code: "HUF", name: "Hungarian Forint" },
  { code: "RON", name: "Romanian Leu" },
  { code: "ISK", name: "Icelandic Krona" },
  { code: "UAH", name: "Ukrainian Hryvnia" },
  { code: "TRY", name: "Turkish Lira" },
  { code: "RSD", name: "Serbian Dinar" },
  { code: "BAM", name: "Bosnia-Herzegovina Convertible Mark" },
  { code: "ALL", name: "Albanian Lek" },
  { code: "MDL", name: "Moldovan Leu" },
  { code: "MKD", name: "Macedonian Denar" },
  { code: "GEL", name: "Georgian Lari" },
  { code: "AZN", name: "Azerbaijani Manat" },
  { code: "KZT", name: "Kazakhstani Tenge" },
  { code: "THB", name: "Thai Baht" },
  { code: "IDR", name: "Indonesian Rupiah" },
  { code: "MYR", name: "Malaysian Ringgit" },
  { code: "PHP", name: "Philippine Peso" },
  { code: "KRW", name: "South Korean Won" },
  { code: "HKD", name: "Hong Kong Dollar" },
  { code: "TWD", name: "New Taiwan Dollar" },
  { code: "MXN", name: "Mexican Peso" },
  { code: "BRL", name: "Brazilian Real" },
  { code: "ARS", name: "Argentine Peso" },
  { code: "CLP", name: "Chilean Peso" },
  { code: "COP", name: "Colombian Peso" },
  { code: "NGN", name: "Nigerian Naira" },
  { code: "EGP", name: "Egyptian Pound" },
  { code: "ILS", name: "Israeli New Shekel" },
] as const;

export type CurrencyCode = (typeof CURRENCY_OPTIONS)[number]["code"];
export type ExchangeRates = Partial<Record<CurrencyCode, number>>;

const COUNTRY_CURRENCY: Record<string, CurrencyCode> = {
  PK: "PKR",
  DE: "EUR", AT: "EUR", BE: "EUR", CY: "EUR", EE: "EUR", ES: "EUR",
  FI: "EUR", FR: "EUR", GR: "EUR", HR: "EUR", IE: "EUR", IT: "EUR",
  LT: "EUR", LU: "EUR", LV: "EUR", MT: "EUR", NL: "EUR", PT: "EUR",
  SI: "EUR", SK: "EUR",
  BG: "EUR",
  GB: "GBP",
  US: "USD",
  CA: "CAD",
  AU: "AUD",
  CH: "CHF", LI: "CHF",
  DK: "DKK", FO: "DKK", GL: "DKK",
  SE: "SEK",
  NO: "NOK",
  PL: "PLN",
  CZ: "CZK",
  HU: "HUF",
  RO: "RON",
  IS: "ISK",
  UA: "UAH",
  TR: "TRY",
  RS: "RSD",
  BA: "BAM",
  AL: "ALL",
  MD: "MDL",
  MK: "MKD",
  GE: "GEL",
  AZ: "AZN",
  NZ: "NZD",
  AE: "AED",
  SA: "SAR",
  IN: "INR",
  JP: "JPY",
  CN: "CNY",
  SG: "SGD",
  ZA: "ZAR",
  KZ: "KZT",
  TH: "THB",
  ID: "IDR",
  MY: "MYR",
  PH: "PHP",
  KR: "KRW",
  HK: "HKD",
  TW: "TWD",
  MX: "MXN",
  BR: "BRL",
  AR: "ARS",
  CL: "CLP",
  CO: "COP",
  NG: "NGN",
  EG: "EGP",
  IL: "ILS",
};

const COUNTRY_LOCALE: Record<string, string> = {
  PK: "en-PK",
  DE: "de-DE", AT: "de-AT", CH: "de-CH", LI: "de-LI",
  FR: "fr-FR", BE: "nl-BE", NL: "nl-NL", ES: "es-ES",
  IT: "it-IT", PT: "pt-PT", IE: "en-IE", FI: "fi-FI",
  GR: "el-GR", CY: "el-CY", MT: "mt-MT", LU: "fr-LU",
  EE: "et-EE", LV: "lv-LV", LT: "lt-LT", HR: "hr-HR",
  SI: "sl-SI", SK: "sk-SK", BG: "bg-BG",
  GB: "en-GB", US: "en-US", CA: "en-CA", AU: "en-AU", NZ: "en-NZ",
  DK: "da-DK", SE: "sv-SE", NO: "nb-NO", IS: "is-IS",
  PL: "pl-PL", CZ: "cs-CZ", HU: "hu-HU", RO: "ro-RO",
  UA: "uk-UA", TR: "tr-TR", RS: "sr-RS", BA: "bs-BA",
  AL: "sq-AL", MD: "ro-MD", MK: "mk-MK", GE: "ka-GE",
  AZ: "az-AZ", AE: "ar-AE", SA: "ar-SA", IN: "en-IN",
  JP: "ja-JP", CN: "zh-CN", SG: "en-SG", ZA: "en-ZA",
};

export function currencyForCountry(countryCode: string | null | undefined): CurrencyCode {
  if (!countryCode) return "PKR";
  return COUNTRY_CURRENCY[countryCode.toUpperCase()] || "USD";
}

export function localeForCountry(
  countryCode: string | null | undefined,
  fallback = "en-US"
): string {
  return COUNTRY_LOCALE[countryCode?.toUpperCase() || ""] || fallback;
}

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === "string" && CURRENCY_OPTIONS.some((currency) => currency.code === value);
}

export function formatCurrency(amount: number, currency: CurrencyCode, locale = "en-US"): string {
  const fractionDigits = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).resolvedOptions().maximumFractionDigits;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: currency === "PKR" ? 0 : Math.min(2, fractionDigits ?? 2),
    maximumFractionDigits: fractionDigits,
  }).format(amount);
}

function roundForCurrency(amount: number, currency: CurrencyCode): number {
  const digits = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).resolvedOptions().maximumFractionDigits ?? 2;
  const multiplier = 10 ** digits;
  return Math.round(amount * multiplier) / multiplier;
}

export function getRegionalPricingConfig(
  config: PricingRuleConfig,
  currency: CurrencyCode,
  rates: ExchangeRates
): PricingRuleConfig {
  if (currency === "PKR") return config;

  const rate = rates[currency];
  if (!rate || !Number.isFinite(rate) || rate <= 0) {
    throw new Error(`Live ${currency} exchange rate is currently unavailable.`);
  }
  const convert = (pkrAmount: number) => roundForCurrency(pkrAmount * 2 * rate, currency);

  return {
    ...config,
    baseWithoutAdmin: convert(config.baseWithoutAdmin),
    baseWithAdmin: convert(config.baseWithAdmin),
    advanceDefault: convert(config.advanceDefault),
    addons: Object.fromEntries(
      Object.entries(config.addons).map(([id, addon]) => [
        id,
        { ...addon, price: 100 },
      ])
    ),
  };
}
