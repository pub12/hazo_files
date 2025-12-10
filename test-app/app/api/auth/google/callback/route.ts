/**
 * Google OAuth callback route
 */

import { NextRequest, NextResponse } from 'next/server';
import { createGoogleDriveAuth } from 'hazo_files';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL('/google-drive?error=' + error, request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/google-drive?error=no_code', request.url));
  }

  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/google-drive?error=not_configured', request.url));
  }

  try {
    const auth = createGoogleDriveAuth({
      clientId,
      clientSecret,
      redirectUri,
    });

    const tokens = await auth.exchangeCodeForTokens(code);

    // Store tokens in a secure HTTP-only cookie
    // In production, you should store this in a database per user
    const cookieStore = await cookies();
    cookieStore.set('google_drive_tokens', JSON.stringify(tokens), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    return NextResponse.redirect(new URL('/google-drive', request.url));
  } catch (err) {
    console.error('OAuth callback error:', err);
    return NextResponse.redirect(new URL('/google-drive?error=auth_failed', request.url));
  }
}
