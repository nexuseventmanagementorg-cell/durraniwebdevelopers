import { NextRequest, NextResponse } from "next/server";
import {
  describePaymentBackendError,
  getPaymentSupabase,
  getPublicPaymentOptions,
  logPaymentBackendError,
  readPaymentSettings,
} from "@/lib/payment-server";
import { getSafepaySetupStatus, SAFEPAY_CURRENCIES } from "@/lib/safepay";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const settings = await readPaymentSettings();
    const country = request.headers.get("x-vercel-ip-country")?.toUpperCase() || "PK";
    const gatewayStatus = getSafepaySetupStatus();
    let cardCheckoutAvailable = false;
    let cardCheckoutMessage = gatewayStatus.message;

    if (gatewayStatus.configured) {
      const { error } = await getPaymentSupabase()
        .from("gateway_payments")
        .select("id")
        .limit(0);

      if (error) {
        logPaymentBackendError("Safepay payment table health check failed", error);
        cardCheckoutMessage =
          "Safepay payment storage is not ready. The administrator must apply supabase/safepay-checkout.sql.";
      } else {
        cardCheckoutAvailable = true;
        cardCheckoutMessage = `Safepay ${gatewayStatus.environment} checkout is ready.`;
      }
    }

    const options = {
      ...getPublicPaymentOptions(
        settings,
        country === "PK",
        cardCheckoutAvailable,
        cardCheckoutMessage
      ),
      cardCurrencies: SAFEPAY_CURRENCIES,
    };
    return NextResponse.json(
      { success: true, country, options },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    logPaymentBackendError("Could not load public payment options", error);
    return NextResponse.json(
      {
        success: false,
        error: describePaymentBackendError(error, "database"),
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
