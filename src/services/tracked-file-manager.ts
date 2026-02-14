/**
 * Tracked File Manager
 * Extends FileManager to add database tracking of file operations
 */

import { FileManager, FileManagerOptions } from './file-manager';
import { FileMetadataService, CrudServiceLike } from './file-metadata-service';
import type {
  FileItem,
  FolderItem,
  FileSystemItem,
  OperationResult,
  UploadOptions,
  DownloadOptions,
  MoveOptions,
  RenameOptions,
  FileMetadataRecord,
  DatabaseTrackingConfig,
  AddRefOptions,
  FileWithStatus,
  FindOrphanedOptions,
  CleanupOrphanedOptions,
  UploadWithRefOptions,
} from '../types';
import { getMimeType } from '../common/mime-types';
import { computeFileInfo, hasFileContentChanged } from '../common/hash-utils';

/**
 * Options for creating a TrackedFileManager
 */
export interface TrackedFileManagerFullOptions extends FileManagerOptions {
  /** CRUD service for database operations (from hazo_connect) */
  crudService?: CrudServiceLike<FileMetadataRecord>;
  /** Database tracking configuration */
  tracking?: DatabaseTrackingConfig;
}

/**
 * Extended upload options with hash tracking
 */
export interface TrackedUploadOptions extends UploadOptions {
  /** Skip hash computation (useful for large files or when not needed) */
  skipHash?: boolean;
  /**
   * If true, awaits the database recording before returning.
   * By default, recording is fire-and-forget for performance.
   * Set to true when you need to immediately query/update the file record.
   */
  awaitRecording?: boolean;
}

/**
 * TrackedFileManager - File manager with database tracking
 *
 * Extends FileManager to record file operations in a database table.
 * Database operations are non-blocking and failures don't affect file operations.
 */
export class TrackedFileManager extends FileManager {
  private metadataService: FileMetadataService | null = null;
  private trackingConfig: DatabaseTrackingConfig;

  constructor(options: TrackedFileManagerFullOptions = {}) {
    super(options);

    this.trackingConfig = {
      enabled: options.tracking?.enabled ?? false,
      tableName: options.tracking?.tableName ?? 'hazo_files',
      trackDownloads: options.tracking?.trackDownloads ?? true,
      logErrors: options.tracking?.logErrors ?? true,
    };

    if (options.crudService && this.trackingConfig.enabled) {
      this.metadataService = new FileMetadataService(options.crudService, {
        tableName: this.trackingConfig.tableName,
        logErrors: this.trackingConfig.logErrors,
      });
    }
  }

  /**
   * Check if tracking is enabled and service is available
   */
  private isTrackingEnabled(): boolean {
    return this.trackingConfig.enabled && this.metadataService !== null;
  }

  /**
   * Get the current storage provider type
   */
  private getStorageType(): 'local' | 'google_drive' {
    return this.getProvider() || 'local';
  }

  // ============ Tracked Directory Operations ============

  /**
   * Create a directory and record it in the database
   */
  async createDirectory(path: string): Promise<OperationResult<FolderItem>> {
    const result = await super.createDirectory(path);

    if (result.success && this.isTrackingEnabled()) {
      // Record in background, don't await
      this.metadataService!.recordDirectoryCreation(
        path,
        this.getStorageType(),
        result.data?.metadata
      ).catch(() => {}); // Errors are logged internally
    }

    return result;
  }

  /**
   * Remove a directory and delete its record from the database
   */
  async removeDirectory(path: string, recursive = false): Promise<OperationResult> {
    const result = await super.removeDirectory(path, recursive);

    if (result.success && this.isTrackingEnabled()) {
      this.metadataService!.recordDirectoryDelete(
        path,
        this.getStorageType(),
        recursive
      ).catch(() => {});
    }

    return result;
  }

  // ============ Tracked File Operations ============

