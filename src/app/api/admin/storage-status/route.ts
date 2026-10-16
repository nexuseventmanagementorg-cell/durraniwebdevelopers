import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/auth";
import {
  describePaymentBackendError,
  getPaymentSupabase,
  hasPaymentSupabaseConfiguration,
  logPaymentBackendError,
  RECEIPT_BUCKET,
} from "@/lib/payment-server";
import { getSafepaySetupStatus } from "@/lib/safepay";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const checkedAt = new Date().toISOString();
  const coreDataStore = "Local JSON (data/db.json)";
  const safepaySetup = getSafepaySetupStatus();

  if (!hasPaymentSupabaseConfiguration()) {
    return NextResponse.json(
      {
        success: true,
        checkedAt,
        coreDataStore,
        payments: {
          backend: "Supabase",
          database: {
            connected: false,
            message: "Missing Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local, then restart the server.",
          },
          receiptStorage: { accessible: false, private: false, message: "Not checked because Supabase configuration is missing." },
          safepay: {
            configured: false,
            environment: safepaySetup.environment,
            databaseReady: false,
            message: "Safepay checkout also requires the Supabase payment store. Configure Supabase before enabling card checkout.",
          },
        },
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  }

  let database = { connected: false, message: "" };
  let receiptStorage = { accessible: false, private: false, message: "" };
  let safepay = {
    configured: safepaySetup.configured,
    environment: safepaySetup.environment,
    databaseReady: false,
    message: safepaySetup.message,
  };

  try {
    const supabase = getPaymentSupabase();
    const [settingsCheck, proofsCheck] = await Promise.all([
      supabase.from("payment_settings").select("id").eq("id", "default").maybeSingle(),
      supabase.from("payment_proofs").select("id").limit(0),
    ]);
    const gatewayTableCheck = await supabase.from("gateway_payments").select("id").limit(0);
    if (gatewayTableCheck.error) {
      logPaymentBackendError("Safepay payment table health check failed", gatewayTableCheck.error);
      safepay = {
        ...safepay,
        databaseReady: false,
        message: "The gateway_payments table is not available. Apply supabase/safepay-checkout.sql in the DWD Supabase project.",
      };
    } else {
      safepay = {
        ...safepay,
        databaseReady: true,
        message: safepaySetup.configured
          ? `Safepay ${safepaySetup.environment} configuration and payment table are ready.`
          : `${safepaySetup.message} The gateway_payments table is ready.`,
      };
    }
    const databaseError = settingsCheck.error || proofsCheck.error;

    if (databaseError) {
      logPaymentBackendError("Payment database health check failed", databaseError);
      database = {
        connected: false,
        message: describePaymentBackendError(databaseError, "database"),
      };
    } else {
      database = {
        connected: true,
        message: "Both payment_settings and payment_proofs tables responded successfully.",
      };
    }

    const { data: bucket, error: storageError } = await supabase.storage.getBucket(RECEIPT_BUCKET);
    if (storageError) {
      logPaymentBackendError("Receipt storage health check failed", storageError);
      receiptStorage = {
        accessible: false,
        private: false,
        message: describePaymentBackendError(storageError, "storage"),
      };
    } else if (!bucket) {
      receiptStorage = {
        accessible: false,
        private: false,
        message: `Supabase Storage bucket "${RECEIPT_BUCKET}" was not found.`,
      };
    } else {
      receiptStorage = {
        accessible: true,
        private: !bucket.public,
        message: bucket.public
          ? "Bucket is accessible but is public. Set it to private before accepting receipts."
          : "Private receipt bucket is accessible.",
      };
    }
  } catch (error) {
    logPaymentBackendError("Payment backend health check failed", error);
    database = {
      connected: false,
      message: describePaymentBackendError(error, "database"),
    };
    safepay = {
    ...safepay,
    databaseReady: false,
    message: "Could not test the Safepay payment table because Supabase is unavailable.",
    };
    receiptStorage = {
      accessible: false,
      private: false,
      message: "Storage check could not run because Supabase could not be reached.",
    };
  }

  return NextResponse.json(
    {
      success: true,
      checkedAt,
      coreDataStore,
      payments: { backend: "Supabase", database, receiptStorage, safepay },
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
