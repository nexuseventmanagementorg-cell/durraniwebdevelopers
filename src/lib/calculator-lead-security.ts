import crypto from "crypto";

const DEVELOPMENT_SECRET = crypto.randomBytes(32).toString("hex");
const TOKEN_VERSION = "calc-lead-v1";

function getLeadSigningKey(): Buffer {
  const secret = process.env.CALCULATOR_LEAD_SECRET || process.env.SESSION_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("CALCULATOR_LEAD_SECRET or SESSION_SECRET must be configured in production.");
  }
  return crypto.createHmac("sha256", secret || DEVELOPMENT_SECRET)
    .update("dwd:calculator-lead-token:v1")
    .digest();
}

export function validateCalculatorLeadContact(input: {
  email: string;
  phone: string;
  contactConsent: boolean;
}): string | null {
  if (!input.contactConsent) return "Consent is required before saving contact details for follow-up.";
  if (!input.email && !input.phone) return "Enter an email address or WhatsApp number to save this lead.";
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    return "Enter a valid email address or remove it and use WhatsApp instead.";
  }
  const phoneDigits = input.phone.replace(/\D/g, "");
  if (input.phone && (!/^\+?[\d\s().-]{8,24}$/.test(input.phone) || phoneDigits.length < 8 || phoneDigits.length > 15)) {
    return "Enter a valid WhatsApp number with its country code.";
  }
  return null;
}

export function createCalculatorLeadToken(leadId: string): string {
  const payload = Buffer.from(JSON.stringify({ leadId, timestamp: Date.now() })).toString("base64url");
  const signature = crypto.createHmac("sha256", getLeadSigningKey()).update(payload).digest("hex");
  return `${TOKEN_VERSION}.${payload}.${signature}`;
}

export function verifyCalculatorLeadToken(leadId: string, token: string): boolean {
  try {
    const [version, encodedPayload, signature, extra] = token.split(".");
    if (version !== TOKEN_VERSION || !encodedPayload || !signature || extra !== undefined) return false;
    const expectedSignature = crypto.createHmac("sha256", getLeadSigningKey()).update(encodedPayload).digest();
    const receivedSignature = Buffer.from(signature, "hex");
    if (receivedSignature.length !== expectedSignature.length ||
        !crypto.timingSafeEqual(receivedSignature, expectedSignature)) return false;

    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as {
      leadId?: unknown;
      timestamp?: unknown;
    };
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    return payload.leadId === leadId &&
      typeof payload.timestamp === "number" &&
      Date.now() - payload.timestamp >= 0 &&
      Date.now() - payload.timestamp <= maxAge;
  } catch {
    return false;
  }
}