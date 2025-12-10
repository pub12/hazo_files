/**
 * Google OAuth disconnect route
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();

  // Remove the tokens cookie
  cookieStore.delete('google_drive_tokens');

  return NextResponse.json({ success: true });
}
