/**
 * Local File System Storage Module
 * Implements file operations using Node.js fs module
 */

import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

import { BaseStorageModule } from '../../common/base-module';
import {
  FileNotFoundError,
  DirectoryNotFoundError,
  FileExistsError,
  DirectoryExistsError,
  DirectoryNotEmptyError,
  FileTooLargeError,
  InvalidExtensionError,
} from '../../common/errors';
import { getMimeType } from '../../common/mime-types';
import { getExtension } from '../../common/path-utils';
import { generateId, createFileItem, createFolderItem } from '../../common/utils';
import type {
  StorageProvider,
  HazoFilesConfig,
  LocalStorageConfig,
  FileItem,
  FolderItem,
  FileSystemItem,
  OperationResult,
  UploadOptions,
  DownloadOptions,
  MoveOptions,
  RenameOptions,
  ListOptions,
} from '../../types';

export class LocalStorageModule extends BaseStorageModule {
  readonly provider: StorageProvider = 'local';
  private basePath: string = '';
  private allowedExtensions: string[] = [];
  private maxFileSize: number = 0;

  async initialize(config: HazoFilesConfig): Promise<void> {
    await super.initialize(config);

    const localConfig = this.getProviderConfig<LocalStorageConfig>();
    this.basePath = path.resolve(localConfig.basePath);
    this.allowedExtensions = localConfig.allowedExtensions || [];
    this.maxFileSize = localConfig.maxFileSize || 0;

    // Ensure base directory exists
    await fs.promises.mkdir(this.basePath, { recursive: true });
  }

  /**
   * Resolve a virtual path to an absolute file system path
   */
  private resolveFullPath(virtualPath: string): string {
    const normalized = this.normalizePath(virtualPath);
    const relativePath = normalized.startsWith('/') ? normalized.slice(1) : normalized;
    return path.join(this.basePath, relativePath);
  }

  /**
   * Convert absolute path back to virtual path
   */
  private toVirtualPath(absolutePath: string): string {
    const relative = path.relative(this.basePath, absolutePath);
    return this.normalizePath('/' + relative.replace(/\\/g, '/'));
  }

  /**
   * Validate file extension against allowed list
   */
  private validateExtension(filename: string): void {
    if (this.allowedExtensions.length === 0) return;

    const ext = getExtension(filename).toLowerCase().slice(1); // Remove leading dot
    if (!this.allowedExtensions.includes(ext)) {
      throw new InvalidExtensionError(filename, ext, this.allowedExtensions);
    }
  }

  /**
   * Validate file size against maximum
   */
  private validateFileSize(size: number, filename: string): void {
    if (this.maxFileSize > 0 && size > this.maxFileSize) {
      throw new FileTooLargeError(filename, size, this.maxFileSize);
    }
  }

  /**
   * Create file/folder stats to FileSystemItem
   */
  private async statToItem(fullPath: string, stats: fs.Stats): Promise<FileSystemItem> {
    const virtualPath = this.toVirtualPath(fullPath);
    const name = path.basename(fullPath);
    const id = generateId();

    if (stats.isDirectory()) {
      return createFolderItem({
        id,
        name,
        path: virtualPath,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
      });
    }

    return createFileItem({
      id,
      name,
      path: virtualPath,
      size: stats.size,
      mimeType: getMimeType(name),
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
    });
  }

