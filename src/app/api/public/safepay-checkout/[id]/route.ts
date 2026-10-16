import { NextRequest, NextResponse } from "next/server";
import { getPaymentSupabase, describePaymentBackendError, logPaymentBackendError } from "@/lib/payment-server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) {
    return NextResponse.json({ success: false, error: "Invalid payment reference." }, { status: 400 });
  }

  try {
    const { data, error } = await getPaymentSupabase()
      .from("gateway_payments")
      .select("status,currency,amount_minor")
      .eq("id", params.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ success: false, error: "Payment reference was not found." }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        payment: {
          status: data.status,
          currency: data.currency,
          amountMinor: Number(data.amount_minor),
        },
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    logPaymentBackendError("Could not load Safepay payment status", error);
    return NextResponse.json(
      {
        success: false,
        error: describePaymentBackendError(error, "database"),
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
