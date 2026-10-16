import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import {
  getAllTimeVisitorCounts,
  hashVisitorId,
  isVisitorAnalyticsEvent,
  recordVisitorEvent,
} from "@/lib/visitor-analytics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(
      { success: true, ...(await getAllTimeVisitorCounts()) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("All-time visitor analytics could not be read", error);
    return NextResponse.json(
      { success: false, error: "Visitor analytics are temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function POST(request: NextRequest) {
  const ip = request.ip || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "client";
  const limit = checkRateLimit(`visitor-analytics:${ip}`, 120, 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, error: "Analytics event limit reached. Please retry shortly." },
      { status: 429, headers: { "Retry-After": String(limit.resetInSec) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid analytics request." },
      { status: 400 }
    );
  }

  try {
    if (
      typeof body !== "object" ||
      body === null ||
      !("event" in body) ||
      !isVisitorAnalyticsEvent(body.event) ||
      !("visitorId" in body) ||
      typeof body.visitorId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.visitorId)
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid analytics event." },
        { status: 400 }
      );
    }

    const visitorHash = hashVisitorId(body.visitorId);
    await recordVisitorEvent(body.event, visitorHash);
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("All-time visitor analytics event could not be recorded", error);
    return NextResponse.json(
      { success: false, error: "Visitor analytics are temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