  async createDirectory(virtualPath: string): Promise<OperationResult<FolderItem>> {
    this.ensureInitialized();

    try {
      const fullPath = this.resolveFullPath(virtualPath);

      // Check if already exists
      try {
        const stats = await fs.promises.stat(fullPath);
        if (stats.isDirectory()) {
          throw new DirectoryExistsError(virtualPath);
        }
        throw new FileExistsError(virtualPath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
      }

      await fs.promises.mkdir(fullPath, { recursive: true });
      const stats = await fs.promises.stat(fullPath);
      const item = await this.statToItem(fullPath, stats) as FolderItem;

      return this.successResult(item);
    } catch (error) {
      if (error instanceof DirectoryExistsError || error instanceof FileExistsError) {
        return this.errorResult(error.message);
      }
      return this.errorResult(`Failed to create directory: ${(error as Error).message}`);
    }
  }

  async removeDirectory(virtualPath: string, recursive = false): Promise<OperationResult> {
    this.ensureInitialized();

    try {
      const fullPath = this.resolveFullPath(virtualPath);

      const stats = await fs.promises.stat(fullPath).catch(() => null);
      if (!stats) {
        throw new DirectoryNotFoundError(virtualPath);
      }
      if (!stats.isDirectory()) {
        throw new DirectoryNotFoundError(virtualPath);
      }

      if (!recursive) {
        const contents = await fs.promises.readdir(fullPath);
        if (contents.length > 0) {
          throw new DirectoryNotEmptyError(virtualPath);
        }
      }

      await fs.promises.rm(fullPath, { recursive, force: true });
      return this.successResult();
    } catch (error) {
      if (error instanceof DirectoryNotFoundError || error instanceof DirectoryNotEmptyError) {
        return this.errorResult(error.message);
      }
      return this.errorResult(`Failed to remove directory: ${(error as Error).message}`);
    }
  }

  async uploadFile(
    source: string | Buffer | ReadableStream,
    remotePath: string,
    options: UploadOptions = {}
  ): Promise<OperationResult<FileItem>> {
    this.ensureInitialized();

    try {
      const fullPath = this.resolveFullPath(remotePath);
      const filename = path.basename(fullPath);

      this.validateExtension(filename);

      // Check if file exists
      if (!options.overwrite) {
        try {
          await fs.promises.stat(fullPath);
          throw new FileExistsError(remotePath);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            if (error instanceof FileExistsError) throw error;
          }
        }
      }

      // Ensure parent directory exists
      const parentDir = path.dirname(fullPath);
      await fs.promises.mkdir(parentDir, { recursive: true });

      if (typeof source === 'string') {
        // Source is a local file path
        const stats = await fs.promises.stat(source);
        this.validateFileSize(stats.size, filename);

        if (options.onProgress) {
          // Copy with progress
          const totalBytes = stats.size;
          let bytesTransferred = 0;
          const readStream = fs.createReadStream(source);
          const writeStream = fs.createWriteStream(fullPath);

          readStream.on('data', (chunk) => {
            bytesTransferred += (chunk as Buffer).length;
            const progress = (bytesTransferred / totalBytes) * 100;
            options.onProgress!(progress, bytesTransferred, totalBytes);
          });

          await pipeline(readStream, writeStream);
        } else {
          await fs.promises.copyFile(source, fullPath);
        }
      } else if (Buffer.isBuffer(source)) {
        // Source is a Buffer
        this.validateFileSize(source.length, filename);
        await fs.promises.writeFile(fullPath, source);
        if (options.onProgress) {
          options.onProgress(100, source.length, source.length);
        }
      } else {
        // Source is a ReadableStream
        const writeStream = fs.createWriteStream(fullPath);
        const readable = Readable.fromWeb(source as import('stream/web').ReadableStream);
        await pipeline(readable, writeStream);
      }

      const stats = await fs.promises.stat(fullPath);
      const item = await this.statToItem(fullPath, stats) as FileItem;

      return this.successResult(item);
    } catch (error) {
      if (
        error instanceof FileExistsError ||
        error instanceof FileTooLargeError ||
        error instanceof InvalidExtensionError
      ) {
        return this.errorResult(error.message);
      }
      return this.errorResult(`Failed to upload file: ${(error as Error).message}`);
    }
  }

