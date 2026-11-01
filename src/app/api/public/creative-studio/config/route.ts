import { NextResponse } from "next/server";
import {
  getCreativeStudioConfig,
  getCreativeStudioReadiness,
} from "@/lib/creative-studio-storage";
import { hasPaymentSupabaseConfiguration } from "@/lib/payment-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const readiness = await getCreativeStudioReadiness();
    const localDevelopment = process.env.NODE_ENV !== "production" &&
      !hasPaymentSupabaseConfiguration();
    if (readiness.status !== "READY" && !localDevelopment) {
      return NextResponse.json(
        { success: false, readiness, error: readiness.message },
        { status: 503, headers: { "Cache-Control": "no-store" } }
      );
    }

    const config = await getCreativeStudioConfig();
    return NextResponse.json(
      { success: true, config, readiness },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Creative Studio pricing could not be loaded.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
