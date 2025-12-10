/**
 * Google Drive Storage Module
 * Implements file operations using Google Drive API
 */

import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';

import { BaseStorageModule } from '../../common/base-module';
import {
  FileNotFoundError,
  DirectoryNotFoundError,
  FileExistsError,
  AuthenticationError,
} from '../../common/errors';
import { createFileItem, createFolderItem } from '../../common/utils';
import { GoogleDriveAuth, createGoogleDriveAuth, TokenData, AuthCallbacks } from './auth';
import type {
  StorageProvider,
  HazoFilesConfig,
  GoogleDriveConfig,
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

const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';

export class GoogleDriveModule extends BaseStorageModule {
  readonly provider: StorageProvider = 'google_drive';
  private auth: GoogleDriveAuth | null = null;
  private drive: drive_v3.Drive | null = null;
  private rootFolderId: string = 'root';
  private authCallbacks: AuthCallbacks = {};

  /**
   * Set authentication callbacks for token persistence
   */
  setAuthCallbacks(callbacks: AuthCallbacks): void {
    this.authCallbacks = callbacks;
  }

  async initialize(config: HazoFilesConfig): Promise<void> {
    await super.initialize(config);

    const driveConfig = this.getProviderConfig<GoogleDriveConfig>();

    if (!driveConfig.clientId || !driveConfig.clientSecret) {
      throw new AuthenticationError('google_drive', 'Missing client ID or client secret');
    }

    this.auth = createGoogleDriveAuth(
      {
        clientId: driveConfig.clientId,
        clientSecret: driveConfig.clientSecret,
        redirectUri: driveConfig.redirectUri,
      },
      this.authCallbacks
    );

    // Set tokens if provided in config
    if (driveConfig.refreshToken) {
      await this.auth.setTokens({
        accessToken: driveConfig.accessToken || '',
        refreshToken: driveConfig.refreshToken,
      });
    }

    this.drive = google.drive({ version: 'v3', auth: this.auth.getClient() });
    this.rootFolderId = driveConfig.rootFolderId || 'root';
  }

  /**
   * Get the auth instance for OAuth flow
   */
  getAuth(): GoogleDriveAuth {
    if (!this.auth) {
      throw new AuthenticationError('google_drive', 'Module not initialized');
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
  async authenticate(tokens: TokenData): Promise<void> {
    if (!this.auth) {
      throw new AuthenticationError('google_drive', 'Module not initialized');
    }
    await this.auth.setTokens(tokens);
  }

  /**
   * Ensure authenticated before operations
   */
  private async ensureAuthenticated(): Promise<void> {
    this.ensureInitialized();
    if (!this.isAuthenticated()) {
      throw new AuthenticationError('google_drive', 'Not authenticated. Please connect your Google Drive.');
    }
    await this.auth!.ensureValidToken();
  }

  /**
   * Get folder ID from path (creates folders if needed for certain operations)
   */
  private async getIdFromPath(virtualPath: string, createIfMissing = false): Promise<string | null> {
    const normalized = this.normalizePath(virtualPath);
    if (normalized === '/') {
      return this.rootFolderId;
    }

    const segments = normalized.split('/').filter(Boolean);
    let currentParentId = this.rootFolderId;

    for (const segment of segments) {
      const query = `name='${segment}' and '${currentParentId}' in parents and trashed=false`;

      const response = await this.drive!.files.list({
        q: query,
        fields: 'files(id, name, mimeType)',
        pageSize: 1,
      });

      if (response.data.files && response.data.files.length > 0) {
        currentParentId = response.data.files[0].id!;
      } else if (createIfMissing) {
        // Create the folder
        const createResponse = await this.drive!.files.create({
          requestBody: {
            name: segment,
            mimeType: FOLDER_MIME_TYPE,
            parents: [currentParentId],
          },
          fields: 'id',
        });
        currentParentId = createResponse.data.id!;
      } else {
        return null;
      }
    }

    return currentParentId;
  }

  /**
   * Convert Drive file to FileSystemItem
   */
  private driveFileToItem(file: drive_v3.Schema$File, virtualPath?: string): FileSystemItem {
    const isFolder = file.mimeType === FOLDER_MIME_TYPE;
    const path = virtualPath || '';

    if (isFolder) {
      return createFolderItem({
        id: file.id!,
        name: file.name!,
        path,
        createdAt: file.createdTime ? new Date(file.createdTime) : new Date(),
        modifiedAt: file.modifiedTime ? new Date(file.modifiedTime) : new Date(),
        metadata: {
          driveId: file.id,
          webViewLink: file.webViewLink,
        },
      });
    }

    return createFileItem({
      id: file.id!,
      name: file.name!,
      path,
      size: parseInt(file.size || '0', 10),
      mimeType: file.mimeType || 'application/octet-stream',
      createdAt: file.createdTime ? new Date(file.createdTime) : new Date(),
      modifiedAt: file.modifiedTime ? new Date(file.modifiedTime) : new Date(),
      metadata: {
        driveId: file.id,
        webViewLink: file.webViewLink,
        thumbnailLink: file.thumbnailLink,
      },
    });
  }

  async createDirectory(virtualPath: string): Promise<OperationResult<FolderItem>> {
    try {
      await this.ensureAuthenticated();

      const normalized = this.normalizePath(virtualPath);
      const parentPath = this.getParentPath(normalized);
      const folderName = this.getBaseName(normalized);

      // Get or create parent folder
      const parentId = await this.getIdFromPath(parentPath, true);
      if (!parentId) {
        throw new DirectoryNotFoundError(parentPath);
      }

      // Check if folder already exists
      const existingQuery = `name='${folderName}' and '${parentId}' in parents and mimeType='${FOLDER_MIME_TYPE}' and trashed=false`;
      const existingResponse = await this.drive!.files.list({
        q: existingQuery,
        fields: 'files(id)',
        pageSize: 1,
      });

      if (existingResponse.data.files && existingResponse.data.files.length > 0) {
        return this.errorResult(`Directory already exists: ${virtualPath}`);
      }

      // Create the folder
      const response = await this.drive!.files.create({
        requestBody: {
          name: folderName,
          mimeType: FOLDER_MIME_TYPE,
          parents: [parentId],
        },
        fields: 'id, name, mimeType, createdTime, modifiedTime, webViewLink',
      });

      const item = this.driveFileToItem(response.data, normalized) as FolderItem;
      return this.successResult(item);
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof DirectoryNotFoundError) {
        return this.errorResult(error.message);
      }
      return this.errorResult(`Failed to create directory: ${(error as Error).message}`);
    }
  }

  async removeDirectory(virtualPath: string, recursive = false): Promise<OperationResult> {
    try {
      await this.ensureAuthenticated();

      const folderId = await this.getIdFromPath(virtualPath);
      if (!folderId) {
        throw new DirectoryNotFoundError(virtualPath);
      }

      if (!recursive) {
        // Check if folder is empty
        const childrenResponse = await this.drive!.files.list({
          q: `'${folderId}' in parents and trashed=false`,
          fields: 'files(id)',
          pageSize: 1,
        });

        if (childrenResponse.data.files && childrenResponse.data.files.length > 0) {
          return this.errorResult(`Directory is not empty: ${virtualPath}`);
        }
      }

      await this.drive!.files.delete({ fileId: folderId });
      return this.successResult();
    } catch (error) {
      if (error instanceof DirectoryNotFoundError) {
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
    try {
      await this.ensureAuthenticated();

      const normalized = this.normalizePath(remotePath);
      const parentPath = this.getParentPath(normalized);
      const fileName = this.getBaseName(normalized);

      // Get or create parent folder
      const parentId = await this.getIdFromPath(parentPath, true);
      if (!parentId) {
        throw new DirectoryNotFoundError(parentPath);
      }

      // Check if file already exists
      if (!options.overwrite) {
        const existingQuery = `name='${fileName}' and '${parentId}' in parents and trashed=false`;
        const existingResponse = await this.drive!.files.list({
          q: existingQuery,
          fields: 'files(id)',
          pageSize: 1,
        });

        if (existingResponse.data.files && existingResponse.data.files.length > 0) {
          throw new FileExistsError(remotePath);
        }
      }

      let media: { mimeType: string; body: Readable | Buffer };

      if (typeof source === 'string') {
        // Source is a file path - read it
        const fs = await import('fs');
        media = {
          mimeType: 'application/octet-stream',
          body: fs.createReadStream(source),
        };
      } else if (Buffer.isBuffer(source)) {
        media = {
          mimeType: 'application/octet-stream',
          body: source,
        };
      } else {
        media = {
          mimeType: 'application/octet-stream',
          body: Readable.fromWeb(source as import('stream/web').ReadableStream),
        };
      }

      const response = await this.drive!.files.create({
        requestBody: {
          name: fileName,
          parents: [parentId],
        },
        media,
        fields: 'id, name, mimeType, size, createdTime, modifiedTime, webViewLink, thumbnailLink',
      });

      if (options.onProgress) {
        options.onProgress(100, parseInt(response.data.size || '0', 10), parseInt(response.data.size || '0', 10));
      }

      const item = this.driveFileToItem(response.data, normalized) as FileItem;
      return this.successResult(item);
    } catch (error) {
      if (
        error instanceof AuthenticationError ||
        error instanceof DirectoryNotFoundError ||
        error instanceof FileExistsError
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

      const fileId = await this.getIdFromPath(remotePath);
      if (!fileId) {
        throw new FileNotFoundError(remotePath);
      }

      const response = await this.drive!.files.get(
        { fileId, alt: 'media' },
        { responseType: 'arraybuffer' }
      );

      const buffer = Buffer.from(response.data as ArrayBuffer);

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
    _options: MoveOptions = {}
  ): Promise<OperationResult<FileSystemItem>> {
    try {
      await this.ensureAuthenticated();

      const fileId = await this.getIdFromPath(sourcePath);
      if (!fileId) {
        throw new FileNotFoundError(sourcePath);
      }

      // Get current parents
      const file = await this.drive!.files.get({
        fileId,
        fields: 'parents',
      });

      const previousParents = file.data.parents?.join(',') || '';

      // Get new parent
      const destParentPath = this.getParentPath(destinationPath);
      const newName = this.getBaseName(destinationPath);
      const newParentId = await this.getIdFromPath(destParentPath, true);

      if (!newParentId) {
        throw new DirectoryNotFoundError(destParentPath);
      }

      // Move the file
      const response = await this.drive!.files.update({
        fileId,
        addParents: newParentId,
        removeParents: previousParents,
        requestBody: {
          name: newName,
        },
        fields: 'id, name, mimeType, size, createdTime, modifiedTime, webViewLink, thumbnailLink',
      });

      const item = this.driveFileToItem(response.data, destinationPath);
      return this.successResult(item);
    } catch (error) {
      if (error instanceof FileNotFoundError || error instanceof DirectoryNotFoundError) {
        return this.errorResult(error.message);
      }
      return this.errorResult(`Failed to move item: ${(error as Error).message}`);
    }
  }

  async deleteFile(virtualPath: string): Promise<OperationResult> {
    try {
      await this.ensureAuthenticated();

      const fileId = await this.getIdFromPath(virtualPath);
      if (!fileId) {
        throw new FileNotFoundError(virtualPath);
      }

      await this.drive!.files.delete({ fileId });
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
    _options: RenameOptions = {}
  ): Promise<OperationResult<FileItem>> {
    try {
      await this.ensureAuthenticated();

      const fileId = await this.getIdFromPath(virtualPath);
      if (!fileId) {
        throw new FileNotFoundError(virtualPath);
      }

      const response = await this.drive!.files.update({
        fileId,
        requestBody: {
          name: newName,
        },
        fields: 'id, name, mimeType, size, createdTime, modifiedTime, webViewLink, thumbnailLink',
      });

      const parentPath = this.getParentPath(virtualPath);
      const newPath = this.joinPath(parentPath, newName);
      const item = this.driveFileToItem(response.data, newPath) as FileItem;

      return this.successResult(item);
    } catch (error) {
      if (error instanceof FileNotFoundError) {
        return this.errorResult(error.message);
      }
      return this.errorResult(`Failed to rename file: ${(error as Error).message}`);
    }
  }

  async renameFolder(
    virtualPath: string,
    newName: string,
    _options: RenameOptions = {}
  ): Promise<OperationResult<FolderItem>> {
    try {
      await this.ensureAuthenticated();

      const folderId = await this.getIdFromPath(virtualPath);
      if (!folderId) {
        throw new DirectoryNotFoundError(virtualPath);
      }

      const response = await this.drive!.files.update({
        fileId: folderId,
        requestBody: {
          name: newName,
        },
        fields: 'id, name, mimeType, createdTime, modifiedTime, webViewLink',
      });

      const parentPath = this.getParentPath(virtualPath);
      const newPath = this.joinPath(parentPath, newName);
      const item = this.driveFileToItem(response.data, newPath) as FolderItem;

      return this.successResult(item);
    } catch (error) {
      if (error instanceof DirectoryNotFoundError) {
        return this.errorResult(error.message);
      }
      return this.errorResult(`Failed to rename folder: ${(error as Error).message}`);
    }
  }

  async listDirectory(
    virtualPath: string,
    options: ListOptions = {}
  ): Promise<OperationResult<FileSystemItem[]>> {
    try {
      await this.ensureAuthenticated();

      const folderId = await this.getIdFromPath(virtualPath);
      if (!folderId) {
        throw new DirectoryNotFoundError(virtualPath);
      }

      const items: FileSystemItem[] = [];
      let pageToken: string | undefined;

      do {
        const response = await this.drive!.files.list({
          q: `'${folderId}' in parents and trashed=false`,
          fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, thumbnailLink)',
          pageSize: 100,
          pageToken,
          orderBy: 'folder,name',
        });

        if (response.data.files) {
          for (const file of response.data.files) {
            // Skip hidden files unless explicitly included
            if (!options.includeHidden && file.name?.startsWith('.')) {
              continue;
            }

            const itemPath = this.joinPath(virtualPath, file.name!);
            const item = this.driveFileToItem(file, itemPath);

            // Apply filter if provided
            if (options.filter && !options.filter(item)) {
              continue;
            }

            items.push(item);

            // Handle recursive listing
            if (options.recursive && file.mimeType === FOLDER_MIME_TYPE) {
              const subResult = await this.listDirectory(itemPath, options);
              if (subResult.success && subResult.data) {
                items.push(...subResult.data);
              }
            }
          }
        }

        pageToken = response.data.nextPageToken || undefined;
      } while (pageToken);

      return this.successResult(items);
    } catch (error) {
      if (error instanceof DirectoryNotFoundError) {
        return this.errorResult(error.message);
      }
      return this.errorResult(`Failed to list directory: ${(error as Error).message}`);
    }
  }

  async getItem(virtualPath: string): Promise<OperationResult<FileSystemItem>> {
    try {
      await this.ensureAuthenticated();

      const fileId = await this.getIdFromPath(virtualPath);
      if (!fileId) {
        throw new FileNotFoundError(virtualPath);
      }

      const response = await this.drive!.files.get({
        fileId,
        fields: 'id, name, mimeType, size, createdTime, modifiedTime, webViewLink, thumbnailLink',
      });

      const item = this.driveFileToItem(response.data, virtualPath);
      return this.successResult(item);
    } catch (error) {
      if (error instanceof FileNotFoundError) {
        return this.errorResult(error.message);
      }
      return this.errorResult(`Failed to get item: ${(error as Error).message}`);
    }
  }

  async exists(virtualPath: string): Promise<boolean> {
    try {
      await this.ensureAuthenticated();
      const fileId = await this.getIdFromPath(virtualPath);
      return fileId !== null;
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
 * Factory function to create a GoogleDriveModule instance
 */
export function createGoogleDriveModule(): GoogleDriveModule {
  return new GoogleDriveModule();
}

export { GoogleDriveAuth, createGoogleDriveAuth } from './auth';
export type { TokenData, AuthCallbacks, GoogleAuthConfig } from './auth';

export default GoogleDriveModule;
