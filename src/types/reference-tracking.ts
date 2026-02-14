/**
 * Reference Tracking Types for hazo_files
 * Supports multi-entity file references with lifecycle management
 */

import type { FileMetadataRecord, StorageProvider } from './index';

// ============================================
// Core Reference Types
// ============================================

/** Status of a file in the system */
export type FileStatus = 'active' | 'orphaned' | 'soft_deleted' | 'missing';

/** Visibility level for a file reference */
export type FileRefVisibility = 'public' | 'private' | 'internal';

/**
 * A reference from an entity to a file.
 * Multiple entities can reference the same file.
 */
export interface FileRef {
  /** Unique ID for this reference */
  ref_id: string;
  /** Type of entity referencing the file (e.g., 'form_field', 'chat_message') */
  entity_type: string;
  /** ID of the entity referencing the file */
  entity_id: string;
  /** ISO timestamp when reference was created */
  created_at: string;
  /** User or system that created this reference */
  created_by?: string;
  /** Visibility of this reference */
  visibility?: FileRefVisibility;
  /** Optional label for the reference */
  label?: string;
  /** Optional metadata for the reference */
  metadata?: Record<string, unknown>;
}

// ============================================
// Extended Record Type
// ============================================

/**
 * Extended metadata record with reference tracking fields.
 * Extends FileMetadataRecord with V2 columns.
 */
export interface FileMetadataRecordV2 extends FileMetadataRecord {
  /** JSON string of FileRef[] - parsed by service methods */
  file_refs: string;
  /** Number of active references (denormalized for queries) */
  ref_count: number;
  /** Current file status */
  status: FileStatus;
  /** Scope ID for organizational grouping (e.g., workspace, tenant) */
  scope_id?: string | null;
  /** User who uploaded the file */
  uploaded_by?: string | null;
  /** Original filename at upload time */
  original_filename?: string | null;
  /** ISO timestamp when storage was last verified */
  storage_verified_at?: string | null;
  /** ISO timestamp when file was soft-deleted */
  deleted_at?: string | null;
}

// ============================================
// Options & Criteria Types
// ============================================

/**
 * Options for adding a reference to a file
 */
export interface AddRefOptions {
  /** Type of entity referencing the file */
  entity_type: string;
  /** ID of the entity referencing the file */
  entity_id: string;
  /** User creating the reference */
  created_by?: string;
  /** Visibility of the reference */
  visibility?: FileRefVisibility;
  /** Optional label */
  label?: string;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Criteria for removing references.
 * All specified fields must match (AND semantics).
 */
export interface RemoveRefsCriteria {
  /** Match by entity type */
  entity_type?: string;
  /** Match by entity ID */
  entity_id?: string;
  /** Match by scope ID on the file record */
  scope_id?: string;
  /** Match by specific file ID */
  file_id?: string;
}

/**
 * Rich status view of a file with parsed references
 */
export interface FileWithStatus {
  /** Full metadata record (V2) */
  record: FileMetadataRecordV2;
  /** Parsed file references */
  refs: FileRef[];
  /** Whether the file has zero references */
  is_orphaned: boolean;
}

/**
 * Options for finding orphaned files
 */
export interface FindOrphanedOptions {
  /** Only find orphans older than this duration (ISO 8601 duration or ms) */
  olderThanMs?: number;
  /** Filter by scope */
  scope_id?: string;
  /** Filter by storage type */
  storage_type?: StorageProvider;
  /** Maximum number of results */
  limit?: number;
}

/**
 * Options for cleaning up orphaned files
 */
export interface CleanupOrphanedOptions extends FindOrphanedOptions {
  /** If true, only soft-delete rather than permanently removing (default: false) */
  softDeleteOnly?: boolean;
  /** If true, also delete physical files (default: true) */
  deletePhysicalFiles?: boolean;
}

/**
 * Options for uploading a file with an initial reference
 */
export interface UploadWithRefOptions {
  /** Reference to add after upload */
  ref?: AddRefOptions;
  /** Scope ID for the file */
  scope_id?: string;
  /** User performing the upload */
  uploaded_by?: string;
}
