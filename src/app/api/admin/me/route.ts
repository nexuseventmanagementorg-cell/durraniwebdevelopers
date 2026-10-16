import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/auth";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ success: false, authenticated: false }, { status: 401 });
  }

  const cookieStore = cookies();
  const sessionCookie = cookieStore.get("dwd_admin_session");
  const payload = sessionCookie ? verifyToken(sessionCookie.value) : null;

  return NextResponse.json({
    success: true,
    authenticated: true,
    user: {
      username: payload?.email || "",
      role: "SuperAdmin",
    },
  });
}
