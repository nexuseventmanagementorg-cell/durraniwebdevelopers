import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { checkRateLimit } from "@/lib/rateLimit";
import {
  describePaymentBackendError,
  getPaymentSupabase,
  logPaymentBackendError,
} from "@/lib/payment-server";
import {
  getSafepayClient,
  getSafepayPublicKey,
  getSafepaySetupStatus,
  getSafepaySiteUrl,
  isSafepayCurrency,
  type SafepayEnvironment,
  toSafepayMinorUnits,
} from "@/lib/safepay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getTrackerToken(response: unknown): string | null {
  if (!isRecord(response) || !isRecord(response.data) || !isRecord(response.data.tracker)) {
    return null;
  }
  const token = response.data.tracker.token;
  return typeof token === "string" && token.startsWith("track_") ? token : null;
}

function getPassportToken(response: unknown): string | null {
  if (!isRecord(response) || typeof response.data !== "string") return null;
  return response.data;
}

export async function POST(request: NextRequest) {
  const ip = request.ip || request.headers.get("x-forwarded-for") || "client";
  const rateLimit = checkRateLimit(`safepay_checkout_${ip}`, 5, 60 * 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: `Too many checkout attempts. Try again in ${rateLimit.resetInSec} seconds.` },
      { status: 429 }
    );
  }

  try {
    const setup = getSafepaySetupStatus();
    if (!setup.configured || !setup.environment) {
      return NextResponse.json({ success: false, error: setup.message }, { status: 503 });
    }

    const body: unknown = await request.json();
    if (!isRecord(body)) {
      return NextResponse.json({ success: false, error: "Payment details are required." }, { status: 400 });
    }

    const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "";
    const customerEmail = typeof body.customerEmail === "string" ? body.customerEmail.trim().toLowerCase() : "";
    const customerPhone = typeof body.customerPhone === "string" ? body.customerPhone.trim() : "";
    const inquiryReference = typeof body.inquiryReference === "string" ? body.inquiryReference.trim() : "";
    const amount = typeof body.amount === "string" ? body.amount.trim() : "";
    const currency = body.currency;

    if (
      customerName.length < 2 ||
      customerName.length > 100 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail) ||
      customerEmail.length > 254 ||
      customerPhone.length < 7 ||
      customerPhone.length > 30 ||
      inquiryReference.length > 50
    ) {
      return NextResponse.json(
        { success: false, error: "Please check your name, email, phone, and inquiry reference." },
        { status: 400 }
      );
    }

    if (!isSafepayCurrency(currency)) {
      return NextResponse.json(
        { success: false, error: "Select a card currency supported by this checkout." },
        { status: 400 }
      );
    }

    let amountMinor: number;
    try {
      amountMinor = toSafepayMinorUnits(amount, currency);
    } catch (amountError) {
      return NextResponse.json(
        { success: false, error: amountError instanceof Error ? amountError.message : "Enter a valid payment amount." },
        { status: 400 }
      );
    }

    const supabase = getPaymentSupabase();
    const { error: tableError } = await supabase.from("gateway_payments").select("id").limit(0);
    if (tableError) {
      logPaymentBackendError("Safepay payment table is not available", tableError);
      return NextResponse.json(
        { success: false, error: "Safepay payment storage is not ready. The administrator must apply supabase/safepay-checkout.sql." },
        { status: 503 }
      );
    }

    const id = randomUUID();
    const safepay = getSafepayClient();
    const session = await safepay.payments.session.setup({
      merchant_api_key: getSafepayPublicKey(),
      intent: "CYBERSOURCE",
      mode: "payment",
      entry_mode: "raw",
      currency,
      amount: amountMinor,
      metadata: { order_id: id, source: "dwd_payment_page" },
      include_fees: false,
    });

    const trackerToken = getTrackerToken(session);
    if (!trackerToken) {
      throw new Error("Safepay did not return a payment tracker.");
    }

    const passport = await safepay.client.passport.create();
    const authToken = getPassportToken(passport);
    if (!authToken) {
      throw new Error("Safepay did not return a checkout authentication token.");
    }

    const siteUrl = getSafepaySiteUrl();
    const successUrl = new URL("/payment/complete", siteUrl);
    successUrl.searchParams.set("payment", id);
    const cancelUrl = new URL(successUrl);
    cancelUrl.searchParams.set("cancelled", "1");
    const checkoutUrl = safepay.checkout.createCheckoutUrl({
      env: setup.environment as SafepayEnvironment,
      tbt: authToken,
      tracker: trackerToken,
      source: "hosted",
      redirect_url: successUrl.toString(),
      cancel_url: cancelUrl.toString(),
    });

    const parsedCheckoutUrl = new URL(checkoutUrl);
    if (
      parsedCheckoutUrl.protocol !== "https:" ||
      !parsedCheckoutUrl.hostname.endsWith("getsafepay.com")
    ) {
      throw new Error("Safepay returned an unexpected checkout URL.");
    }

    const { error: insertError } = await supabase.from("gateway_payments").insert({
      id,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      inquiry_reference: inquiryReference || null,
      amount_minor: amountMinor,
      currency,
      tracker_token: trackerToken,
      status: "pending",
    });
    if (insertError) throw insertError;

    return NextResponse.json(
      { success: true, checkoutUrl, paymentId: id },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    logPaymentBackendError("Safepay checkout could not be created", error);
    const configuredError = error instanceof Error && error.name === "SafepayConfigurationError";
    const errorCode =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "";
    const databaseError =
      ["42P01", "PGRST205", "42501", "PGRST301"].includes(errorCode) ||
      errorCode.startsWith("PGRST")
        ? describePaymentBackendError(error, "database")
        : "";
    return NextResponse.json(
      {
        success: false,
        error: configuredError
          ? error.message
          : databaseError || "Safepay could not start checkout. Please try again or contact us.",
      },
      { status: configuredError ? 503 : databaseError ? 503 : 502 }
    );
  }
}
