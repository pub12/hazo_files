/**
 * Google OAuth status check route
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const tokensCookie = cookieStore.get('google_drive_tokens');

  if (!tokensCookie?.value) {
    return NextResponse.json({ authenticated: false });
  }

  try {
    const tokens = JSON.parse(tokensCookie.value);
    return NextResponse.json({
      authenticated: true,
      hasRefreshToken: !!tokens.refreshToken,
    });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}
