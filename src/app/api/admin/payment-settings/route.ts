import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/auth";
import { DEFAULT_PAYMENT_SETTINGS } from "@/lib/payment-types";
import {
  describePaymentBackendError,
  getPaymentSupabase,
  logPaymentBackendError,
  readPaymentSettings,
  validatePaymentSettings,
} from "@/lib/payment-server";

export async function GET(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(
      { success: true, settings: await readPaymentSettings() },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    logPaymentBackendError("Could not load admin payment settings", error);
    return NextResponse.json(
      { success: false, error: describePaymentBackendError(error, "database") },
      { status: 503 }
    );
  }
}

export async function PUT(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (!validatePaymentSettings(body.settings)) {
      return NextResponse.json({ success: false, error: "Payment settings are invalid." }, { status: 400 });
    }

    const settings = Object.fromEntries(
      Object.entries(body.settings).map(([key, value]) => [
        key,
        typeof value === "string" ? value.trim() : value,
      ])
    );
    const supabase = getPaymentSupabase();
    const { error } = await supabase
      .from("payment_settings")
      .upsert({ id: "default", settings, updated_at: new Date().toISOString() }, { onConflict: "id" });
    if (error) throw error;

    return NextResponse.json({ success: true, settings: { ...DEFAULT_PAYMENT_SETTINGS, ...settings } });
  } catch (error) {
    logPaymentBackendError("Could not save admin payment settings", error);
    return NextResponse.json(
      { success: false, error: describePaymentBackendError(error, "database") },
      { status: 503 }
    );
  }
}