  async downloadFile(
    remotePath: string,
    localPath?: string,
    options: DownloadOptions = {}
  ): Promise<OperationResult<Buffer | string>> {
    this.ensureInitialized();

    try {
      const fullPath = this.resolveFullPath(remotePath);

      const stats = await fs.promises.stat(fullPath).catch(() => null);
      if (!stats || stats.isDirectory()) {
        throw new FileNotFoundError(remotePath);
      }

      if (localPath) {
        // Download to a local file
        const destDir = path.dirname(localPath);
        await fs.promises.mkdir(destDir, { recursive: true });

        if (options.onProgress) {
          const totalBytes = stats.size;
          let bytesTransferred = 0;
          const readStream = fs.createReadStream(fullPath);
          const writeStream = fs.createWriteStream(localPath);

          readStream.on('data', (chunk) => {
            bytesTransferred += (chunk as Buffer).length;
            const progress = (bytesTransferred / totalBytes) * 100;
            options.onProgress!(progress, bytesTransferred, totalBytes);
          });

          await pipeline(readStream, writeStream);
        } else {
          await fs.promises.copyFile(fullPath, localPath);
        }

        return this.successResult(localPath);
      } else {
        // Return buffer
        const buffer = await fs.promises.readFile(fullPath);
        if (options.onProgress) {
          options.onProgress(100, buffer.length, buffer.length);
        }
        return this.successResult(buffer);
      }
    } catch (error) {
      if (error instanceof FileNotFoundError) {
        return this.errorResult(error.message);
      }
      return this.errorResult(`Failed to download file: ${(error as Error).message}`);
    }
  }

  async moveItem(
    sourcePath: string,
    destinationPath: string,
    options: MoveOptions = {}
  ): Promise<OperationResult<FileSystemItem>> {
    this.ensureInitialized();

    try {
      const sourceFullPath = this.resolveFullPath(sourcePath);
      const destFullPath = this.resolveFullPath(destinationPath);

      const sourceStats = await fs.promises.stat(sourceFullPath).catch(() => null);
      if (!sourceStats) {
        throw new FileNotFoundError(sourcePath);
      }

      // Check destination
      if (!options.overwrite) {
        const destStats = await fs.promises.stat(destFullPath).catch(() => null);
        if (destStats) {
          throw new FileExistsError(destinationPath);
        }
      }

      // Ensure parent directory exists
      const destParent = path.dirname(destFullPath);
      await fs.promises.mkdir(destParent, { recursive: true });

      await fs.promises.rename(sourceFullPath, destFullPath);

      const newStats = await fs.promises.stat(destFullPath);
      const item = await this.statToItem(destFullPath, newStats);

      return this.successResult(item);
    } catch (error) {
      if (error instanceof FileNotFoundError || error instanceof FileExistsError) {
        return this.errorResult(error.message);
      }
      return this.errorResult(`Failed to move item: ${(error as Error).message}`);
    }
  }

  async deleteFile(virtualPath: string): Promise<OperationResult> {
    this.ensureInitialized();

    try {
      const fullPath = this.resolveFullPath(virtualPath);

      const stats = await fs.promises.stat(fullPath).catch(() => null);
      if (!stats) {
        throw new FileNotFoundError(virtualPath);
      }
      if (stats.isDirectory()) {
        throw new FileNotFoundError(virtualPath);
      }

      await fs.promises.unlink(fullPath);
      return this.successResult();
    } catch (error) {
      if (error instanceof FileNotFoundError) {
        return this.errorResult(error.message);
      }
      return this.errorResult(`Failed to delete file: ${(error as Error).message}`);
    }
  }

  async renameFile(
    virtualPath: string,
    newName: string,
    options: RenameOptions = {}
  ): Promise<OperationResult<FileItem>> {
    this.ensureInitialized();

    try {
      const fullPath = this.resolveFullPath(virtualPath);

      const stats = await fs.promises.stat(fullPath).catch(() => null);
      if (!stats || stats.isDirectory()) {
        throw new FileNotFoundError(virtualPath);
      }

      this.validateExtension(newName);

      const parentDir = path.dirname(fullPath);
      const newFullPath = path.join(parentDir, newName);

      // Check if destination exists
      if (!options.overwrite) {
        const destStats = await fs.promises.stat(newFullPath).catch(() => null);
        if (destStats) {
          throw new FileExistsError(newName);
        }
      }

      await fs.promises.rename(fullPath, newFullPath);

      const newStats = await fs.promises.stat(newFullPath);
      const item = await this.statToItem(newFullPath, newStats) as FileItem;

      return this.successResult(item);
    } catch (error) {
      if (
        error instanceof FileNotFoundError ||
        error instanceof FileExistsError ||
        error instanceof InvalidExtensionError
      ) {
        return this.errorResult(error.message);
      }
      return this.errorResult(`Failed to rename file: ${(error as Error).message}`);
    }
  }

