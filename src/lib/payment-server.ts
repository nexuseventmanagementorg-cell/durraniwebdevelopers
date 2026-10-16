import { createClient } from "@supabase/supabase-js";
import type { PaymentSettings } from "@/lib/payment-types";

export const RECEIPT_BUCKET = "payment-receipts";

export class PaymentConfigurationError extends Error {
  constructor() {
    super("Payment storage requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    this.name = "PaymentConfigurationError";
  }
}

export function hasPaymentSupabaseConfiguration(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function getPaymentSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new PaymentConfigurationError();
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}

export function describePaymentBackendError(
  error: unknown,
  operation: "database" | "storage"
): string {
  if (error instanceof PaymentConfigurationError) {
    return "Missing Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local, then restart the server.";
  }

  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";

  if (code === "42P01" || code === "PGRST205") {
    return "Supabase payment tables are missing. Run supabase/payment-workflow.sql in the DWD Supabase project.";
  }
  if (code === "42501" || code === "PGRST301") {
    return "Supabase denied access. Check the server-side service-role key and the payment table/storage permissions.";
  }
  if (operation === "storage" && (code === "404" || code === "NoSuchBucket")) {
    return `Supabase Storage bucket "${RECEIPT_BUCKET}" was not found. Apply the payment workflow SQL.`;
  }
  if (operation === "storage") {
    return "Supabase could not access the private payment-receipts bucket. Check Storage availability and server-side permissions.";
  }
  return "Supabase database request failed. Check project connectivity, payment table schema, and server-side permissions.";
}

export function logPaymentBackendError(
  context: string,
  error: unknown
): void {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "unknown";
  console.error(context, {
    code,
    errorType: error instanceof Error ? error.name : typeof error,
  });
}

export async function readPaymentSettings(): Promise<PaymentSettings> {
  const supabase = getPaymentSupabase();
  const { data, error } = await supabase
    .from("payment_settings")
    .select("settings")
    .eq("id", "default")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return {
    accountHolder: "",
    walletNumber: "",
    bankName: "",
    accountNumber: "",
    iban: "",
    branch: "",
    jazzcashEnabled: true,
    easypaisaEnabled: true,
    bankTransferEnabled: true,
    ...(data?.settings as Partial<PaymentSettings> | undefined),
  };
}

export function validatePaymentSettings(
  value: unknown
): value is PaymentSettings {
  if (!value || typeof value !== "object") return false;
  const settings = value as Record<string, unknown>;
  const textFields = [
    "accountHolder",
    "walletNumber",
    "bankName",
    "accountNumber",
    "iban",
    "branch",
  ];

  return (
    textFields.every(
      (field) =>
        typeof settings[field] === "string" &&
        (settings[field] as string).length <= 120
    ) &&
    ["jazzcashEnabled", "easypaisaEnabled", "bankTransferEnabled"].every(
      (field) => typeof settings[field] === "boolean"
    )
  );
}

export function getPublicPaymentOptions(
  settings: PaymentSettings,
  isPakistan: boolean,
  cardCheckoutAvailable = false,
  cardCheckoutMessage = "Safepay card checkout is not configured yet."
) {
  const hasWalletDetails = Boolean(settings.accountHolder && settings.walletNumber);
  const hasBankDetails = Boolean(
    settings.accountHolder &&
      settings.bankName &&
      (settings.accountNumber || settings.iban)
  );

  return {
    accountHolder: isPakistan ? settings.accountHolder : "",
    walletNumber: isPakistan ? settings.walletNumber : "",
    bankName: isPakistan ? settings.bankName : "",
    accountNumber: isPakistan ? settings.accountNumber : "",
    iban: isPakistan ? settings.iban : "",
    branch: isPakistan ? settings.branch : "",
    methods: {
      JazzCash: isPakistan && settings.jazzcashEnabled && hasWalletDetails,
      Easypaisa: isPakistan && settings.easypaisaEnabled && hasWalletDetails,
      "Bank Transfer": isPakistan && settings.bankTransferEnabled && hasBankDetails,
    },
    cardCheckoutAvailable,
    cardCheckoutMessage,
  };
}

export function isAllowedReceiptImage(file: File, bytes: Uint8Array): boolean {
  if (file.type === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (file.type === "image/png") {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    );
  }
  if (file.type === "image/webp") {
    return (
      String.fromCharCode(...Array.from(bytes.slice(0, 4))) === "RIFF" &&
      String.fromCharCode(...Array.from(bytes.slice(8, 12))) === "WEBP"
    );
  }
  return false;
}
