/**
 * Google OAuth initiation route
 */

import { NextResponse } from 'next/server';
import { createGoogleDriveAuth } from 'hazo_files';

export async function GET() {
  const clientId = process.env.HAZO_GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.HAZO_GOOGLE_DRIVE_CLIENT_SECRET;
  const redirectUri = process.env.HAZO_GOOGLE_DRIVE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'Google OAuth not configured. Set HAZO_GOOGLE_DRIVE_CLIENT_ID and HAZO_GOOGLE_DRIVE_CLIENT_SECRET.' },
      { status: 500 }
    );
  }

  const auth = createGoogleDriveAuth({
    clientId,
    clientSecret,
    redirectUri,
  });

  const authUrl = auth.getAuthUrl();

  return NextResponse.redirect(authUrl);
}
