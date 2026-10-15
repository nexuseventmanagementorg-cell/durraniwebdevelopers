import { NextRequest, NextResponse } from "next/server";
import { verifyAdminCredentials, setAdminSessionCookie } from "@/lib/auth";
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
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required." },
        { status: 400 }
      );
    }

    const isValid = verifyAdminCredentials(email, password);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Invalid administrator credentials." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: "Admin authenticated successfully.",
      user: { email, role: "SuperAdmin" },
    });

    setAdminSessionCookie(response, email);
    return response;
  } catch (error) {
    console.error("Admin login error", error);
    return NextResponse.json(
      { success: false, error: "Authentication system failure." },
      { status: 500 }
    );
  }
}
