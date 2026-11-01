import { NextResponse } from "next/server";
import { getCreativeStudioReadiness } from "@/lib/creative-studio-storage";

export const dynamic = "force-dynamic";

export async function GET() {
  const readiness = await getCreativeStudioReadiness();
  const unavailable = readiness.status === "UNAVAILABLE" ||
    readiness.status === "CONFIGURATION_ERROR";
  return NextResponse.json(
    { success: !unavailable && readiness.status === "READY", readiness },
    {
      status: unavailable ? 503 : 200,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
