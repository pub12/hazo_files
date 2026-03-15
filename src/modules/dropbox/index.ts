/**
 * Dropbox Storage Module
 * Implements file operations using Dropbox API via the official SDK
 */

import { Dropbox } from 'dropbox';

import { BaseStorageModule } from '../../common/base-module';
import {
  FileExistsError,
  FileTooLargeError,
  AuthenticationError,
} from '../../common/errors';
import { createFileItem, createFolderItem } from '../../common/utils';
import { getMimeType } from '../../common/mime-types';
import { DropboxAuth, createDropboxAuth, type DropboxTokenData, type DropboxAuthCallbacks } from './auth';
import type {
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
} from '../../types';

// Dropbox types from SDK
interface DropboxFileMetadata {
  '.tag': 'file';
  id: string;
  name: string;
  path_lower?: string;
  path_display?: string;
  size: number;
  client_modified: string;
  server_modified: string;
}

interface DropboxFolderMetadata {
  '.tag': 'folder';
  id: string;
  name: string;
  path_lower?: string;
  path_display?: string;
}

type DropboxMetadata = DropboxFileMetadata | DropboxFolderMetadata;

/** Dropbox specific configuration */
export interface DropboxConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  refreshToken?: string;
  accessToken?: string;
  rootPath?: string;
}

// 150MB upload limit for simple upload
const MAX_UPLOAD_SIZE = 150 * 1024 * 1024;

export class DropboxModule extends BaseStorageModule {
  readonly provider: StorageProvider = 'dropbox' as StorageProvider;
  private auth: DropboxAuth | null = null;
  private dbx: Dropbox | null = null;
  private rootPath: string = '';
  private authCallbacks: DropboxAuthCallbacks = {};

  /**
   * Set authentication callbacks for token persistence
   */
  setAuthCallbacks(callbacks: DropboxAuthCallbacks): void {
    this.authCallbacks = callbacks;
  }

  async initialize(config: HazoFilesConfig): Promise<void> {
    await super.initialize(config);

    const dropboxConfig = this.getProviderConfig<DropboxConfig>();

    if (!dropboxConfig.clientId || !dropboxConfig.clientSecret) {
      throw new AuthenticationError('dropbox', 'Missing client ID or client secret');
    }

    this.auth = createDropboxAuth(
      {
        clientId: dropboxConfig.clientId,
        clientSecret: dropboxConfig.clientSecret,
        redirectUri: dropboxConfig.redirectUri,
      },
      this.authCallbacks
    );

    // Set tokens if provided in config
    if (dropboxConfig.refreshToken || dropboxConfig.accessToken) {
      await this.auth.setTokens({
        accessToken: dropboxConfig.accessToken || '',
        refreshToken: dropboxConfig.refreshToken || '',
      });
    }

    this.rootPath = dropboxConfig.rootPath || '';
    this.createDropboxClient();
  }

  /**
   * Create/recreate the Dropbox SDK client with the current access token
   */
  private createDropboxClient(): void {
    const accessToken = this.auth?.getAccessToken();
    if (accessToken) {
      this.dbx = new Dropbox({ accessToken });
    }
  }

  /**
   * Get the auth instance for OAuth flow
   */
  getAuth(): DropboxAuth {
    if (!this.auth) {
      throw new AuthenticationError('dropbox', 'Module not initialized');
    }
    return this.auth;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.auth?.isAuthenticated() ?? false;
  }

  /**
   * Authenticate with provided tokens
   */
  async authenticate(tokens: DropboxTokenData): Promise<void> {
    if (!this.auth) {
      throw new AuthenticationError('dropbox', 'Module not initialized');
    }
    await this.auth.setTokens(tokens);
    this.createDropboxClient();
  }

  /**
   * Ensure authenticated before operations
   */
  private async ensureAuthenticated(): Promise<void> {
    this.ensureInitialized();
    if (!this.isAuthenticated()) {
      throw new AuthenticationError('dropbox', 'Not authenticated. Please connect your Dropbox.');
    }
    await this.auth!.ensureValidToken();
    // Recreate client in case token was refreshed
    this.createDropboxClient();
  }

  /**
   * Convert virtual path to Dropbox path
   * Virtual: /folder/file.txt -> Dropbox: /folder/file.txt (or /rootPath/folder/file.txt)
   * Dropbox root is empty string "", not "/"
   */
  private toDropboxPath(virtualPath: string): string {
    const normalized = this.normalizePath(virtualPath);
    if (this.rootPath) {
      if (normalized === '/') {
        return `/${this.rootPath}`;
      }
      return `/${this.rootPath}${normalized}`;
    }
    // Dropbox uses empty string for root
    if (normalized === '/') {
      return '';
    }
    return normalized;
  }

