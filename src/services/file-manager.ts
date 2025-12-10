/**
 * File Manager Service
 * Main service that provides a unified API for file operations
 * Delegates to the appropriate storage module based on configuration
 */

import { loadConfig, loadConfigAsync } from '../config';
import { createAndInitializeModule, createModule } from '../modules';
import type {
  StorageModule,
  StorageProvider,
  HazoFilesConfig,
  FileItem,
  FolderItem,
  FileSystemItem,
  OperationResult,
  UploadOptions,
  DownloadOptions,
  MoveOptions,
  RenameOptions,
  ListOptions,
  TreeNode,
} from '../types';

export interface FileManagerOptions {
  /** Path to configuration file */
  configPath?: string;
  /** Configuration object (takes precedence over configPath) */
  config?: HazoFilesConfig;
  /** Auto-initialize on creation */
  autoInit?: boolean;
}

/**
 * FileManager - Main service class for file operations
 */
export class FileManager {
  private module: StorageModule | null = null;
  private config: HazoFilesConfig | null = null;
  private initialized = false;
  private options: FileManagerOptions;

  constructor(options: FileManagerOptions = {}) {
    this.options = {
      autoInit: true,
      ...options,
    };
  }

  /**
   * Initialize the file manager with configuration
   */
  async initialize(config?: HazoFilesConfig): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Determine configuration source
    if (config) {
      this.config = config;
    } else if (this.options.config) {
      this.config = this.options.config;
    } else {
      this.config = await loadConfigAsync(this.options.configPath);
    }