  /**
   * Upload a file and record it in the database
   * Computes file hash for change detection unless skipHash is true
   */
  async uploadFile(
    source: string | Buffer | ReadableStream,
    remotePath: string,
    options?: TrackedUploadOptions
  ): Promise<OperationResult<FileItem>> {
    // Get buffer for hash computation if source is a Buffer
    let fileBuffer: Buffer | null = null;
    if (source instanceof Buffer) {
      fileBuffer = source;
    }

    const result = await super.uploadFile(source, remotePath, options);

    if (result.success && this.isTrackingEnabled() && result.data) {
      const fileItem = result.data;
      const skipHash = options?.skipHash ?? false;
      const awaitRecording = options?.awaitRecording ?? false;

      // Compute hash and size if we have a buffer and hashing is not skipped
      let fileHash: string | undefined;
      let fileSize: number | undefined;

      if (fileBuffer && !skipHash) {
        try {
          const fileInfo = await computeFileInfo(fileBuffer);
          fileHash = fileInfo.file_hash;
          fileSize = fileInfo.file_size;
        } catch {
          // Hash computation failed, continue without hash
        }
      } else if (fileBuffer) {
        // Still record size even if hash is skipped
        fileSize = fileBuffer.length;
      }

      const recordPromise = this.metadataService!.recordUpload({
        filename: fileItem.name,
        file_type: fileItem.mimeType || getMimeType(fileItem.name),
        file_data: options?.metadata || fileItem.metadata,
        file_path: remotePath,
        storage_type: this.getStorageType(),
        file_hash: fileHash,
        file_size: fileSize,
      });

      if (awaitRecording) {
        // Wait for recording to complete - useful when immediate record access is needed
        await recordPromise;
      } else {
        // Fire and forget - default behavior for performance
        recordPromise.catch(() => {});
      }
    }

    return result;
  }

  /**
   * Download a file and optionally track access
   */
  async downloadFile(
    remotePath: string,
    localPath?: string,
    options?: DownloadOptions
  ): Promise<OperationResult<Buffer | string>> {
    const result = await super.downloadFile(remotePath, localPath, options);

    if (result.success && this.isTrackingEnabled() && this.trackingConfig.trackDownloads) {
      this.metadataService!.recordAccess(
        remotePath,
        this.getStorageType()
      ).catch(() => {});
    }

    return result;
  }

  /**
   * Move a file or folder and update its path in the database
   */
  async moveItem(
    sourcePath: string,
    destinationPath: string,
    options?: MoveOptions
  ): Promise<OperationResult<FileSystemItem>> {
    const result = await super.moveItem(sourcePath, destinationPath, options);

    if (result.success && this.isTrackingEnabled()) {
      this.metadataService!.recordMove(
        sourcePath,
        destinationPath,
        this.getStorageType()
      ).catch(() => {});
    }

    return result;
  }

  /**
   * Delete a file and remove its record from the database
   */
  async deleteFile(path: string): Promise<OperationResult> {
    const result = await super.deleteFile(path);

    if (result.success && this.isTrackingEnabled()) {
      this.metadataService!.recordDelete(
        path,
        this.getStorageType()
      ).catch(() => {});
    }

    return result;
  }

  /**
   * Rename a file and update its record in the database
   */
  async renameFile(
    path: string,
    newName: string,
    options?: RenameOptions
  ): Promise<OperationResult<FileItem>> {
    const result = await super.renameFile(path, newName, options);

    if (result.success && this.isTrackingEnabled()) {
      this.metadataService!.recordRename(
        path,
        newName,
        this.getStorageType()
      ).catch(() => {});
    }

    return result;
  }

  /**
   * Rename a folder and update its record in the database
   */
  async renameFolder(
    path: string,
    newName: string,
    options?: RenameOptions
  ): Promise<OperationResult<FolderItem>> {
    const result = await super.renameFolder(path, newName, options);

    if (result.success && this.isTrackingEnabled()) {
      this.metadataService!.recordRename(
        path,
        newName,
        this.getStorageType()
      ).catch(() => {});
    }

    return result;
  }

  // ============ Tracked Convenience Methods ============

  /**
   * Write a file with string content and track it
   */
  async writeFile(
    path: string,
    content: string,
    options?: UploadOptions
  ): Promise<OperationResult<FileItem>> {
    // Use uploadFile which already handles tracking
    const buffer = Buffer.from(content, 'utf-8');
    return this.uploadFile(buffer, path, options);
  }

  /**
   * Read a file and optionally track access
   */
  async readFile(path: string): Promise<OperationResult<string>> {
    // downloadFile already handles tracking
    return super.readFile(path);
  }

  /**
   * Copy a file and track the new file
   */
  async copyFile(
    sourcePath: string,
    destinationPath: string,
    options?: UploadOptions
  ): Promise<OperationResult<FileItem>> {
    // Use the parent implementation which uses uploadFile, which handles tracking
    return super.copyFile(sourcePath, destinationPath, options);
  }

