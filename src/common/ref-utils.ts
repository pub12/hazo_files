/**
 * Reference Tracking Utilities
 * Pure functions for managing file references within the file_refs JSON field
 */

import type {
  FileRef,
  FileMetadataRecordV2,
  FileMetadataRecord,
  FileWithStatus,
  AddRefOptions,
  RemoveRefsCriteria,
  FileStatus,
} from '../types';

/**
 * Generate a unique reference ID
 */
export function generateRefId(): string {
  return `ref_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Parse a JSON string into FileRef array.
 * Returns empty array on invalid input.
 */
export function parseFileRefs(json: string | null | undefined): FileRef[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

/**
 * Serialize FileRef array to JSON string
 */
export function stringifyFileRefs(refs: FileRef[]): string {
  return JSON.stringify(refs);
}

/**
 * Create a FileRef from AddRefOptions
 */
export function createFileRef(options: AddRefOptions): FileRef {
  const ref: FileRef = {
    ref_id: generateRefId(),
    entity_type: options.entity_type,
    entity_id: options.entity_id,
    created_at: new Date().toISOString(),
  };

  if (options.created_by) ref.created_by = options.created_by;
  if (options.visibility) ref.visibility = options.visibility;
  if (options.label) ref.label = options.label;
  if (options.metadata) ref.metadata = options.metadata;

  return ref;
}

/**
 * Remove a ref by ref_id (immutable)
 */
export function removeRefFromArray(refs: FileRef[], refId: string): FileRef[] {
  return refs.filter((r) => r.ref_id !== refId);
}

/**
 * Remove refs matching criteria from array (immutable).
 * All specified criteria fields must match (AND semantics).
 */
export function removeRefsByCriteriaFromArray(
  refs: FileRef[],
  criteria: Omit<RemoveRefsCriteria, 'file_id' | 'scope_id'>
): FileRef[] {
  return refs.filter((ref) => {
    if (criteria.entity_type && ref.entity_type !== criteria.entity_type) return true;
    if (criteria.entity_id && ref.entity_id !== criteria.entity_id) return true;
    // All specified criteria matched — this ref should be removed
    return !criteria.entity_type && !criteria.entity_id;
  });
}

/**
 * Safely cast a FileMetadataRecord to FileMetadataRecordV2.
 * Missing V2 fields are defaulted.
 */
export function toV2Record(record: FileMetadataRecord): FileMetadataRecordV2 {
  const v2 = record as Record<string, unknown>;
  return {
    ...record,
    file_refs: (typeof v2.file_refs === 'string' ? v2.file_refs : '[]'),
    ref_count: (typeof v2.ref_count === 'number' ? v2.ref_count : 0),
    status: (typeof v2.status === 'string' ? v2.status : 'active') as FileStatus,
    scope_id: (typeof v2.scope_id === 'string' ? v2.scope_id : null) as string | null,
    uploaded_by: (typeof v2.uploaded_by === 'string' ? v2.uploaded_by : null) as string | null,
    original_filename: (typeof v2.original_filename === 'string' ? v2.original_filename : null) as string | null,
    storage_verified_at: (typeof v2.storage_verified_at === 'string' ? v2.storage_verified_at : null) as string | null,
    deleted_at: (typeof v2.deleted_at === 'string' ? v2.deleted_at : null) as string | null,
  };
}

/**
 * Build a FileWithStatus view from a record
 */
export function buildFileWithStatus(record: FileMetadataRecord): FileWithStatus {
  const v2 = toV2Record(record);
  const refs = parseFileRefs(v2.file_refs);
  return {
    record: v2,
    refs,
    is_orphaned: refs.length === 0,
  };
}
