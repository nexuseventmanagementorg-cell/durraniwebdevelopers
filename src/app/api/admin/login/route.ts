import { NextRequest, NextResponse } from "next/server";
import { setAdminSessionCookie } from "@/lib/auth";
import {
  AdminCredentialStoreError,
  verifyAdminCredentials,
} from "@/lib/admin-credentials";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  try {
    const ip = request.ip || request.headers.get("x-forwarded-for") || "admin";
    const limit = checkRateLimit(`login_${ip}`, 5, 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many login attempts. Please wait ${limit.resetInSec} seconds before retrying.`,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { username, password } = body;

    if (typeof username !== "string" || typeof password !== "string" || !username || !password) {
      return NextResponse.json(
        { success: false, error: "Username and password are required." },
        { status: 400 }
      );
    }

    const isValid = await verifyAdminCredentials(username, password);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Invalid administrator credentials." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: "Admin authenticated successfully.",
      user: { username, role: "SuperAdmin" },
    });

    setAdminSessionCookie(response, username);
    return response;
  } catch (error) {
    if (error instanceof AdminCredentialStoreError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 503 }
      );
    }
    console.error("Admin login error", {
      errorType: error instanceof Error ? error.name : typeof error,
    });
    return NextResponse.json(
      { success: false, error: "Authentication system failure." },
      { status: 500 }
    );
  }
}