  /**
   * Convert Dropbox metadata to FileSystemItem
   */
  private metadataToItem(entry: DropboxMetadata, virtualPath?: string): FileSystemItem {
    const isFolder = entry['.tag'] === 'folder';
    const path = virtualPath || this.toVirtualPath(entry.path_display || entry.name);

    if (isFolder) {
      return createFolderItem({
        id: entry.id,
        name: entry.name,
        path,
        createdAt: new Date(),
        modifiedAt: new Date(),
        metadata: {
          dropboxId: entry.id,
          pathDisplay: entry.path_display,
        },
      });
    }

    const fileEntry = entry as DropboxFileMetadata;
    return createFileItem({
      id: fileEntry.id,
      name: fileEntry.name,
      path,
      size: fileEntry.size,
      mimeType: getMimeType(fileEntry.name),
      createdAt: new Date(fileEntry.client_modified),
      modifiedAt: new Date(fileEntry.server_modified),
      metadata: {
        dropboxId: fileEntry.id,
        pathDisplay: fileEntry.path_display,
      },
    });
  }

  /**
   * Convert a Dropbox path_display to virtual path
   */
  private toVirtualPath(dropboxPath: string): string {
    if (this.rootPath && dropboxPath.toLowerCase().startsWith(`/${this.rootPath.toLowerCase()}`)) {
      const stripped = dropboxPath.substring(this.rootPath.length + 1);
      return stripped || '/';
    }
    return dropboxPath || '/';
  }

  async createDirectory(virtualPath: string): Promise<OperationResult<FolderItem>> {
    try {
      await this.ensureAuthenticated();

      const dbxPath = this.toDropboxPath(virtualPath);

      const response = await this.dbx!.filesCreateFolderV2({
        path: dbxPath,
        autorename: false,
      });

      const metadata = response.result.metadata;
      const item = this.metadataToItem(
        { '.tag': 'folder', id: metadata.id, name: metadata.name, path_display: metadata.path_display, path_lower: metadata.path_lower },
        this.normalizePath(virtualPath)
      ) as FolderItem;

      return this.successResult(item);
    } catch (error: unknown) {
      if (error instanceof AuthenticationError) {
        return this.errorResult(error.message);
      }
      const errMsg = (error as Error).message || String(error);
      if (errMsg.includes('path/conflict')) {
        return this.errorResult(`Directory already exists: ${virtualPath}`);
      }
      return this.errorResult(`Failed to create directory: ${errMsg}`);
    }
  }

  async removeDirectory(virtualPath: string, recursive = false): Promise<OperationResult> {
    try {
      await this.ensureAuthenticated();

      const dbxPath = this.toDropboxPath(virtualPath);

      if (!recursive) {
        // Check if folder is empty - Dropbox delete is always recursive
        const listResponse = await this.dbx!.filesListFolder({
          path: dbxPath,
          limit: 1,
        });
        if (listResponse.result.entries.length > 0) {
          return this.errorResult(`Directory is not empty: ${virtualPath}`);
        }
      }

      await this.dbx!.filesDeleteV2({ path: dbxPath });
      return this.successResult();
    } catch (error: unknown) {
      const errMsg = (error as Error).message || String(error);
      if (errMsg.includes('path_lookup/not_found') || errMsg.includes('not_found')) {
        return this.errorResult(`Directory not found: ${virtualPath}`);
      }
      return this.errorResult(`Failed to remove directory: ${errMsg}`);
    }
  }

