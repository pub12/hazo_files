/**
 * Google user profile route
 * Fetches user info from Google using the stored tokens
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export interface GoogleUserProfile {
  id: string;
  email: string;
  name: string;
  picture: string;
}

export async function GET() {
  const cookieStore = await cookies();
  const tokensCookie = cookieStore.get('google_drive_tokens');

  if (!tokensCookie?.value) {
    return NextResponse.json({ authenticated: false, profile: null });
  }

  try {
    const tokens = JSON.parse(tokensCookie.value);

    if (!tokens.accessToken) {
      return NextResponse.json({ authenticated: false, profile: null });
    }

    // Fetch user info from Google
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
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

    const profile: GoogleUserProfile = {
      id: userInfo.id,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
    };

    return NextResponse.json({
      authenticated: true,
      profile,
    });
  } catch {
    return NextResponse.json({ authenticated: false, profile: null });
  }
}
