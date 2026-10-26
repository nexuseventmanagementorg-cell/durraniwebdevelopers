import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, requireAdmin } from '@/lib/adminAuth';
import {
  getCurrentAdminUsername,
  saveAdminCredentials,
  verifyCurrentAdminPassword,
} from '@/lib/adminCredentials';

export async function GET(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  const username = getCurrentAdminUsername();
  if (!username) {
    return NextResponse.json(
      { success: false, error: 'Admin login is not configured on this server.' },
      { status: 503 }
    );
  }

  return NextResponse.json({ success: true, username });
}

export async function POST(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== 'object' ||
    !('currentPassword' in body) ||
    !('username' in body) ||
    !('password' in body) ||
    typeof body.currentPassword !== 'string' ||
    typeof body.username !== 'string' ||
    typeof body.password !== 'string'
  ) {
    return NextResponse.json(
      { success: false, error: 'Current password, username, and new password are required.' },
      { status: 400 }
    );
  }

  const username = body.username.trim();
  if (username.length < 3 || username.length > 64) {
    return NextResponse.json(
      { success: false, error: 'Username must be between 3 and 64 characters.' },
      { status: 400 }
    );
  }

  if (body.password.length < 12 || body.password.length > 128) {
    return NextResponse.json(
      { success: false, error: 'New password must be between 12 and 128 characters.' },
      { status: 400 }
    );
  }

  if (!(await verifyCurrentAdminPassword(body.currentPassword))) {
    return NextResponse.json(
      { success: false, error: 'Current password is incorrect.' },
      { status: 401 }
    );
  }

  try {
    await saveAdminCredentials(username, body.password);
  } catch {
    return NextResponse.json(
      { success: false, error: 'Could not save admin credentials. Please try again.' },
      { status: 500 }
    );
  }

  const response = NextResponse.json({
    success: true,
    message: 'Credentials updated. Sign in again using your new credentials.',
  });
  response.cookies.delete(ADMIN_SESSION_COOKIE);
  return response;
}
