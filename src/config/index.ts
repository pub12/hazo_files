/**
 * Configuration loader for hazo_files
 * Reads configuration from hazo_files_config.ini file
 */

import * as ini from 'ini';
import * as fs from 'fs';
import * as path from 'path';
import type { HazoFilesConfig, StorageProvider, LocalStorageConfig, GoogleDriveConfig } from '../types';

const DEFAULT_CONFIG_FILENAME = 'hazo_files_config.ini';

/**
 * Parse INI configuration file and return typed config object
 */
export function parseConfig(configContent: string): HazoFilesConfig {
  const parsed = ini.parse(configContent);

  const provider = (parsed.general?.provider || 'local') as StorageProvider;

  const config: HazoFilesConfig = {
    provider,
  };

  // Parse local storage config
  if (parsed.local) {
    config.local = {
      basePath: parsed.local.base_path || './files',
      allowedExtensions: parsed.local.allowed_extensions
        ? parsed.local.allowed_extensions.split(',').map((ext: string) => ext.trim())
        : undefined,
      maxFileSize: parsed.local.max_file_size
        ? parseInt(parsed.local.max_file_size, 10)
        : undefined,
    };
  }

  // Parse Google Drive config
  if (parsed.google_drive) {
    config.google_drive = {
      clientId: parsed.google_drive.client_id || process.env.GOOGLE_DRIVE_CLIENT_ID || '',
      clientSecret: parsed.google_drive.client_secret || process.env.GOOGLE_DRIVE_CLIENT_SECRET || '',
      redirectUri: parsed.google_drive.redirect_uri || process.env.GOOGLE_DRIVE_REDIRECT_URI || '',
      refreshToken: parsed.google_drive.refresh_token || process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
      accessToken: parsed.google_drive.access_token || process.env.GOOGLE_DRIVE_ACCESS_TOKEN,
      rootFolderId: parsed.google_drive.root_folder_id || process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID,
    };
  }

  return config;
}

/**
 * Load configuration from file
 * @param configPath - Path to the config file, defaults to hazo_files_config.ini in current directory
 */
export function loadConfig(configPath?: string): HazoFilesConfig {
  const resolvedPath = configPath || path.join(process.cwd(), DEFAULT_CONFIG_FILENAME);

  if (!fs.existsSync(resolvedPath)) {
    // Return default config if file doesn't exist
    console.warn(`Config file not found at ${resolvedPath}, using defaults`);
    return {
      provider: 'local',
      local: {
        basePath: './files',
      },
    };
  }

  const content = fs.readFileSync(resolvedPath, 'utf-8');
  return parseConfig(content);
}

/**
 * Load configuration asynchronously
 */
export async function loadConfigAsync(configPath?: string): Promise<HazoFilesConfig> {
  const resolvedPath = configPath || path.join(process.cwd(), DEFAULT_CONFIG_FILENAME);

  try {
    const content = await fs.promises.readFile(resolvedPath, 'utf-8');
    return parseConfig(content);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.warn(`Config file not found at ${resolvedPath}, using defaults`);
      return {
        provider: 'local',
        local: {
          basePath: './files',
        },
      };
    }
    throw error;
  }
}

/**
 * Generate a sample configuration file content
 */
export function generateSampleConfig(): string {
  return `; Hazo Files Configuration
; This file configures the file management system

[general]
; Available providers: local, google_drive
provider = local

[local]
; Base path for local file storage (relative or absolute)
base_path = ./files
; Comma-separated list of allowed extensions (optional, empty = all allowed)
allowed_extensions =
; Maximum file size in bytes (optional, 0 = unlimited)
max_file_size = 0

[google_drive]
; Google Drive OAuth credentials
; These can also be set via environment variables:
; GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, etc.
client_id =
client_secret =
redirect_uri = http://localhost:3000/api/auth/callback/google
refresh_token =
access_token =
; Optional: Root folder ID to use as base (empty = root of Drive)
root_folder_id =
`;
}

/**
 * Save configuration to file
 */
export async function saveConfig(config: HazoFilesConfig, configPath?: string): Promise<void> {
  const resolvedPath = configPath || path.join(process.cwd(), DEFAULT_CONFIG_FILENAME);

  const iniConfig: Record<string, Record<string, string>> = {
    general: {
      provider: config.provider,
    },
  };

  if (config.local) {
    iniConfig.local = {
      base_path: config.local.basePath,
      allowed_extensions: config.local.allowedExtensions?.join(', ') || '',
      max_file_size: config.local.maxFileSize?.toString() || '0',
    };
  }

  if (config.google_drive) {
    iniConfig.google_drive = {
      client_id: config.google_drive.clientId || '',
      client_secret: config.google_drive.clientSecret || '',
      redirect_uri: config.google_drive.redirectUri || '',
      refresh_token: config.google_drive.refreshToken || '',
      access_token: config.google_drive.accessToken || '',
      root_folder_id: config.google_drive.rootFolderId || '',
    };
  }

  const content = ini.stringify(iniConfig);
  await fs.promises.writeFile(resolvedPath, content, 'utf-8');
}

export type { HazoFilesConfig, LocalStorageConfig, GoogleDriveConfig };
