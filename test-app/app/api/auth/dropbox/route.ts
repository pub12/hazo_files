/**
 * Dropbox OAuth initiation route
 */

import { NextResponse } from 'next/server';
import { createDropboxAuth } from 'hazo_files';

export async function GET() {
  const clientId = process.env.HAZO_DROPBOX_CLIENT_ID;
  const clientSecret = process.env.HAZO_DROPBOX_CLIENT_SECRET;
  const redirectUri = process.env.HAZO_DROPBOX_REDIRECT_URI || 'http://localhost:3000/api/auth/dropbox/callback';

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'Dropbox OAuth not configured. Set HAZO_DROPBOX_CLIENT_ID and HAZO_DROPBOX_CLIENT_SECRET.' },
      { status: 500 }
    );
  }

  const auth = createDropboxAuth({
    clientId,
    clientSecret,
    redirectUri,
  });

  const authUrl = auth.getAuthUrl();

  return NextResponse.redirect(authUrl);
}
