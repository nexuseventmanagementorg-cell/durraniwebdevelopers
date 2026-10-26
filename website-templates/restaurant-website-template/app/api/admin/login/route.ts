import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_MAX_AGE, createAdminSessionToken } from '@/lib/adminAuth';
import { verifyAdminLogin } from '@/lib/adminCredentials';
import { getStoredAdminCredentials } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    if (
      !body ||
      typeof body !== 'object' ||
      !('username' in body) ||
      !('password' in body) ||
      typeof body.username !== 'string' ||
      typeof body.password !== 'string'
    ) {
      return NextResponse.json({ success: false, error: 'Username and password are required.' }, { status: 400 });
    }
    const { username, password } = body;
    const hasStoredCredentials = Boolean(getStoredAdminCredentials());

    if (
      !hasStoredCredentials &&
      (!process.env.ADMIN_USERNAME || !process.env.ADMIN_SECRET_KEY)
    ) {
      return NextResponse.json(
        { success: false, error: 'Admin login is not configured on this server.' },
        { status: 503 }
      );
    }

    if (!(await verifyAdminLogin(username, password))) {
      return NextResponse.json({ success: false, error: 'Invalid password or PIN' }, { status: 401 });
    }

    let sessionToken: string;
    try {
      sessionToken = createAdminSessionToken();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Admin login is not configured on this server.' },
        { status: 503 }
      );
    }
    const response = NextResponse.json({ success: true, message: 'Authentication successful' });

    // Set secure HTTP-only cookie for session
    response.cookies.set({
      name: ADMIN_SESSION_COOKIE,
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: ADMIN_SESSION_MAX_AGE,
    });

    return response;
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, message: 'Logged out' });
  response.cookies.delete(ADMIN_SESSION_COOKIE);
  return response;
}