  // ============ Metadata Service Access ============

  /**
   * Get the metadata service for direct access
   */
  getMetadataService(): FileMetadataService | null {
    return this.metadataService;
  }

  /**
   * Check if database tracking is enabled
   */
  isTrackingActive(): boolean {
    return this.isTrackingEnabled();
  }

  /**
   * Get tracking configuration
   */
  getTrackingConfig(): DatabaseTrackingConfig {
    return { ...this.trackingConfig };
  }

  // ============ Hash-based Change Detection ============

  /**
   * Check if a file's content has changed since it was last tracked
   *
   * Compares the stored hash with the current file hash.
   * Returns true if the file has changed or if no hash was previously stored.
   *
   * @param path - Virtual path to the file
   * @returns True if file has changed, false if unchanged, null if file not found
   *
   * @example
   * ```typescript
   * const hasChanged = await trackedManager.hasFileChanged('/docs/report.pdf');
   * if (hasChanged) {
   *   console.log('File has been modified since last upload');
   * }
   * ```
   */
  async hasFileChanged(path: string): Promise<boolean | null> {
    if (!this.isTrackingEnabled()) {
      return null; // Can't check without tracking
    }

    // Get stored metadata
    const record = await this.metadataService!.findByPath(path, this.getStorageType());
    if (!record) {
      return null; // File not tracked
    }

    const storedHash = record.file_hash;
    if (!storedHash) {
      return true; // No hash stored, treat as changed
    }

    // Download current file content
    const downloadResult = await super.downloadFile(path);
    if (!downloadResult.success || !downloadResult.data) {
      return null; // Can't download file
    }

    // Convert to buffer if needed
    let buffer: Buffer;
    if (typeof downloadResult.data === 'string') {
      buffer = Buffer.from(downloadResult.data, 'utf-8');
    } else if (downloadResult.data instanceof Buffer) {
      buffer = downloadResult.data;
    } else {
      return null; // Unexpected type
    }

    // Compare hashes
    return hasFileContentChanged(storedHash, buffer);
  }

  /**
   * Get the stored hash for a file
   *
   * @param path - Virtual path to the file
   * @returns Stored hash or null if not found/not tracked
   */
  async getStoredHash(path: string): Promise<string | null> {
    if (!this.isTrackingEnabled()) {
      return null;
    }

    const record = await this.metadataService!.findByPath(path, this.getStorageType());
    return record?.file_hash || null;
  }

  /**
   * Get the stored file size
   *
   * @param path - Virtual path to the file
   * @returns Stored size in bytes or null if not found/not tracked
   */
  async getStoredSize(path: string): Promise<number | null> {
    if (!this.isTrackingEnabled()) {
      return null;
    }

    const record = await this.metadataService!.findByPath(path, this.getStorageType());
    return record?.file_size ?? null;
  }

  // ============ Reference Tracking Methods (V2) ============

  /**
   * Add a reference to a file
   */
  async addRef(
    fileId: string,
    options: AddRefOptions
  ): Promise<{ ref_id: string } | null> {
    if (!this.isTrackingEnabled()) return null;
    return this.metadataService!.addRef(fileId, options);
  }

  /**
   * Remove a reference from a file
   */
  async removeRef(
    fileId: string,
    refId: string
  ): Promise<{ remaining_refs: number } | null> {
    if (!this.isTrackingEnabled()) return null;
    return this.metadataService!.removeRef(fileId, refId);
  }

  /**
   * Get a file by its database ID with status information
   */
  async getFileById(fileId: string): Promise<FileWithStatus | null> {
    if (!this.isTrackingEnabled()) return null;
    return this.metadataService!.getFileWithStatus(fileId);
  }

  /**
   * Get multiple files by their database IDs with status information
   */
  async getFilesById(fileIds: string[]): Promise<FileWithStatus[]> {
    if (!this.isTrackingEnabled()) return [];
    return this.metadataService!.getFilesWithStatus(fileIds);
  }

  /**
   * Soft-delete a file (marks as soft_deleted, does not remove physical file)
   */
  async softDeleteFile(fileId: string): Promise<boolean> {
    if (!this.isTrackingEnabled()) return false;
    return this.metadataService!.softDelete(fileId);
  }