  async uploadFile(
    source: string | Buffer | ReadableStream,
    remotePath: string,
    options: UploadOptions = {}
  ): Promise<OperationResult<FileItem>> {
    try {
      await this.ensureAuthenticated();

      const normalized = this.normalizePath(remotePath);
      const dbxPath = this.toDropboxPath(remotePath);

      // Resolve source to Buffer
      let contents: Buffer;

      if (typeof source === 'string') {
        const fs = await import('fs');
        contents = await fs.promises.readFile(source);
      } else if (Buffer.isBuffer(source)) {
        contents = source;
      } else {
        // ReadableStream
        const chunks: Uint8Array[] = [];
        const reader = (source as ReadableStream).getReader();
        let done = false;
        while (!done) {
          const result = await reader.read();
          done = result.done;
          if (result.value) {
            chunks.push(result.value);
          }
        }
        contents = Buffer.concat(chunks);
      }

      // Check size limit
      if (contents.length > MAX_UPLOAD_SIZE) {
        throw new FileTooLargeError(this.getBaseName(remotePath), contents.length, MAX_UPLOAD_SIZE);
      }

      // Check if file already exists
      if (!options.overwrite) {
        try {
          await this.dbx!.filesGetMetadata({ path: dbxPath });
          throw new FileExistsError(remotePath);
        } catch (err: unknown) {
          if (err instanceof FileExistsError) throw err;
          // File doesn't exist, proceed
        }
      }

      const response = await this.dbx!.filesUpload({
        path: dbxPath,
        contents,
        mode: options.overwrite ? { '.tag': 'overwrite' } : { '.tag': 'add' },
        autorename: false,
      });

      if (options.onProgress) {
        options.onProgress(100, contents.length, contents.length);
      }

      const metadata = response.result;
      const item = this.metadataToItem(
        {
          '.tag': 'file',
          id: metadata.id,
          name: metadata.name,
          path_display: metadata.path_display,
          path_lower: metadata.path_lower,
          size: metadata.size,
          client_modified: metadata.client_modified,
          server_modified: metadata.server_modified,
        },
        normalized
      ) as FileItem;

      return this.successResult(item);
    } catch (error: unknown) {
      if (
        error instanceof AuthenticationError ||
        error instanceof FileExistsError ||
        error instanceof FileTooLargeError
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
    try {
      await this.ensureAuthenticated();

      const dbxPath = this.toDropboxPath(remotePath);

      const response = await this.dbx!.filesDownload({ path: dbxPath });

      // The SDK attaches fileBinary to the result for Node.js
      const result = response.result as unknown as { fileBinary: Buffer };
      const buffer = Buffer.from(result.fileBinary);

      if (options.onProgress) {
        options.onProgress(100, buffer.length, buffer.length);
      }

      if (localPath) {
        const fs = await import('fs');
        const path = await import('path');
        await fs.promises.mkdir(path.dirname(localPath), { recursive: true });
        await fs.promises.writeFile(localPath, buffer);
        return this.successResult(localPath);
      }

      return this.successResult(buffer);
    } catch (error: unknown) {
      const errMsg = (error as Error).message || String(error);
      if (errMsg.includes('path/not_found') || errMsg.includes('path_lookup/not_found')) {
        return this.errorResult(`File not found: ${remotePath}`);
      }
      return this.errorResult(`Failed to download file: ${errMsg}`);
    }
  }

  async moveItem(
    sourcePath: string,
    destinationPath: string,
    _options: MoveOptions = {}
  ): Promise<OperationResult<FileSystemItem>> {
    try {
      await this.ensureAuthenticated();

      const fromPath = this.toDropboxPath(sourcePath);
      const toPath = this.toDropboxPath(destinationPath);

      const response = await this.dbx!.filesMoveV2({
        from_path: fromPath,
        to_path: toPath,
        autorename: false,
      });

      const metadata = response.result.metadata as DropboxMetadata;
      const item = this.metadataToItem(metadata, this.normalizePath(destinationPath));
      return this.successResult(item);
    } catch (error: unknown) {
      const errMsg = (error as Error).message || String(error);
      if (errMsg.includes('not_found')) {
        return this.errorResult(`Item not found: ${sourcePath}`);
      }
      return this.errorResult(`Failed to move item: ${errMsg}`);
    }
  }

  async deleteFile(virtualPath: string): Promise<OperationResult> {
    try {
      await this.ensureAuthenticated();

      const dbxPath = this.toDropboxPath(virtualPath);
      await this.dbx!.filesDeleteV2({ path: dbxPath });
      return this.successResult();
    } catch (error: unknown) {
      const errMsg = (error as Error).message || String(error);
      if (errMsg.includes('not_found')) {
        return this.errorResult(`File not found: ${virtualPath}`);
      }
      return this.errorResult(`Failed to delete file: ${errMsg}`);
    }
  }

  async renameFile(
    virtualPath: string,
    newName: string,
    _options: RenameOptions = {}
  ): Promise<OperationResult<FileItem>> {
    try {
      await this.ensureAuthenticated();

      const parentPath = this.getParentPath(virtualPath);
      const newVirtualPath = this.joinPath(parentPath, newName);
      const fromPath = this.toDropboxPath(virtualPath);
      const toPath = this.toDropboxPath(newVirtualPath);

      const response = await this.dbx!.filesMoveV2({
        from_path: fromPath,
        to_path: toPath,
        autorename: false,
      });

      const metadata = response.result.metadata as DropboxMetadata;
      const item = this.metadataToItem(metadata, newVirtualPath) as FileItem;
      return this.successResult(item);
    } catch (error: unknown) {
      const errMsg = (error as Error).message || String(error);
      if (errMsg.includes('not_found')) {
        return this.errorResult(`File not found: ${virtualPath}`);
      }
      return this.errorResult(`Failed to rename file: ${errMsg}`);
    }
  }

  async renameFolder(
    virtualPath: string,
    newName: string,
    _options: RenameOptions = {}
  ): Promise<OperationResult<FolderItem>> {
    try {
      await this.ensureAuthenticated();

      const parentPath = this.getParentPath(virtualPath);
      const newVirtualPath = this.joinPath(parentPath, newName);
      const fromPath = this.toDropboxPath(virtualPath);
      const toPath = this.toDropboxPath(newVirtualPath);

      const response = await this.dbx!.filesMoveV2({
        from_path: fromPath,
        to_path: toPath,
        autorename: false,
      });

      const metadata = response.result.metadata as DropboxMetadata;
      const item = this.metadataToItem(metadata, newVirtualPath) as FolderItem;
      return this.successResult(item);
    } catch (error: unknown) {
      const errMsg = (error as Error).message || String(error);
      if (errMsg.includes('not_found')) {
        return this.errorResult(`Folder not found: ${virtualPath}`);
      }
      return this.errorResult(`Failed to rename folder: ${errMsg}`);
    }
  }

  async listDirectory(
    virtualPath: string,
    options: ListOptions = {}
  ): Promise<OperationResult<FileSystemItem[]>> {
    try {
      await this.ensureAuthenticated();

      const dbxPath = this.toDropboxPath(virtualPath);
      const items: FileSystemItem[] = [];
      let hasMore = true;
      let cursor: string | undefined;

      // Initial list
      const firstResponse = await this.dbx!.filesListFolder({
        path: dbxPath,
        limit: 100,
      });

      let entries = firstResponse.result.entries;
      hasMore = firstResponse.result.has_more;
      cursor = firstResponse.result.cursor;

      // Process entries
      const processEntries = async (entryList: typeof entries) => {
        for (const entry of entryList) {
          // Skip hidden files unless explicitly included
          if (!options.includeHidden && entry.name.startsWith('.')) {
            continue;
          }

          const itemPath = this.joinPath(virtualPath, entry.name);
          const item = this.metadataToItem(entry as DropboxMetadata, itemPath);

          // Apply filter if provided
          if (options.filter && !options.filter(item)) {
            continue;
          }

          items.push(item);

          // Handle recursive listing
          if (options.recursive && entry['.tag'] === 'folder') {
            const subResult = await this.listDirectory(itemPath, options);
            if (subResult.success && subResult.data) {
              items.push(...subResult.data);
            }
          }
        }
      };

      await processEntries(entries);

      // Continue paginating
      while (hasMore && cursor) {
        const continueResponse = await this.dbx!.filesListFolderContinue({ cursor });
        entries = continueResponse.result.entries;
        hasMore = continueResponse.result.has_more;
        cursor = continueResponse.result.cursor;
        await processEntries(entries);
      }

      return this.successResult(items);
    } catch (error: unknown) {
      const errMsg = (error as Error).message || String(error);
      if (errMsg.includes('path/not_found') || errMsg.includes('not_found')) {
        return this.errorResult(`Directory not found: ${virtualPath}`);
      }
      return this.errorResult(`Failed to list directory: ${errMsg}`);
    }
  }

  async getItem(virtualPath: string): Promise<OperationResult<FileSystemItem>> {
    try {
      await this.ensureAuthenticated();

      const dbxPath = this.toDropboxPath(virtualPath);

      const response = await this.dbx!.filesGetMetadata({ path: dbxPath });
      const metadata = response.result as DropboxMetadata;
      const item = this.metadataToItem(metadata, this.normalizePath(virtualPath));
      return this.successResult(item);
    } catch (error: unknown) {
      const errMsg = (error as Error).message || String(error);
      if (errMsg.includes('not_found')) {
        return this.errorResult(`Item not found: ${virtualPath}`);
      }
      return this.errorResult(`Failed to get item: ${errMsg}`);
    }
  }

  async exists(virtualPath: string): Promise<boolean> {
    try {
      await this.ensureAuthenticated();
      const dbxPath = this.toDropboxPath(virtualPath);
      await this.dbx!.filesGetMetadata({ path: dbxPath });
      return true;
    } catch {
      return false;
    }
  }

  async getFolderTree(path = '/', depth = 3): Promise<OperationResult<TreeNode[]>> {
    try {
      await this.ensureAuthenticated();
      return super.getFolderTree(path, depth);
    } catch (error) {
      return this.errorResult(`Failed to get folder tree: ${(error as Error).message}`);
    }
  }
}

/**
 * Factory function to create a DropboxModule instance
 */
export function createDropboxModule(): DropboxModule {
  return new DropboxModule();
}

export { DropboxAuth, createDropboxAuth } from './auth';
export type { DropboxTokenData, DropboxAuthCallbacks, DropboxAuthConfig } from './auth';

export default DropboxModule;
