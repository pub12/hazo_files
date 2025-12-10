/**
 * Shared file manager utilities for API routes
 */

import { cookies } from 'next/headers';
import { createInitializedFileManager, loadConfig } from 'hazo_files';
import type { HazoFilesConfig, TokenData } from 'hazo_files';

/**
 * Get Google Drive tokens from cookie
 */
export async function getGoogleTokens(): Promise<TokenData | null> {
  const cookieStore = await cookies();
  const tokensCookie = cookieStore.get('google_drive_tokens');
  if (!tokensCookie?.value) {
    return null;
  }
  try {
    return JSON.parse(tokensCookie.value);
  } catch {
    return null;
  }
}

/**
 * Get file manager instance for a provider
 * Automatically retrieves Google Drive tokens from cookie
 */
export async function getFileManager(provider: 'local' | 'google_drive' = 'local') {
  const baseConfig = loadConfig();

  // Get Google tokens from cookie if using Google Drive
  let googleTokens: TokenData | null = null;
  if (provider === 'google_drive') {
    googleTokens = await getGoogleTokens();
    if (!googleTokens) {
      throw new Error('Authentication failed for google_drive: Not authenticated. Please connect your Google Drive.');
    }
  }

  const config: HazoFilesConfig = {
    ...baseConfig,
    provider,
    local: {
      basePath: process.env.LOCAL_STORAGE_BASE_PATH || './files',
    },
    google_drive: {
      clientId: process.env.HAZO_GOOGLE_DRIVE_CLIENT_ID || '',
      clientSecret: process.env.HAZO_GOOGLE_DRIVE_CLIENT_SECRET || '',
      redirectUri: process.env.HAZO_GOOGLE_DRIVE_REDIRECT_URI || '',
      // Use refresh token from cookie, or fall back to env var
      refreshToken: googleTokens?.refreshToken || process.env.HAZO_GOOGLE_DRIVE_REFRESH_TOKEN,
      // Pass the access token if available
      accessToken: googleTokens?.accessToken,
    },
  };

  return createInitializedFileManager({ config });
}
