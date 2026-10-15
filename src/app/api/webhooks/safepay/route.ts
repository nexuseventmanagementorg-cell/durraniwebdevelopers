import { NextRequest, NextResponse } from "next/server";
import {
  getPaymentSupabase,
  logPaymentBackendError,
} from "@/lib/payment-server";
import {
  getSafepayPublicKey,
  getSafepaySetupStatus,
  verifySafepayWebhookSignature,
} from "@/lib/safepay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: NextRequest) {
  const setup = getSafepaySetupStatus();
  if (!setup.configured) {
    return NextResponse.json(
      { success: false, error: "Safepay webhook configuration is incomplete." },
      { status: 503 }
    );
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > 100_000) {
    return NextResponse.json({ success: false, error: "Webhook payload is too large." }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ success: false, error: "Invalid webhook JSON." }, { status: 400 });
  }

  const signature = request.headers.get("x-sfpy-signature");
  const webhookSecret = process.env.SAFEPAY_WEBHOOK_SECRET?.trim() || "";
  if (!verifySafepayWebhookSignature(payload, signature, webhookSecret)) {
    return NextResponse.json({ success: false, error: "Invalid Safepay webhook signature." }, { status: 400 });
  }

  if (!isRecord(payload)) {
    return NextResponse.json({ success: false, error: "Invalid Safepay event." }, { status: 400 });
  }

  if (payload.merchant_api_key !== getSafepayPublicKey()) {
    return NextResponse.json({ success: false, error: "Safepay merchant key does not match." }, { status: 400 });
  }

  if (payload.type !== "payment.succeeded") {
    return NextResponse.json({ success: true, received: true }, { status: 200 });
  }

  const data = payload.data;
  if (
    !isRecord(data) ||
    typeof data.tracker !== "string" ||
    data.state !== "TRACKER_ENDED" ||
    !Number.isSafeInteger(data.amount) ||
    typeof data.currency !== "string" ||
    !isRecord(data.metadata) ||
    typeof data.metadata.order_id !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(data.metadata.order_id)
  ) {
    return NextResponse.json(
      { success: false, error: "Safepay payment event is missing verified transaction details." },
      { status: 400 }
    );
  }

  try {
    const supabase = getPaymentSupabase();
    const { data: updatedPayment, error } = await supabase
      .from("gateway_payments")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
      })
      .eq("id", data.metadata.order_id)
      .eq("tracker_token", data.tracker)
      .eq("amount_minor", data.amount)
      .eq("currency", data.currency)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!updatedPayment) {
      const { data: existing, error: lookupError } = await supabase
        .from("gateway_payments")
        .select("status,amount_minor,currency")
        .eq("id", data.metadata.order_id)
        .eq("tracker_token", data.tracker)
        .maybeSingle();
      if (lookupError) throw lookupError;

      if (
        existing?.status !== "paid" ||
        Number(existing.amount_minor) !== data.amount ||
        existing.currency !== data.currency
      ) {
        console.error("Safepay succeeded event did not match a pending payment record.", {
          eventType: payload.type,
          paymentFound: Boolean(existing),
        });
      }
    }

    return NextResponse.json({ success: true, received: true }, { status: 200 });
  } catch (error) {
    logPaymentBackendError("Safepay webhook could not update payment status", error);
    return NextResponse.json(
      { success: false, error: "Payment status could not be saved." },
      { status: 500 }
    );
  }
}
