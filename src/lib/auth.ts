import crypto from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "dwd_admin_session";
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  (process.env.NODE_ENV === "production"
    ? null
    : crypto.randomBytes(32).toString("hex"));

export function signToken(payload: { email: string; timestamp: number }): string {
  if (!SESSION_SECRET) {
    throw new Error("SESSION_SECRET must be configured in production.");
  }
  const json = JSON.stringify(payload);
  const hmac = crypto.createHmac("sha256", SESSION_SECRET);
  hmac.update(json);
  const signature = hmac.digest("hex");
  const encodedPayload = Buffer.from(json).toString("base64url");
  return `${encodedPayload}.${signature}`;
}

export function verifyToken(token: string): { email: string; timestamp: number } | null {
  if (!SESSION_SECRET) return null;

  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [encodedPayload, signature] = parts;
    const json = Buffer.from(encodedPayload, "base64url").toString("utf-8");

    const hmac = crypto.createHmac("sha256", SESSION_SECRET);
    hmac.update(json);
    const expectedSignature = hmac.digest("hex");

    if (
      !crypto.timingSafeEqual(
        Buffer.from(signature, "hex"),
        Buffer.from(expectedSignature, "hex")
      )
    ) {
      return null;
    }

    const payload = JSON.parse(json);
    // Token validity: 7 days
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - payload.timestamp > maxAge) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function setAdminSessionCookie(response: NextResponse, username: string): void {
  const token = signToken({ email: username, timestamp: Date.now() });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
}

export function clearAdminSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function getAdminFromCookies(): { email: string } | null {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!sessionCookie || !sessionCookie.value) return null;
    const payload = verifyToken(sessionCookie.value);
    if (!payload) return null;
    return { email: payload.email };
  } catch {
    return null;
  }
}

export function verifyAdminRequest(request: NextRequest): boolean {
  const cookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (!cookie || !cookie.value) return false;
  const payload = verifyToken(cookie.value);
  return Boolean(payload);
}
