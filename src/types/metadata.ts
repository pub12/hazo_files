/**
 * Metadata tracking types for hazo_files
 * Used for database tracking of file operations
 */

import type { StorageProvider } from './index';

/**
 * Record stored in the hazo_files database table
 * Extends Record<string, unknown> for compatibility with hazo_connect CrudService
 */
export interface FileMetadataRecord extends Record<string, unknown> {
  /** Unique identifier (UUID) */
  id: string;
  /** File or folder name */
  filename: string;
  /** MIME type for files, 'folder' for directories */
  file_type: string;
  /** Custom metadata as JSON string */
  file_data: string;
  /** ISO timestamp when record was created */
  created_at: string;
  /** ISO timestamp of last access or modification */
  changed_at: string;
  /** Virtual path in storage */
  file_path: string;
  /** Storage provider type */
  storage_type: StorageProvider;
}

/**
 * Input for creating a new metadata record
 */
export interface FileMetadataInput {
  filename: string;
  file_type: string;
  file_data?: Record<string, unknown>;
  file_path: string;
  storage_type: StorageProvider;
}

/**
 * Input for updating an existing metadata record
 */
export interface FileMetadataUpdate {
  filename?: string;
  file_type?: string;
  file_data?: Record<string, unknown>;
  file_path?: string;
  changed_at?: string;
}

/**
 * Configuration for database tracking
 */
export interface DatabaseTrackingConfig {
  /** Enable database tracking (default: false) */
  enabled: boolean;
  /** Table name for metadata (default: 'hazo_files') */
  tableName?: string;
  /** Track download operations as access (default: true) */
  trackDownloads?: boolean;
  /** Log database errors instead of failing silently (default: true) */
  logErrors?: boolean;
}

/**
 * Options for TrackedFileManager
 */
export interface TrackedFileManagerOptions {
  /** Database tracking configuration */
  tracking?: DatabaseTrackingConfig;
}
