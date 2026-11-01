import { NextRequest, NextResponse } from "next/server";
import {
  CreativeStudioStorageError,
  getPublicCreativeInquiry,
} from "@/lib/creative-studio-storage";

export const dynamic = "force-dynamic";

function getTrackingToken(request: NextRequest): string {
  const authorization = request.headers.get("authorization") || "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const inquiry = await getPublicCreativeInquiry(
      params.id,
      getTrackingToken(request)
    );
    if (!inquiry) {
      return NextResponse.json({ success: false, error: "Inquiry not found or access token is invalid." }, { status: 404 });
    }
    return NextResponse.json({ success: true, inquiry }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const message = error instanceof CreativeStudioStorageError
      ? error.message
      : "Inquiry status could not be loaded.";
    return NextResponse.json({ success: false, error: message }, { status: 503 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body: unknown = await request.json();
    const token = getTrackingToken(request);
    if (!body || typeof body !== "object" || !("action" in body) || body.action !== "approve_quote") {
      return NextResponse.json({ success: false, error: "A valid quotation action is required." }, { status: 400 });
    }
    const { approveCreativeCustomerQuote } = await import("@/lib/creative-studio-storage");
    const inquiry = await approveCreativeCustomerQuote(params.id, token);
    if (!inquiry) {
      return NextResponse.json({ success: false, error: "Inquiry not found or access token is invalid." }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      inquiry: { id: inquiry.id, status: inquiry.status, quote: inquiry.quote },
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof CreativeStudioStorageError
      ? error.message
      : "Quotation approval could not be saved.";
    return NextResponse.json({ success: false, error: message }, { status: 409 });
  }
}
