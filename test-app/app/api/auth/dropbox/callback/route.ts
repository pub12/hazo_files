/**
 * Dropbox OAuth callback route
 */

import { NextRequest, NextResponse } from 'next/server';
import { createDropboxAuth } from 'hazo_files';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL('/dropbox?error=' + error, request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/dropbox?error=no_code', request.url));
  }

  const clientId = process.env.HAZO_DROPBOX_CLIENT_ID;
  const clientSecret = process.env.HAZO_DROPBOX_CLIENT_SECRET;
  const redirectUri = process.env.HAZO_DROPBOX_REDIRECT_URI || 'http://localhost:3000/api/auth/dropbox/callback';

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/dropbox?error=not_configured', request.url));
  }

  try {
    const auth = createDropboxAuth({
      clientId,
      clientSecret,
      redirectUri,
    });

    const tokens = await auth.exchangeCodeForTokens(code);

    // Store tokens in a secure HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set('dropbox_tokens', JSON.stringify(tokens), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    return NextResponse.redirect(new URL('/dropbox', request.url));
  } catch (err) {
    console.error('Dropbox OAuth callback error:', err);
    return NextResponse.redirect(new URL('/dropbox?error=auth_failed', request.url));
  }
}
