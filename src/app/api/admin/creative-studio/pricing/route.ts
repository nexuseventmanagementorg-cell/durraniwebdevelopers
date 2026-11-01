import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/auth";
import {
  CreativeStudioStorageError,
  getCreativeStudioConfig,
  isValidCreativeStudioConfig,
  saveCreativeStudioConfig,
} from "@/lib/creative-studio-storage";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!getAdminFromRequest(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const config = await getCreativeStudioConfig();
    return NextResponse.json({ success: true, config }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const message = error instanceof CreativeStudioStorageError
      ? error.message
      : "Pricing configuration could not be loaded.";
    return NextResponse.json({ success: false, error: message }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const config: unknown = await request.json();
    if (!isValidCreativeStudioConfig(config)) {
      return NextResponse.json({ success: false, error: "Pricing configuration contains invalid rates or add-ons." }, { status: 400 });
    }
    const saved = await saveCreativeStudioConfig(config, admin.email);
    return NextResponse.json({ success: true, config: saved }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const message = error instanceof CreativeStudioStorageError
      ? error.message
      : "Pricing configuration could not be saved.";
    return NextResponse.json({ success: false, error: message }, { status: 503 });
  }
}
