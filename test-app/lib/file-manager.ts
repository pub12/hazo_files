/**
 * Shared file manager utilities for API routes
 */

import { cookies } from 'next/headers';
import {
  createInitializedFileManager,
  createInitializedTrackedFileManager,
  loadConfig,
} from 'hazo_files';
import type { HazoFilesConfig, TokenData, DropboxTokenData, TrackedFileManager } from 'hazo_files';
import { initializeDatabase, isTrackingEnabled } from '../config/database';

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
 * Get Dropbox tokens from cookie
 */
export async function getDropboxTokens(): Promise<DropboxTokenData | null> {
  const cookieStore = await cookies();
  const tokensCookie = cookieStore.get('dropbox_tokens');
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
 * Uses TrackedFileManager if database tracking is enabled
 * Automatically retrieves Google Drive/Dropbox tokens from cookie
 */
export async function getFileManager(provider: 'local' | 'google_drive' | 'dropbox' = 'local') {
  const baseConfig = loadConfig();

  // Get Google tokens from cookie if using Google Drive
  let googleTokens: TokenData | null = null;
  if (provider === 'google_drive') {
    googleTokens = await getGoogleTokens();
    if (!googleTokens) {
      throw new Error('Authentication failed for google_drive: Not authenticated. Please connect your Google Drive.');
    }
  }

  // Get Dropbox tokens from cookie if using Dropbox
  let dropboxTokens: DropboxTokenData | null = null;
  if (provider === 'dropbox') {
    dropboxTokens = await getDropboxTokens();
    if (!dropboxTokens) {
      throw new Error('Authentication failed for dropbox: Not authenticated. Please connect your Dropbox.');
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
    dropbox: {
      clientId: process.env.HAZO_DROPBOX_CLIENT_ID || '',
      clientSecret: process.env.HAZO_DROPBOX_CLIENT_SECRET || '',
      redirectUri: process.env.HAZO_DROPBOX_REDIRECT_URI || '',
      refreshToken: dropboxTokens?.refreshToken || process.env.HAZO_DROPBOX_REFRESH_TOKEN,
      accessToken: dropboxTokens?.accessToken,
      rootPath: process.env.HAZO_DROPBOX_ROOT_PATH,
    },
  };

  // Check if database tracking is enabled
  if (isTrackingEnabled()) {
    try {
      const crudService = await initializeDatabase();
      return createInitializedTrackedFileManager({
        config,
        crudService,
        tracking: {
          enabled: true,
          tableName: 'hazo_files',
          trackDownloads: true,
          logErrors: true,
        },
      });
    } catch (error) {
      // If database initialization fails, fall back to regular file manager
      console.warn('[hazo_files] Database tracking initialization failed, using standard FileManager:', error);
    }
  }

  return createInitializedFileManager({ config });
}

/**
 * Get a tracked file manager (throws if tracking is disabled)
 */
export async function getTrackedFileManager(
  provider: 'local' | 'google_drive' | 'dropbox' = 'local'
): Promise<TrackedFileManager> {
  if (!isTrackingEnabled()) {
    throw new Error('Database tracking is disabled. Set HAZO_FILES_DB_ENABLED=true to enable.');
  }

  const manager = await getFileManager(provider);

  // Check if it's actually a TrackedFileManager
  if (!('isTrackingActive' in manager)) {
    throw new Error('Failed to create TrackedFileManager. Database may not be properly configured.');
  }

  return manager as TrackedFileManager;
}