  async renameFolder(
    virtualPath: string,
    newName: string,
    options: RenameOptions = {}
  ): Promise<OperationResult<FolderItem>> {
    this.ensureInitialized();

    try {
      const fullPath = this.resolveFullPath(virtualPath);

      const stats = await fs.promises.stat(fullPath).catch(() => null);
      if (!stats || !stats.isDirectory()) {
        throw new DirectoryNotFoundError(virtualPath);
      }

      const parentDir = path.dirname(fullPath);
      const newFullPath = path.join(parentDir, newName);

      // Check if destination exists
      if (!options.overwrite) {
        const destStats = await fs.promises.stat(newFullPath).catch(() => null);
        if (destStats) {
          throw new DirectoryExistsError(newName);
        }
      }

      await fs.promises.rename(fullPath, newFullPath);

      const newStats = await fs.promises.stat(newFullPath);
      const item = await this.statToItem(newFullPath, newStats) as FolderItem;

      return this.successResult(item);
    } catch (error) {
      if (error instanceof DirectoryNotFoundError || error instanceof DirectoryExistsError) {
        return this.errorResult(error.message);
      }
      return this.errorResult(`Failed to rename folder: ${(error as Error).message}`);
    }
  }

  async listDirectory(
    virtualPath: string,
    options: ListOptions = {}
  ): Promise<OperationResult<FileSystemItem[]>> {
    this.ensureInitialized();

    try {
      const fullPath = this.resolveFullPath(virtualPath);

      const stats = await fs.promises.stat(fullPath).catch(() => null);
      if (!stats || !stats.isDirectory()) {
        throw new DirectoryNotFoundError(virtualPath);
      }

      const entries = await fs.promises.readdir(fullPath, { withFileTypes: true });
      const items: FileSystemItem[] = [];

      for (const entry of entries) {
        // Skip hidden files unless explicitly included
        if (!options.includeHidden && entry.name.startsWith('.')) {
          continue;
        }

        const entryPath = path.join(fullPath, entry.name);
        const entryStats = await fs.promises.stat(entryPath);
        const item = await this.statToItem(entryPath, entryStats);

        // Apply filter if provided
        if (options.filter && !options.filter(item)) {
          continue;
        }

        items.push(item);

        // Handle recursive listing
        if (options.recursive && entry.isDirectory()) {
          const subResult = await this.listDirectory(
            this.toVirtualPath(entryPath),
            options
          );
          if (subResult.success && subResult.data) {
            items.push(...subResult.data);
          }
        }
      }

      // Sort: folders first, then alphabetically
      items.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      return this.successResult(items);
    } catch (error) {
      if (error instanceof DirectoryNotFoundError) {
        return this.errorResult(error.message);
      }
      return this.errorResult(`Failed to list directory: ${(error as Error).message}`);
    }
  }

  async getItem(virtualPath: string): Promise<OperationResult<FileSystemItem>> {
    this.ensureInitialized();

    try {
      const fullPath = this.resolveFullPath(virtualPath);

      const stats = await fs.promises.stat(fullPath).catch(() => null);
      if (!stats) {
        throw new FileNotFoundError(virtualPath);
      }

      const item = await this.statToItem(fullPath, stats);
      return this.successResult(item);
    } catch (error) {
      if (error instanceof FileNotFoundError) {
        return this.errorResult(error.message);
      }
      return this.errorResult(`Failed to get item: ${(error as Error).message}`);
    }
  }

  async exists(virtualPath: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      const fullPath = this.resolveFullPath(virtualPath);
      await fs.promises.stat(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Factory function to create a LocalStorageModule instance
 */
export function createLocalModule(): LocalStorageModule {
  return new LocalStorageModule();
}

export default LocalStorageModule;
