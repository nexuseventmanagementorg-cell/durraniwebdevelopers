import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminSessionVersion } from '@/lib/db';

export const ADMIN_SESSION_COOKIE = 'student_admin_session';
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function getSessionSigningKey(): Buffer {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error('ADMIN_SESSION_SECRET is not configured.');
  }

  return createHmac('sha256', secret).update(getAdminSessionVersion()).digest();
}

export function createAdminSessionToken(): string {
  const issuedAt = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac('sha256', getSessionSigningKey())
    .update(issuedAt)
    .digest('base64url');
  return `${issuedAt}.${signature}`;
}

export function requireAdmin(req: NextRequest): NextResponse | null {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!process.env.ADMIN_SESSION_SECRET || !token) {
    return NextResponse.json({ success: false, error: 'Admin login required.' }, { status: 401 });
  }

  const [issuedAtText, receivedSignature, ...extraParts] = token.split('.');
  const issuedAt = Number(issuedAtText);
  const now = Math.floor(Date.now() / 1000);
  if (
    extraParts.length > 0 ||
    !Number.isSafeInteger(issuedAt) ||
    issuedAt > now ||
    now - issuedAt > ADMIN_SESSION_MAX_AGE ||
    !receivedSignature
  ) {
    return NextResponse.json({ success: false, error: 'Admin session expired.' }, { status: 401 });
  }

  const expectedSignature = createHmac('sha256', getSessionSigningKey())
    .update(issuedAtText)
    .digest('base64url');
  const expectedBuffer = Buffer.from(expectedSignature);
  const receivedBuffer = Buffer.from(receivedSignature);
  if (
    expectedBuffer.length !== receivedBuffer.length ||
    !timingSafeEqual(expectedBuffer, receivedBuffer)
  ) {
    return NextResponse.json({ success: false, error: 'Admin login required.' }, { status: 401 });
  }

  return null;
}
