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
} from '../types';
import { getMimeType } from '../common/mime-types';

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
   */
  async uploadFile(
    source: string | Buffer | ReadableStream,
    remotePath: string,
    options?: UploadOptions
  ): Promise<OperationResult<FileItem>> {
    const result = await super.uploadFile(source, remotePath, options);

    if (result.success && this.isTrackingEnabled() && result.data) {
      const fileItem = result.data;
      this.metadataService!.recordUpload({
        filename: fileItem.name,
        file_type: fileItem.mimeType || getMimeType(fileItem.name),
        file_data: options?.metadata || fileItem.metadata,
        file_path: remotePath,
        storage_type: this.getStorageType(),
      }).catch(() => {});
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
