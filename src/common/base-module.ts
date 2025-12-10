/**
 * Base module class providing common functionality for all storage modules.
 * All storage module implementations should extend this class.
 */

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
import { ConfigurationError } from './errors';
import { successResult, errorResult } from './utils';
import { normalizePath, joinPath, getBaseName, getParentPath } from './path-utils';

/**
 * Abstract base class for storage modules.
 * Provides common functionality and enforces the StorageModule interface.
 */
export abstract class BaseStorageModule implements StorageModule {
  abstract readonly provider: StorageProvider;
  protected config: HazoFilesConfig | null = null;
  protected _initialized = false;

  /**
   * Check if the module is initialized
   */
  get isInitialized(): boolean {
    return this._initialized;
  }

  /**
   * Initialize the module with configuration.
   * Subclasses should call super.initialize(config) first.
   */
  async initialize(config: HazoFilesConfig): Promise<void> {
    this.config = config;
    this._initialized = true;
  }

  /**
   * Ensure the module is initialized before operations
   */
  protected ensureInitialized(): void {
    if (!this._initialized || !this.config) {
      throw new ConfigurationError('Module not initialized. Call initialize() first.');
    }
  }

  /**
   * Get the provider-specific configuration
   */
  protected getProviderConfig<T>(): T {
    this.ensureInitialized();
    const providerConfig = this.config![this.provider as keyof HazoFilesConfig];
    if (!providerConfig) {
      throw new ConfigurationError(`No configuration found for provider: ${this.provider}`);
    }
    return providerConfig as T;
  }

  // Abstract methods that must be implemented by subclasses
  abstract createDirectory(path: string): Promise<OperationResult<FolderItem>>;
  abstract removeDirectory(path: string, recursive?: boolean): Promise<OperationResult>;
  abstract uploadFile(
    source: string | Buffer | ReadableStream,
    remotePath: string,
    options?: UploadOptions
  ): Promise<OperationResult<FileItem>>;
  abstract downloadFile(
    remotePath: string,
    localPath?: string,
    options?: DownloadOptions
  ): Promise<OperationResult<Buffer | string>>;
  abstract moveItem(
    sourcePath: string,
    destinationPath: string,
    options?: MoveOptions
  ): Promise<OperationResult<FileSystemItem>>;
  abstract deleteFile(path: string): Promise<OperationResult>;
  abstract renameFile(
    path: string,
    newName: string,
    options?: RenameOptions
  ): Promise<OperationResult<FileItem>>;
  abstract renameFolder(
    path: string,
    newName: string,
    options?: RenameOptions
  ): Promise<OperationResult<FolderItem>>;
  abstract listDirectory(
    path: string,
    options?: ListOptions
  ): Promise<OperationResult<FileSystemItem[]>>;
  abstract getItem(path: string): Promise<OperationResult<FileSystemItem>>;
  abstract exists(path: string): Promise<boolean>;

  /**
   * Get folder tree structure.
   * Default implementation that can be overridden by subclasses for optimization.
   */
  async getFolderTree(path = '/', depth = 3): Promise<OperationResult<TreeNode[]>> {
    this.ensureInitialized();

    try {
      const result = await this.buildTree(path, depth, 0);
      return successResult(result);
    } catch (error) {
      return errorResult(`Failed to get folder tree: ${(error as Error).message}`);
    }
  }

  /**
   * Recursively build folder tree
   */
  protected async buildTree(path: string, maxDepth: number, currentDepth: number): Promise<TreeNode[]> {
    if (currentDepth >= maxDepth) {
      return [];
    }

    const listResult = await this.listDirectory(path, { recursive: false });
    if (!listResult.success || !listResult.data) {
      return [];
    }

    const folders = listResult.data.filter(item => item.isDirectory);
    const nodes: TreeNode[] = [];

    for (const folder of folders) {
      const children = await this.buildTree(folder.path, maxDepth, currentDepth + 1);
      nodes.push({
        id: folder.id,
        name: folder.name,
        path: folder.path,
        children,
      });
    }

    return nodes;
  }

  // Utility methods available to subclasses
  protected normalizePath = normalizePath;
  protected joinPath = joinPath;
  protected getBaseName = getBaseName;
  protected getParentPath = getParentPath;
  protected successResult = successResult;
  protected errorResult = errorResult;
}

/**
 * Type guard to check if a module is initialized
 */
export function isModuleInitialized(module: StorageModule): boolean {
  return (module as BaseStorageModule).isInitialized ?? false;
}
