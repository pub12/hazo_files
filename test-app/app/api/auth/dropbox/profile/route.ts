/**
 * Dropbox user profile route
 * Fetches user info from Dropbox using the stored tokens
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export interface DropboxUserProfile {
  account_id: string;
  email: string;
  name: string;
  profile_photo_url?: string;
}

export async function GET() {
  const cookieStore = await cookies();
  const tokensCookie = cookieStore.get('dropbox_tokens');

  if (!tokensCookie?.value) {
    return NextResponse.json({ authenticated: false, profile: null });
  }

  try {
    const tokens = JSON.parse(tokensCookie.value);

    if (!tokens.accessToken) {
      return NextResponse.json({ authenticated: false, profile: null });
    }

    // Fetch user info from Dropbox
    const response = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    });

    if (!response.ok) {
      // Token might be expired, but user is still "authenticated" with refresh token
      if (tokens.refreshToken) {
        return NextResponse.json({
          authenticated: true,
          profile: null,
          tokenExpired: true,
        });
      }
      return NextResponse.json({ authenticated: false, profile: null });
    }

    const userInfo = await response.json();

    const profile: DropboxUserProfile = {
      account_id: userInfo.account_id,
      email: userInfo.email,
      name: userInfo.name?.display_name || userInfo.email,
      profile_photo_url: userInfo.profile_photo_url,
    };

    return NextResponse.json({
      authenticated: true,
      profile,
    });
  } catch {
    return NextResponse.json({ authenticated: false, profile: null });
  }
}
