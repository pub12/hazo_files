/**
 * File Metadata Service
 * Handles database operations for tracking file metadata
 * Uses hazo_connect for database interactions
 */

import type {
  FileMetadataRecord,
  FileMetadataInput,
  StorageProvider,
  FileDataStructure,
  ExtractionData,
  AddExtractionOptions,
  RemoveExtractionOptions,
  FileRef,
  FileMetadataRecordV2,
  FileWithStatus,
  AddRefOptions,
  RemoveRefsCriteria,
  FileStatus,
  FindOrphanedOptions,
} from '../types';
import { getBaseName, getDirName } from '../common/path-utils';
import {
  parseFileData,
  stringifyFileData,
  addExtractionToFileData,
  removeExtractionById as removeExtractionByIdUtil,
  removeExtractionByIndex as removeExtractionByIndexUtil,
  getMergedData as getMergedDataUtil,
  getExtractions as getExtractionsUtil,
  getExtractionById as getExtractionByIdUtil,
  createEmptyFileDataStructure,
} from '../common/file-data-utils';
import {
  parseFileRefs,
  stringifyFileRefs,
  createFileRef,
  removeRefFromArray,
  removeRefsByCriteriaFromArray,
  toV2Record,
  buildFileWithStatus,
} from '../common/ref-utils';

/**
 * Logger interface compatible with hazo_connect
 */
export interface MetadataLogger {
  debug?(message: string, data?: Record<string, unknown>): void;
  info?(message: string, data?: Record<string, unknown>): void;
  warn?(message: string, data?: Record<string, unknown>): void;
  error?(message: string, data?: Record<string, unknown>): void;
}

/**
 * Minimal CRUD service interface compatible with hazo_connect CrudService.
 *
 * This interface is a structural subset of hazo_connect's CrudService,
 * allowing you to pass a hazo_connect CrudService directly without any adapter.
 *
 * @example Using with hazo_connect
 * ```typescript
 * import { createHazoConnect, createCrudService } from 'hazo_connect/server';
 * import {
 *   createFileMetadataService,
 *   HAZO_FILES_TABLE_SCHEMA
 * } from 'hazo_files';
 * import type { FileMetadataRecord } from 'hazo_files';
 *
 * // 1. Create database table during app setup
 * await db.run(HAZO_FILES_TABLE_SCHEMA.sqlite.ddl);
 * for (const idx of HAZO_FILES_TABLE_SCHEMA.sqlite.indexes) {
 *   await db.run(idx);
 * }
 *
 * // 2. Create hazo_connect CRUD service
 * const adapter = createHazoConnect({
 *   type: 'sqlite',
 *   database_path: './data.db'
 * });
 * const crud = createCrudService<FileMetadataRecord>(
 *   adapter,
 *   HAZO_FILES_TABLE_SCHEMA.tableName
 * );
 *
 * // 3. Pass directly to hazo_files - NO ADAPTER NEEDED
 * const metadataService = createFileMetadataService(crud);
 *
 * // 4. Use the service
 * await metadataService.addExtraction(
 *   '/documents/report.pdf',
 *   'local',
 *   { summary: 'Quarterly report' },
 *   { source: 'gpt-4' }
 * );
 * ```
 *
 * @remarks
 * The hazo_connect CrudService has additional methods (findById, query)
 * that are not used by FileMetadataService, making this interface
 * a compatible subset.
 */
export interface CrudServiceLike<T> {
  list(configure?: (qb: unknown) => unknown): Promise<T[]>;
  findBy(criteria: Record<string, unknown>): Promise<T[]>;
  findOneBy(criteria: Record<string, unknown>): Promise<T | null>;
  insert(data: Partial<T> | Partial<T>[]): Promise<T[]>;
  updateById(id: unknown, patch: Partial<T>): Promise<T[]>;
  deleteById(id: unknown): Promise<void>;
}

/**
 * Options for FileMetadataService
 */
export interface FileMetadataServiceOptions {
  /** Table name (default: 'hazo_files') */
  tableName?: string;
  /** Logger for diagnostics */
  logger?: MetadataLogger;
  /** Log errors to console (default: true) */
  logErrors?: boolean;
}

/**
 * File Metadata Service
 * Provides methods to track file operations in a database
 */
export class FileMetadataService {
  private crud: CrudServiceLike<FileMetadataRecord>;
  private logger?: MetadataLogger;
  private logErrors: boolean;

