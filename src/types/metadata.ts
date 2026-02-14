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
  /** xxHash hash of file content for change detection (null for folders) */
  file_hash?: string | null;
  /** File size in bytes (null for folders) */
  file_size?: number | null;
  /** ISO timestamp when file content last changed */
  file_changed_at?: string | null;
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
  /** xxHash hash of file content for change detection */
  file_hash?: string;
  /** File size in bytes */
  file_size?: number;
  /** Scope ID for organizational grouping (V2) */
  scope_id?: string;
  /** User who uploaded the file (V2) */
  uploaded_by?: string;
  /** Original filename at upload time (V2) */
  original_filename?: string;
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

/**
 * Individual extraction entry stored in raw_data array
 */
export interface ExtractionData {
  /** Unique identifier for this extraction */
  id: string;
  /** ISO timestamp when extraction was performed */
  extracted_at: string;
  /** Optional source identifier (e.g., LLM model, extraction method) */
  source?: string;
  /** The extracted data payload */
  data: Record<string, unknown>;
}

/**
 * Structure for the file_data JSON field supporting extraction data
 */
export interface FileDataStructure {
  /** Combined data from all extractions */
  merged_data: Record<string, unknown>;
  /** Array of individual extraction entries */
  raw_data: ExtractionData[];
}

/**
 * Options for adding an extraction
 */
export interface AddExtractionOptions {
  /** Custom ID for the extraction (auto-generated if not provided) */
  id?: string;
  /** Source identifier for the extraction */
  source?: string;
  /** Merge strategy: 'shallow' spreads top-level, 'deep' recursively merges */
  mergeStrategy?: 'shallow' | 'deep';
}

/**
 * Options for removing an extraction
 */
export interface RemoveExtractionOptions {
  /** Whether to recalculate merged_data after removal (default: true) */
  recalculateMerged?: boolean;
  /** Merge strategy to use when recalculating (default: 'shallow') */
  mergeStrategy?: 'shallow' | 'deep';
}
