import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  return NextResponse.json(
    { success: false, error: "Customer tracking is temporarily unavailable." },
    { status: 503, headers: { "Cache-Control": "no-store" } }
  );
}