  /**
   * Find orphaned files (files with zero references)
   */
  async findOrphanedFiles(options?: FindOrphanedOptions): Promise<FileWithStatus[]> {
    if (!this.isTrackingEnabled()) return [];
    return this.metadataService!.findOrphaned(options);
  }

  /**
   * Cleanup orphaned files — removes physical files and/or DB records
   */
  async cleanupOrphanedFiles(
    options?: CleanupOrphanedOptions
  ): Promise<{ cleaned: number; errors: string[] }> {
    if (!this.isTrackingEnabled()) return { cleaned: 0, errors: [] };

    const orphaned = await this.metadataService!.findOrphaned(options);
    let cleaned = 0;
    const errors: string[] = [];

    for (const file of orphaned) {
      try {
        if (options?.softDeleteOnly) {
          await this.metadataService!.softDelete(file.record.id);
          cleaned++;
          continue;
        }

        const deletePhysical = options?.deletePhysicalFiles !== false;
        if (deletePhysical) {
          // Delete physical file
          const deleteResult = await super.deleteFile(file.record.file_path);
          if (!deleteResult.success) {
            // Physical file might already be gone — that's okay
            if (deleteResult.error && !deleteResult.error.includes('not found')) {
              errors.push(`Failed to delete physical file ${file.record.file_path}: ${deleteResult.error}`);
            }
          }
        }

        // Delete DB record
        await this.metadataService!.recordDelete(file.record.file_path, file.record.storage_type);
        cleaned++;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(`Error cleaning up ${file.record.file_path}: ${msg}`);
      }
    }

    return { cleaned, errors };
  }

  /**
   * Verify that a file's physical storage exists and update its status
   */
  async verifyFileExistence(fileId: string): Promise<boolean | null> {
    if (!this.isTrackingEnabled()) return null;

    const record = await this.metadataService!.findById(fileId);
    if (!record) return null;

    const fileExists = await this.exists(record.file_path);
    const timestamp = new Date().toISOString();

    await this.metadataService!.updateFields(fileId, {
      storage_verified_at: timestamp,
      ...(fileExists ? {} : { status: 'missing' as const }),
    });

    return fileExists;
  }

  /**
   * Upload a file and optionally add an initial reference
   */
  async uploadFileWithRef(
    source: string | Buffer | ReadableStream,
    remotePath: string,
    options?: TrackedUploadOptions & UploadWithRefOptions
  ): Promise<OperationResult<FileItem & { file_id?: string; ref_id?: string }>> {
    // Ensure we await recording so we have the record ID
    const uploadResult = await this.uploadFile(source, remotePath, {
      ...options,
      awaitRecording: true,
    });

    if (!uploadResult.success || !uploadResult.data || !this.isTrackingEnabled()) {
      return uploadResult as OperationResult<FileItem & { file_id?: string; ref_id?: string }>;
    }

    // Find the just-created record
    const record = await this.metadataService!.findByPath(remotePath, this.getStorageType());
    if (!record) {
      return uploadResult as OperationResult<FileItem & { file_id?: string; ref_id?: string }>;
    }

    // Update V2 fields if provided
    const fieldsToUpdate: Record<string, string> = {};
    if (options?.scope_id) fieldsToUpdate.scope_id = options.scope_id;
    if (options?.uploaded_by) fieldsToUpdate.uploaded_by = options.uploaded_by;
    if (Object.keys(fieldsToUpdate).length > 0) {
      await this.metadataService!.updateFields(record.id, fieldsToUpdate);
    }

    // Add ref if specified
    let refId: string | undefined;
    if (options?.ref) {
      const refResult = await this.metadataService!.addRef(record.id, options.ref);
      if (refResult) refId = refResult.ref_id;
    }

    return {
      success: true,
      data: {
        ...uploadResult.data,
        file_id: record.id,
        ref_id: refId,
      },
    };
  }
}

/**
 * Create a new TrackedFileManager instance
 */
export function createTrackedFileManager(
  options?: TrackedFileManagerFullOptions
): TrackedFileManager {
  return new TrackedFileManager(options);
}

/**
 * Create and initialize a TrackedFileManager instance
 */
export async function createInitializedTrackedFileManager(
  options?: TrackedFileManagerFullOptions
): Promise<TrackedFileManager> {
  const manager = new TrackedFileManager(options);
  await manager.initialize();
  return manager;
}

export default TrackedFileManager;