    // Create and initialize the storage module
    this.module = await createAndInitializeModule(this.config);
    this.initialized = true;
  }

  /**
   * Initialize synchronously (uses sync config loading)
   */
  initializeSync(config?: HazoFilesConfig): void {
    if (this.initialized) {
      return;
    }

    if (config) {
      this.config = config;
    } else if (this.options.config) {
      this.config = this.options.config;
    } else {
      this.config = loadConfig(this.options.configPath);
    }

    this.module = createModule(this.config.provider);
    // Note: Module needs async initialization, caller should call initialize() after
  }

  /**
   * Check if manager is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get the current configuration
   */
  getConfig(): HazoFilesConfig | null {
    return this.config;
  }

  /**
   * Get the current provider
   */
  getProvider(): StorageProvider | null {
    return this.config?.provider ?? null;
  }

  /**
   * Get the underlying storage module
   */
  getModule(): StorageModule {
    this.ensureInitialized();
    return this.module!;
  }

  /**
   * Ensure manager is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized || !this.module) {
      throw new Error('FileManager not initialized. Call initialize() first.');
    }
  }

  // ============ Directory Operations ============

  /**
   * Create a directory at the specified path
   */
  async createDirectory(path: string): Promise<OperationResult<FolderItem>> {
    this.ensureInitialized();
    return this.module!.createDirectory(path);
  }

  /**
   * Remove a directory
   * @param path - Directory path
   * @param recursive - If true, remove directory and all contents
   */
  async removeDirectory(path: string, recursive = false): Promise<OperationResult> {
    this.ensureInitialized();
    return this.module!.removeDirectory(path, recursive);
  }

  // ============ File Operations ============

  /**
   * Upload/save a file
   * @param source - File path, Buffer, or ReadableStream
   * @param remotePath - Destination path in storage
   * @param options - Upload options
   */
  async uploadFile(
    source: string | Buffer | ReadableStream,
    remotePath: string,
    options?: UploadOptions
  ): Promise<OperationResult<FileItem>> {
    this.ensureInitialized();
    return this.module!.uploadFile(source, remotePath, options);
  }

  /**
   * Download a file
   * @param remotePath - Path in storage
   * @param localPath - Optional local destination path
   * @param options - Download options
   */
  async downloadFile(
    remotePath: string,
    localPath?: string,
    options?: DownloadOptions
  ): Promise<OperationResult<Buffer | string>> {
    this.ensureInitialized();
    return this.module!.downloadFile(remotePath, localPath, options);
  }

  /**
   * Move a file or folder
   * @param sourcePath - Current path
   * @param destinationPath - New path
   * @param options - Move options
   */
  async moveItem(
    sourcePath: string,
    destinationPath: string,
    options?: MoveOptions
  ): Promise<OperationResult<FileSystemItem>> {
    this.ensureInitialized();
    return this.module!.moveItem(sourcePath, destinationPath, options);
  }

  /**
   * Delete a file
   */
  async deleteFile(path: string): Promise<OperationResult> {
    this.ensureInitialized();
    return this.module!.deleteFile(path);
  }

  /**
   * Rename a file
   * @param path - Current file path
   * @param newName - New filename (not full path)
   * @param options - Rename options
   */
  async renameFile(
    path: string,
    newName: string,
    options?: RenameOptions
  ): Promise<OperationResult<FileItem>> {
    this.ensureInitialized();
    return this.module!.renameFile(path, newName, options);
  }

  /**
   * Rename a folder
   * @param path - Current folder path
   * @param newName - New folder name (not full path)
   * @param options - Rename options
   */
  async renameFolder(
    path: string,
    newName: string,
    options?: RenameOptions
  ): Promise<OperationResult<FolderItem>> {
    this.ensureInitialized();
    return this.module!.renameFolder(path, newName, options);
  }

  // ============ Query Operations ============

  /**
   * List contents of a directory
   * @param path - Directory path
   * @param options - List options
   */
  async listDirectory(
    path: string,
    options?: ListOptions
  ): Promise<OperationResult<FileSystemItem[]>> {
    this.ensureInitialized();
    return this.module!.listDirectory(path, options);
  }

  /**
   * Get information about a file or folder
   */
  async getItem(path: string): Promise<OperationResult<FileSystemItem>> {
    this.ensureInitialized();
    return this.module!.getItem(path);
  }

  /**
   * Check if a file or folder exists
   */
  async exists(path: string): Promise<boolean> {
    this.ensureInitialized();
    return this.module!.exists(path);
  }

  /**
   * Get folder tree structure
   * @param path - Starting path (default: root)
   * @param depth - Maximum depth to traverse
   */
  async getFolderTree(path = '/', depth = 3): Promise<OperationResult<TreeNode[]>> {
    this.ensureInitialized();
    return this.module!.getFolderTree(path, depth);
  }

  // ============ Convenience Methods ============

  /**
   * Create a file with string content
   */
  async writeFile(path: string, content: string, options?: UploadOptions): Promise<OperationResult<FileItem>> {
    const buffer = Buffer.from(content, 'utf-8');
    return this.uploadFile(buffer, path, options);
  }

  /**
   * Read a file as string
   */
  async readFile(path: string): Promise<OperationResult<string>> {
    const result = await this.downloadFile(path);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    if (Buffer.isBuffer(result.data)) {
      return { success: true, data: result.data.toString('utf-8') };
    }

    // If it's a path, read the file
    const fs = await import('fs');
    const content = await fs.promises.readFile(result.data as string, 'utf-8');
    return { success: true, data: content };
  }

  /**
   * Copy a file to a new location
   */
  async copyFile(
    sourcePath: string,
    destinationPath: string,
    options?: UploadOptions
  ): Promise<OperationResult<FileItem>> {
    const downloadResult = await this.downloadFile(sourcePath);
    if (!downloadResult.success) {
      return { success: false, error: downloadResult.error };
    }

    const buffer = Buffer.isBuffer(downloadResult.data)
      ? downloadResult.data
      : await import('fs').then(fs => fs.promises.readFile(downloadResult.data as string));

    return this.uploadFile(buffer, destinationPath, options);
  }

  /**
   * Ensure a directory exists (creates if needed)
   */
  async ensureDirectory(path: string): Promise<OperationResult<FolderItem>> {
    const exists = await this.exists(path);
    if (exists) {
      const item = await this.getItem(path);
      if (item.success && item.data?.isDirectory) {
        return { success: true, data: item.data as FolderItem };
      }
      return { success: false, error: 'Path exists but is not a directory' };
    }
    return this.createDirectory(path);
  }
}

/**
 * Create a new FileManager instance
 */
export function createFileManager(options?: FileManagerOptions): FileManager {
  return new FileManager(options);
}

/**
 * Create and initialize a FileManager instance
 */
export async function createInitializedFileManager(
  options?: FileManagerOptions
): Promise<FileManager> {
  const manager = new FileManager(options);
  await manager.initialize();
  return manager;
}

export default FileManager;
