import { createHmac, timingSafeEqual } from "crypto";
import Safepay from "@sfpy/node-core";
import type { CurrencyCode } from "@/lib/currency";

export const SAFEPAY_CURRENCIES = ["PKR", "USD", "EUR", "GBP", "CAD", "AUD"] as const;
export type SafepayCurrency = (typeof SAFEPAY_CURRENCIES)[number];

export type SafepayEnvironment = "sandbox";

export interface SafepaySetupStatus {
  configured: boolean;
  environment: SafepayEnvironment | null;
  message: string;
}

export class SafepayConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SafepayConfigurationError";
  }
}

export function getSafepaySetupStatus(): SafepaySetupStatus {
  const missing = [
    ["SAFEPAY_PUBLIC_KEY", process.env.SAFEPAY_PUBLIC_KEY],
    ["SAFEPAY_SECRET_KEY", process.env.SAFEPAY_SECRET_KEY],
    ["SAFEPAY_WEBHOOK_SECRET", process.env.SAFEPAY_WEBHOOK_SECRET],
    ["SAFEPAY_ENVIRONMENT", process.env.SAFEPAY_ENVIRONMENT],
    ["NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL],
  ]
    .filter(([, value]) => !value?.trim())
    .map(([name]) => name);

  const environment = process.env.SAFEPAY_ENVIRONMENT?.trim();
  if (environment === "production") {
    return {
      configured: false,
      environment: null,
      message: "Safepay production checkout is disabled. Use Sandbox credentials with SAFEPAY_ENVIRONMENT=sandbox.",
    };
  }
  if (environment && environment !== "sandbox") {
    return {
      configured: false,
      environment: null,
      message: "SAFEPAY_ENVIRONMENT must be sandbox.",
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (siteUrl) {
    try {
      const parsed = new URL(siteUrl);
      const ipv4Parts = parsed.hostname.split(".").map(Number);
      const isPrivateIpv4 =
        ipv4Parts.length === 4 &&
        ipv4Parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255) &&
        (ipv4Parts[0] === 10 ||
          ipv4Parts[0] === 127 ||
          (ipv4Parts[0] === 192 && ipv4Parts[1] === 168) ||
          (ipv4Parts[0] === 172 && ipv4Parts[1] >= 16 && ipv4Parts[1] <= 31) ||
          (ipv4Parts[0] === 169 && ipv4Parts[1] === 254));
      if (
        parsed.protocol !== "https:" ||
        parsed.username ||
        parsed.password ||
        parsed.search ||
        parsed.hash ||
        parsed.pathname !== "/" ||
        parsed.hostname === "localhost" ||
        parsed.hostname.endsWith(".local") ||
        parsed.hostname.endsWith(".example") ||
        parsed.hostname === "example.com" ||
        parsed.hostname === "::1" ||
        isPrivateIpv4
      ) {
        throw new Error("invalid site URL");
      }
    } catch {
      return {
        configured: false,
        environment: environment === "sandbox" ? "sandbox" : null,
        message: "NEXT_PUBLIC_SITE_URL must be a public HTTPS website URL so Safepay can reach the webhook.",
      };
    }
  }

  if (missing.length > 0) {
    return {
      configured: false,
      environment: environment === "sandbox" ? "sandbox" : null,
      message: `Safepay is not configured. Set ${missing.join(", ")} in the deployment environment; keep private API and webhook keys server-side.`,
    };
  }

  return {
    configured: true,
    environment: "sandbox",
    message: "Safepay Sandbox credentials are configured. Checkout is available only after the gateway table is installed.",
  };
}

export function isSafepayCurrency(value: unknown): value is SafepayCurrency {
  return typeof value === "string" && SAFEPAY_CURRENCIES.some((currency) => currency === value);
}

export function toSafepayMinorUnits(amount: string, currency: CurrencyCode): number {
  if (!/^\d+(?:\.\d{1,2})?$/.test(amount)) {
    throw new RangeError("Enter an amount with valid decimal places for the selected currency.");
  }
  const parsedAmount = Number(amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    throw new RangeError("Enter a valid payment amount.");
  }

  const fractionDigits = 2;
  const factor = 10 ** fractionDigits;
  const minorUnits = Math.round(parsedAmount * factor);
  const reconstructed = minorUnits / factor;

  if (
    !Number.isSafeInteger(minorUnits) ||
    Math.abs(parsedAmount - reconstructed) > Number.EPSILON * Math.max(1, parsedAmount) * 4 ||
    minorUnits > 10_000_000_000
  ) {
    throw new RangeError("Enter an amount with valid decimal places for the selected currency.");
  }

  return minorUnits;
}

export function verifySafepayWebhookSignature(
  payload: unknown,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !/^[a-f0-9]{128}$/i.test(signature) || !secret) return false;

  const serialized = JSON.stringify(payload);
  if (!serialized) return false;

  const expected = createHmac("sha512", secret)
    .update(Buffer.from(serialized))
    .digest();
  const received = Buffer.from(signature, "hex");

  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function getSafepayClient() {
  const status = getSafepaySetupStatus();
  if (!status.configured || !status.environment) {
    throw new SafepayConfigurationError(status.message);
  }

  const secretKey = process.env.SAFEPAY_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new SafepayConfigurationError("Safepay server credentials are incomplete.");
  }

  return new Safepay(secretKey, {
    authType: "secret",
    host: "https://sandbox.api.getsafepay.com",
    timeout: 15_000,
  });
}

export function getSafepayPublicKey(): string {
  const key = process.env.SAFEPAY_PUBLIC_KEY?.trim();
  if (!key) throw new SafepayConfigurationError("Safepay public API key is not configured.");
  return key;
}

export function getSafepaySiteUrl(): URL {
  const status = getSafepaySetupStatus();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!status.configured || !siteUrl) {
    throw new SafepayConfigurationError(status.message);
  }
  return new URL(siteUrl);
}
