import { NextRequest, NextResponse } from "next/server";
import { getAdminFromCookies, verifyAdminRequest } from "@/lib/auth";
import {
  AdminCredentialStoreError,
  saveAdminPassword,
  verifyAdminCredentials,
} from "@/lib/admin-credentials";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  const ip = request.ip || request.headers.get("x-forwarded-for") || "admin";
  const limit = checkRateLimit(`admin_password_${ip}`, 5, 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: `Too many password change attempts. Please wait ${limit.resetInSec} seconds before retrying.`,
      },
      { status: 429 }
    );
  }

  if (!verifyAdminRequest(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const { currentPassword, newPassword } = await request.json();
    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      !currentPassword ||
      !newPassword
    ) {
      return NextResponse.json(
        { success: false, error: "Current and new passwords are required." },
        { status: 400 }
      );
    }

    if (newPassword.length < 12 || newPassword.length > 128) {
      return NextResponse.json(
        { success: false, error: "New password must be 12 to 128 characters long." },
        { status: 400 }
      );
    }

    if (newPassword === currentPassword) {
      return NextResponse.json(
        { success: false, error: "Choose a new password different from the current one." },
        { status: 400 }
      );
    }

    const admin = getAdminFromCookies();
    if (!admin || !(await verifyAdminCredentials(admin.email, currentPassword))) {
      return NextResponse.json(
        { success: false, error: "Current password is incorrect." },
        { status: 401 }
      );
    }

    await saveAdminPassword(newPassword);
    return NextResponse.json({
      success: true,
      message: "Admin password changed successfully.",
    });
  } catch (error) {
    if (error instanceof AdminCredentialStoreError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 503 }
      );
    }
    console.error("Admin password change failed", {
      errorType: error instanceof Error ? error.name : typeof error,
    });
    return NextResponse.json(
      { success: false, error: "Could not change the admin password." },
      { status: 500 }
    );
  }
}