  constructor(
    crudService: CrudServiceLike<FileMetadataRecord>,
    options: FileMetadataServiceOptions = {}
  ) {
    this.crud = crudService;
    this.logger = options.logger;
    this.logErrors = options.logErrors !== false;
  }

  /**
   * Generate ISO timestamp
   */
  private now(): string {
    return new Date().toISOString();
  }

  /**
   * Log an error if logging is enabled
   */
  private logError(operation: string, error: unknown): void {
    if (this.logErrors) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger?.error?.(`FileMetadataService.${operation} failed`, { error: message });
      if (!this.logger) {
        console.error(`[FileMetadataService] ${operation} failed:`, message);
      }
    }
  }

  /**
   * Record a file upload
   */
  async recordUpload(
    input: FileMetadataInput
  ): Promise<FileMetadataRecord | null> {
    try {
      const timestamp = this.now();
      const record: Record<string, unknown> = {
        filename: input.filename,
        file_type: input.file_type,
        file_data: JSON.stringify(input.file_data || {}),
        file_path: input.file_path,
        storage_type: input.storage_type,
        created_at: timestamp,
        changed_at: timestamp,
        file_hash: input.file_hash || null,
        file_size: input.file_size ?? null,
        file_changed_at: input.file_hash ? timestamp : null,
        // V2 defaults — included conditionally to avoid breaking pre-migration DBs
        file_refs: '[]',
        ref_count: 0,
        status: 'active',
      };

      // Optional V2 fields
      if (input.scope_id !== undefined) record.scope_id = input.scope_id;
      if (input.uploaded_by !== undefined) record.uploaded_by = input.uploaded_by;
      if (input.original_filename !== undefined) record.original_filename = input.original_filename;

      const results = await this.crud.insert(record as Partial<FileMetadataRecord>);
      this.logger?.debug?.('Recorded file upload', { path: input.file_path });
      return results[0] || null;
    } catch (error) {
      this.logError('recordUpload', error);
      return null;
    }
  }

  /**
   * Record a directory creation
   */
  async recordDirectoryCreation(
    path: string,
    storageType: StorageProvider,
    metadata?: Record<string, unknown>
  ): Promise<FileMetadataRecord | null> {
    return this.recordUpload({
      filename: getBaseName(path),
      file_type: 'folder',
      file_data: metadata,
      file_path: path,
      storage_type: storageType,
    });
  }

  /**
   * Record a file access (download)
   */
  async recordAccess(
    path: string,
    storageType: StorageProvider
  ): Promise<boolean> {
    try {
      const existing = await this.findByPath(path, storageType);
      if (existing) {
        await this.crud.updateById(existing.id, {
          changed_at: this.now(),
        });
        this.logger?.debug?.('Recorded file access', { path });
        return true;
      }
      return false;
    } catch (error) {
      this.logError('recordAccess', error);
      return false;
    }
  }

  /**
   * Record a file deletion
   */
  async recordDelete(
    path: string,
    storageType: StorageProvider
  ): Promise<boolean> {
    try {
      const existing = await this.findByPath(path, storageType);
      if (existing) {
        await this.crud.deleteById(existing.id);
        this.logger?.debug?.('Recorded file deletion', { path });
        return true;
      }
      return false;
    } catch (error) {
      this.logError('recordDelete', error);
      return false;
    }
  }

  /**
   * Record a directory deletion (recursive)
   */
  async recordDirectoryDelete(
    path: string,
    storageType: StorageProvider,
    recursive: boolean
  ): Promise<boolean> {
    try {
      if (recursive) {
        // Delete all records with paths starting with this directory
        const records = await this.crud.findBy({ storage_type: storageType });
        const toDelete = records.filter(
          (r) => r.file_path === path || r.file_path.startsWith(path + '/')
        );
        for (const record of toDelete) {
          await this.crud.deleteById(record.id);
        }
        this.logger?.debug?.('Recorded recursive directory deletion', {
          path,
          count: toDelete.length,
        });
        return true;
      } else {
        return this.recordDelete(path, storageType);
      }
    } catch (error) {
      this.logError('recordDirectoryDelete', error);
      return false;
    }
  }

  /**
   * Record a file or folder move
   */
  async recordMove(
    sourcePath: string,
    destinationPath: string,
    storageType: StorageProvider
  ): Promise<boolean> {
    try {
      const existing = await this.findByPath(sourcePath, storageType);
      if (existing) {
        await this.crud.updateById(existing.id, {
          file_path: destinationPath,
          filename: getBaseName(destinationPath),
          changed_at: this.now(),
        } as Partial<FileMetadataRecord>);
        this.logger?.debug?.('Recorded file move', { from: sourcePath, to: destinationPath });
        return true;
      }
      return false;
    } catch (error) {
      this.logError('recordMove', error);
      return false;
    }
  }

  /**
   * Record a file or folder rename
   */
  async recordRename(
    path: string,
    newName: string,
    storageType: StorageProvider
  ): Promise<boolean> {
    try {
      const existing = await this.findByPath(path, storageType);
      if (existing) {
        const parentPath = getDirName(path);
        const newPath = parentPath === '/' ? `/${newName}` : `${parentPath}/${newName}`;
        await this.crud.updateById(existing.id, {
          filename: newName,
          file_path: newPath,
          changed_at: this.now(),
        } as Partial<FileMetadataRecord>);
        this.logger?.debug?.('Recorded file rename', { path, newName });
        return true;
      }
      return false;
    } catch (error) {
      this.logError('recordRename', error);
      return false;
    }
  }

  /**
   * Find a record by path and storage type
   */
  async findByPath(
    path: string,
    storageType: StorageProvider
  ): Promise<FileMetadataRecord | null> {
    try {
      return await this.crud.findOneBy({
        file_path: path,
        storage_type: storageType,
      });
    } catch (error) {
      this.logError('findByPath', error);
      return null;
    }
  }

  /**
   * Find all records for a storage type
   */
  async findByStorageType(
    storageType: StorageProvider
  ): Promise<FileMetadataRecord[]> {
    try {
      return await this.crud.findBy({ storage_type: storageType });
    } catch (error) {
      this.logError('findByStorageType', error);
      return [];
    }
  }

  /**
   * Find all records in a directory
   */
  async findInDirectory(
    directoryPath: string,
    storageType: StorageProvider
  ): Promise<FileMetadataRecord[]> {
    try {
      const all = await this.findByStorageType(storageType);
      const prefix = directoryPath === '/' ? '/' : directoryPath + '/';
      return all.filter((r) => {
        if (directoryPath === '/') {
          // Root directory: items with exactly one path segment
          const segments = r.file_path.split('/').filter(Boolean);
          return segments.length === 1;
        }
        // Items directly in this directory (not nested deeper)
        if (!r.file_path.startsWith(prefix)) return false;
        const relativePath = r.file_path.slice(prefix.length);
        return !relativePath.includes('/');
      });
    } catch (error) {
      this.logError('findInDirectory', error);
      return [];
    }
  }

  /**
   * Update custom metadata for a file
   */
  async updateMetadata(
    path: string,
    storageType: StorageProvider,
    metadata: Record<string, unknown>
  ): Promise<boolean> {
    try {
      const existing = await this.findByPath(path, storageType);
      if (existing) {
        const currentData = JSON.parse(existing.file_data || '{}');
        const newData = { ...currentData, ...metadata };
        await this.crud.updateById(existing.id, {
          file_data: JSON.stringify(newData),
          changed_at: this.now(),
        } as Partial<FileMetadataRecord>);
        this.logger?.debug?.('Updated file metadata', { path });
        return true;
      }
      return false;
    } catch (error) {
      this.logError('updateMetadata', error);
      return false;
    }
  }

  // ============================================
  // Extraction Data Management Methods
  // ============================================

  /**
   * Get parsed file_data structure for a file
   * Automatically migrates old format to new extraction structure
   */
  async getFileData(
    path: string,
    storageType: StorageProvider
  ): Promise<FileDataStructure | null> {
    try {
      const existing = await this.findByPath(path, storageType);
      if (!existing) {
        return null;
      }
      return parseFileData(existing.file_data);
    } catch (error) {
      this.logError('getFileData', error);
      return null;
    }
  }

  /**
   * Get merged extraction data for a file
   */
  async getMergedData(
    path: string,
    storageType: StorageProvider
  ): Promise<Record<string, unknown> | null> {
    try {
      const fileData = await this.getFileData(path, storageType);
      if (!fileData) {
        return null;
      }
      return getMergedDataUtil(fileData);
    } catch (error) {
      this.logError('getMergedData', error);
      return null;
    }
  }

  /**
   * Add an extraction to a file's data
   */
  async addExtraction(
    path: string,
    storageType: StorageProvider,
    data: Record<string, unknown>,
    options?: AddExtractionOptions
  ): Promise<ExtractionData | null> {
    try {
      const existing = await this.findByPath(path, storageType);
      if (!existing) {
        this.logger?.warn?.('Cannot add extraction: file not found', { path });
        return null;
      }

      const currentFileData = parseFileData(existing.file_data);
      const result = addExtractionToFileData(currentFileData, data, options);

      if (!result.success || !result.data) {
        this.logError('addExtraction', result.error);
        return null;
      }

      await this.crud.updateById(existing.id, {
        file_data: stringifyFileData(result.data),
        changed_at: this.now(),
      } as Partial<FileMetadataRecord>);

      // Return the newly added extraction
      const newExtraction = result.data.raw_data[result.data.raw_data.length - 1];
      this.logger?.debug?.('Added extraction', { path, extractionId: newExtraction.id });
      return newExtraction;
    } catch (error) {
      this.logError('addExtraction', error);
      return null;
    }
  }

  /**
   * Remove an extraction by ID
   */
  async removeExtractionById(
    path: string,
    storageType: StorageProvider,
    id: string,
    options?: RemoveExtractionOptions
  ): Promise<boolean> {
    try {
      const existing = await this.findByPath(path, storageType);
      if (!existing) {
        return false;
      }

      const currentFileData = parseFileData(existing.file_data);
      const result = removeExtractionByIdUtil(currentFileData, id, options);

      if (!result.success || !result.data) {
        this.logError('removeExtractionById', result.error);
        return false;
      }

      await this.crud.updateById(existing.id, {
        file_data: stringifyFileData(result.data),
        changed_at: this.now(),
      } as Partial<FileMetadataRecord>);

      this.logger?.debug?.('Removed extraction by ID', { path, extractionId: id });
      return true;
    } catch (error) {
      this.logError('removeExtractionById', error);
      return false;
    }
  }

  /**
   * Remove an extraction by index
   */
  async removeExtractionByIndex(
    path: string,
    storageType: StorageProvider,
    index: number,
    options?: RemoveExtractionOptions
  ): Promise<boolean> {
    try {
      const existing = await this.findByPath(path, storageType);
      if (!existing) {
        return false;
      }

      const currentFileData = parseFileData(existing.file_data);
      const result = removeExtractionByIndexUtil(currentFileData, index, options);

      if (!result.success || !result.data) {
        this.logError('removeExtractionByIndex', result.error);
        return false;
      }

      await this.crud.updateById(existing.id, {
        file_data: stringifyFileData(result.data),
        changed_at: this.now(),
      } as Partial<FileMetadataRecord>);

      this.logger?.debug?.('Removed extraction by index', { path, index });
      return true;
    } catch (error) {
      this.logError('removeExtractionByIndex', error);
      return false;
    }
  }

  /**
   * Get all extractions for a file
   */
  async getExtractions(
    path: string,
    storageType: StorageProvider
  ): Promise<ExtractionData[] | null> {
    try {
      const fileData = await this.getFileData(path, storageType);
      if (!fileData) {
        return null;
      }
      return getExtractionsUtil(fileData);
    } catch (error) {
      this.logError('getExtractions', error);
      return null;
    }
  }

  /**
   * Get a specific extraction by ID
   */
  async getExtractionById(
    path: string,
    storageType: StorageProvider,
    id: string
  ): Promise<ExtractionData | null> {
    try {
      const fileData = await this.getFileData(path, storageType);
      if (!fileData) {
        return null;
      }
      return getExtractionByIdUtil(fileData, id);
    } catch (error) {
      this.logError('getExtractionById', error);
      return null;
    }
  }

  /**
   * Clear all extractions for a file
   */
  async clearExtractions(
    path: string,
    storageType: StorageProvider
  ): Promise<boolean> {
    try {
      const existing = await this.findByPath(path, storageType);
      if (!existing) {
        return false;
      }

      await this.crud.updateById(existing.id, {
        file_data: stringifyFileData(createEmptyFileDataStructure()),
        changed_at: this.now(),
      } as Partial<FileMetadataRecord>);

      this.logger?.debug?.('Cleared all extractions', { path });
      return true;
    } catch (error) {
      this.logError('clearExtractions', error);
      return false;
    }
  }

  // ============================================
  // Reference Tracking Methods (V2)
  // ============================================

  /**
   * Find a record by ID
   */
  async findById(id: string): Promise<FileMetadataRecord | null> {
    try {
      const results = await this.crud.findBy({ id });
      return results[0] || null;
    } catch (error) {
      this.logError('findById', error);
      return null;
    }
  }

  /**
   * Find multiple records by IDs
   */
  async findByIds(ids: string[]): Promise<FileMetadataRecord[]> {
    try {
      const results: FileMetadataRecord[] = [];
      for (const id of ids) {
        const record = await this.findById(id);
        if (record) results.push(record);
      }
      return results;
    } catch (error) {
      this.logError('findByIds', error);
      return [];
    }
  }

  /**
   * Add a reference to a file
   * @returns The new ref_id, or null on failure
   */
  async addRef(
    fileId: string,
    options: AddRefOptions
  ): Promise<{ ref_id: string } | null> {
    try {
      const record = await this.findById(fileId);
      if (!record) {
        this.logger?.warn?.('Cannot add ref: file not found', { fileId });
        return null;
      }

      const v2 = toV2Record(record);
      const refs = parseFileRefs(v2.file_refs);
      const newRef = createFileRef(options);
      const updatedRefs = [...refs, newRef];

      await this.crud.updateById(fileId, {
        file_refs: stringifyFileRefs(updatedRefs),
        ref_count: updatedRefs.length,
        status: 'active',
        changed_at: this.now(),
      } as Partial<FileMetadataRecord>);

      this.logger?.debug?.('Added ref', { fileId, ref_id: newRef.ref_id });
      return { ref_id: newRef.ref_id };
    } catch (error) {
      this.logError('addRef', error);
      return null;
    }
  }

  /**
   * Remove a specific reference from a file
   * @returns Remaining ref count, or null on failure
   */
  async removeRef(
    fileId: string,
    refId: string
  ): Promise<{ remaining_refs: number } | null> {
    try {
      const record = await this.findById(fileId);
      if (!record) {
        this.logger?.warn?.('Cannot remove ref: file not found', { fileId });
        return null;
      }

      const v2 = toV2Record(record);
      const refs = parseFileRefs(v2.file_refs);
      const updatedRefs = removeRefFromArray(refs, refId);

      await this.crud.updateById(fileId, {
        file_refs: stringifyFileRefs(updatedRefs),
        ref_count: updatedRefs.length,
        changed_at: this.now(),
      } as Partial<FileMetadataRecord>);

      this.logger?.debug?.('Removed ref', { fileId, refId, remaining: updatedRefs.length });
      return { remaining_refs: updatedRefs.length };
    } catch (error) {
      this.logError('removeRef', error);
      return null;
    }
  }

  /**
   * Remove references matching criteria across all records.
   * Scans all records and removes matching refs (AND semantics).
   */
  async removeRefsByCriteria(
    criteria: RemoveRefsCriteria
  ): Promise<{ removed_count: number }> {
    try {
      let totalRemoved = 0;

      // If file_id specified, only scan that record
      if (criteria.file_id) {
        const record = await this.findById(criteria.file_id);
        if (record) {
          const removed = await this.removeRefsFromRecord(record, criteria);
          totalRemoved += removed;
        }
        return { removed_count: totalRemoved };
      }

      // Otherwise scan all records (optionally filtered by scope)
      let records: FileMetadataRecord[];
      if (criteria.scope_id) {
        records = await this.crud.findBy({ scope_id: criteria.scope_id });
      } else {
        records = await this.crud.list();
      }

      for (const record of records) {
        const removed = await this.removeRefsFromRecord(record, criteria);
        totalRemoved += removed;
      }

      this.logger?.debug?.('Removed refs by criteria', { criteria, removed_count: totalRemoved });
      return { removed_count: totalRemoved };
    } catch (error) {
      this.logError('removeRefsByCriteria', error);
      return { removed_count: 0 };
    }
  }

  /**
   * Helper: remove matching refs from a single record
   */
  private async removeRefsFromRecord(
    record: FileMetadataRecord,
    criteria: RemoveRefsCriteria
  ): Promise<number> {
    const v2 = toV2Record(record);
    const refs = parseFileRefs(v2.file_refs);
    if (refs.length === 0) return 0;

    const updatedRefs = removeRefsByCriteriaFromArray(refs, {
      entity_type: criteria.entity_type,
      entity_id: criteria.entity_id,
    });

    const removedCount = refs.length - updatedRefs.length;
    if (removedCount > 0) {
      await this.crud.updateById(record.id, {
        file_refs: stringifyFileRefs(updatedRefs),
        ref_count: updatedRefs.length,
        changed_at: this.now(),
      } as Partial<FileMetadataRecord>);
    }

    return removedCount;
  }

  /**
   * Get all references for a file
   */
  async getRefs(fileId: string): Promise<FileRef[] | null> {
    try {
      const record = await this.findById(fileId);
      if (!record) return null;
      return parseFileRefs(toV2Record(record).file_refs);
    } catch (error) {
      this.logError('getRefs', error);
      return null;
    }
  }

  /**
   * Get a file with its status and parsed refs
   */
  async getFileWithStatus(fileId: string): Promise<FileWithStatus | null> {
    try {
      const record = await this.findById(fileId);
      if (!record) return null;
      return buildFileWithStatus(record);
    } catch (error) {
      this.logError('getFileWithStatus', error);
      return null;
    }
  }

  /**
   * Get multiple files with status
   */
  async getFilesWithStatus(fileIds: string[]): Promise<FileWithStatus[]> {
    try {
      const records = await this.findByIds(fileIds);
      return records.map(buildFileWithStatus);
    } catch (error) {
      this.logError('getFilesWithStatus', error);
      return [];
    }
  }

  /**
   * Update the status of a file
   */
  async updateStatus(fileId: string, status: FileStatus): Promise<boolean> {
    try {
      const patch: Record<string, unknown> = {
        status,
        changed_at: this.now(),
      };
      if (status === 'soft_deleted') {
        patch.deleted_at = this.now();
      }
      await this.crud.updateById(fileId, patch as Partial<FileMetadataRecord>);
      this.logger?.debug?.('Updated status', { fileId, status });
      return true;
    } catch (error) {
      this.logError('updateStatus', error);
      return false;
    }
  }

  /**
   * Soft-delete a file (set status to soft_deleted, record deleted_at)
   */
  async softDelete(fileId: string): Promise<boolean> {
    return this.updateStatus(fileId, 'soft_deleted');
  }

  /**
   * Update specific V2 fields on a record
   */
  async updateFields(
    fileId: string,
    fields: Partial<Pick<FileMetadataRecordV2, 'scope_id' | 'uploaded_by' | 'original_filename' | 'storage_verified_at' | 'status'>>
  ): Promise<boolean> {
    try {
      await this.crud.updateById(fileId, {
        ...fields,
        changed_at: this.now(),
      } as Partial<FileMetadataRecord>);
      this.logger?.debug?.('Updated fields', { fileId, fields: Object.keys(fields) });
      return true;
    } catch (error) {
      this.logError('updateFields', error);
      return false;
    }
  }

  /**
   * Find orphaned files (zero references)
   */
  async findOrphaned(options?: FindOrphanedOptions): Promise<FileWithStatus[]> {
    try {
      let records: FileMetadataRecord[];

      if (options?.scope_id) {
        records = await this.crud.findBy({ scope_id: options.scope_id });
      } else if (options?.storage_type) {
        records = await this.crud.findBy({ storage_type: options.storage_type });
      } else {
        records = await this.crud.list();
      }

      let orphaned = records
        .map(buildFileWithStatus)
        .filter((f) => f.is_orphaned && f.record.status !== 'soft_deleted');

      // Filter by age if specified
      if (options?.olderThanMs) {
        const cutoff = Date.now() - options.olderThanMs;
        orphaned = orphaned.filter((f) => {
          const createdAt = new Date(f.record.created_at).getTime();
          return createdAt < cutoff;
        });
      }

      // Apply limit
      if (options?.limit && orphaned.length > options.limit) {
        orphaned = orphaned.slice(0, options.limit);
      }

      return orphaned;
    } catch (error) {
      this.logError('findOrphaned', error);
      return [];
    }
  }
}

/**
 * Create a FileMetadataService instance
 */
export function createFileMetadataService(
  crudService: CrudServiceLike<FileMetadataRecord>,
  options?: FileMetadataServiceOptions
): FileMetadataService {
  return new FileMetadataService(crudService, options);
}
