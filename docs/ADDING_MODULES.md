# Adding Custom Storage Modules

This guide walks you through creating custom storage modules for hazo_files. By implementing the `StorageModule` interface, you can integrate any storage backend (S3, Dropbox, OneDrive, WebDAV, etc.) with the unified hazo_files API.

## Table of Contents

1. [Module Architecture](#module-architecture)
2. [Quick Start](#quick-start)
3. [Step-by-Step Guide](#step-by-step-guide)
4. [Interface Reference](#interface-reference)
5. [Best Practices](#best-practices)
6. [Testing](#testing)
7. [Examples](#examples)

## Module Architecture

### Overview

```
Your Custom Module
    │
    ├── Extends BaseStorageModule
    │   ├── Common utilities (path, results)
    │   ├── Configuration management
    │   └── Tree building logic
    │
    ├── Implements StorageModule interface
    │   ├── All required operations
    │   └── Provider-specific logic
    │
    └── Integrates with storage backend
        └── S3, Dropbox, custom API, etc.
```

### Key Components

1. **BaseStorageModule**: Abstract base class providing common functionality
2. **StorageModule Interface**: Contract defining all required operations
3. **Provider-Specific Logic**: Your implementation using the storage backend API
4. **Configuration**: Provider-specific config added to `HazoFilesConfig`

## Quick Start

### Minimal Example

```typescript
import { BaseStorageModule } from 'hazo_files';
import type { StorageProvider, HazoFilesConfig, OperationResult, FileItem } from 'hazo_files';

// 1. Define your storage provider type
export type CustomStorageProvider = 'my_storage';

// 2. Define configuration interface
export interface MyStorageConfig {
  apiKey: string;
  endpoint: string;
}

// 3. Extend BaseStorageModule
export class MyStorageModule extends BaseStorageModule {
  readonly provider: StorageProvider = 'my_storage' as StorageProvider;
  private apiKey: string = '';
  private endpoint: string = '';

  async initialize(config: HazoFilesConfig): Promise<void> {
    await super.initialize(config);
    const myConfig = this.getProviderConfig<MyStorageConfig>();
    this.apiKey = myConfig.apiKey;
    this.endpoint = myConfig.endpoint;
    // Initialize your storage client
  }

  async uploadFile(source, remotePath, options?): Promise<OperationResult<FileItem>> {
    this.ensureInitialized();
    try {
      // Implement upload logic
      const fileItem = await this.performUpload(source, remotePath);
      return this.successResult(fileItem);
    } catch (error) {
      return this.errorResult(`Upload failed: ${(error as Error).message}`);
    }
  }

  // Implement other required methods...
}

// 4. Export factory function
export function createMyStorageModule(): MyStorageModule {
  return new MyStorageModule();
}
```

### Registration

```typescript
import { registerModule } from 'hazo_files';
import { createMyStorageModule } from './my-storage-module';

// Register your module
registerModule('my_storage', createMyStorageModule);

// Now you can use it
const fm = await createInitializedFileManager({
  config: {
    provider: 'my_storage',
    my_storage: {
      apiKey: 'your-api-key',
      endpoint: 'https://api.example.com'
    }
  }
});
```

## Step-by-Step Guide

### Step 1: Setup

Create a new file for your module:

```bash
mkdir -p src/modules/my-storage
touch src/modules/my-storage/index.ts
touch src/modules/my-storage/client.ts
```

### Step 2: Define Types

```typescript
// src/modules/my-storage/types.ts
import type { StorageProvider } from 'hazo_files';

// Extend StorageProvider type
export type MyStorageProvider = 'my_storage';

// Configuration interface
export interface MyStorageConfig {
  apiKey: string;
  endpoint: string;
  bucket?: string;
  region?: string;
}

// Add to HazoFilesConfig
declare module 'hazo_files' {
  interface HazoFilesConfig {
    my_storage?: MyStorageConfig;
  }
}
```

### Step 3: Create Storage Client

```typescript
// src/modules/my-storage/client.ts
import axios from 'axios';

export class MyStorageClient {
  private apiKey: string;
  private endpoint: string;

  constructor(apiKey: string, endpoint: string) {
    this.apiKey = apiKey;
    this.endpoint = endpoint;
  }

  async uploadFile(path: string, data: Buffer): Promise<any> {
    const response = await axios.post(
      `${this.endpoint}/files`,
      data,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/octet-stream',
          'X-File-Path': path,
        }
      }
    );
    return response.data;
  }

  async downloadFile(path: string): Promise<Buffer> {
    const response = await axios.get(
      `${this.endpoint}/files/${encodeURIComponent(path)}`,
      {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        responseType: 'arraybuffer',
      }
    );
    return Buffer.from(response.data);
  }

  async listFiles(path: string): Promise<any[]> {
    const response = await axios.get(
      `${this.endpoint}/files`,
      {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        params: { path },
      }
    );
    return response.data.files;
  }

  async deleteFile(path: string): Promise<void> {
    await axios.delete(
      `${this.endpoint}/files/${encodeURIComponent(path)}`,
      {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      }
    );
  }

  // Add other methods as needed
}
```

### Step 4: Implement Module

```typescript
// src/modules/my-storage/index.ts
import { BaseStorageModule } from '../../common/base-module';
import { FileNotFoundError, DirectoryNotFoundError } from '../../common/errors';
import { generateId, createFileItem, createFolderItem } from '../../common/utils';
import { getMimeType } from '../../common/mime-types';
import { MyStorageClient } from './client';
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
} from '../../types';
import type { MyStorageConfig } from './types';

export class MyStorageModule extends BaseStorageModule {
  readonly provider: StorageProvider = 'my_storage' as StorageProvider;
  private client: MyStorageClient | null = null;

  async initialize(config: HazoFilesConfig): Promise<void> {
    await super.initialize(config);

    const myConfig = this.getProviderConfig<MyStorageConfig>();
    this.client = new MyStorageClient(myConfig.apiKey, myConfig.endpoint);
  }

  async createDirectory(path: string): Promise<OperationResult<FolderItem>> {
    this.ensureInitialized();

    try {
      const normalized = this.normalizePath(path);

      // Call your storage API to create directory
      await this.client!.createDirectory(normalized);

      // Create FolderItem
      const folder = createFolderItem({
        id: generateId(),
        name: this.getBaseName(normalized),
        path: normalized,
        createdAt: new Date(),
        modifiedAt: new Date(),
      });

      return this.successResult(folder);
    } catch (error) {
      return this.errorResult(`Failed to create directory: ${(error as Error).message}`);
    }
  }

  async removeDirectory(path: string, recursive = false): Promise<OperationResult> {
    this.ensureInitialized();

    try {
      const normalized = this.normalizePath(path);

      // Check if directory is empty (if not recursive)
      if (!recursive) {
        const contents = await this.client!.listFiles(normalized);
        if (contents.length > 0) {
          return this.errorResult('Directory is not empty');
        }
      }

      await this.client!.deleteDirectory(normalized, recursive);
      return this.successResult();
    } catch (error) {
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
      const normalized = this.normalizePath(remotePath);
      const fileName = this.getBaseName(normalized);

      // Convert source to Buffer
      let buffer: Buffer;
      if (typeof source === 'string') {
        const fs = await import('fs');
        buffer = await fs.promises.readFile(source);
      } else if (Buffer.isBuffer(source)) {
        buffer = source;
      } else {
        // ReadableStream to Buffer
        const chunks: Uint8Array[] = [];
        const reader = source.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        buffer = Buffer.concat(chunks.map(c => Buffer.from(c)));
      }

      // Upload to storage
      const result = await this.client!.uploadFile(normalized, buffer);

      // Track progress if callback provided
      if (options.onProgress) {
        options.onProgress(100, buffer.length, buffer.length);
      }

      // Create FileItem
      const fileItem = createFileItem({
        id: result.id || generateId(),
        name: fileName,
        path: normalized,
        size: buffer.length,
        mimeType: getMimeType(fileName),
        createdAt: new Date(result.created_at),
        modifiedAt: new Date(result.modified_at),
        metadata: result.metadata,
      });

      return this.successResult(fileItem);
    } catch (error) {
      return this.errorResult(`Upload failed: ${(error as Error).message}`);
    }
  }

  async downloadFile(
    remotePath: string,
    localPath?: string,
    options: DownloadOptions = {}
  ): Promise<OperationResult<Buffer | string>> {
    this.ensureInitialized();

    try {
      const normalized = this.normalizePath(remotePath);
      const buffer = await this.client!.downloadFile(normalized);

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
      return this.errorResult(`Download failed: ${(error as Error).message}`);
    }
  }

  async moveItem(
    sourcePath: string,
    destinationPath: string,
    options: MoveOptions = {}
  ): Promise<OperationResult<FileSystemItem>> {
    this.ensureInitialized();

    try {
      const normalizedSource = this.normalizePath(sourcePath);
      const normalizedDest = this.normalizePath(destinationPath);

      const result = await this.client!.moveFile(normalizedSource, normalizedDest);

      // Convert result to FileSystemItem
      const item = result.is_directory
        ? createFolderItem({
            id: result.id,
            name: this.getBaseName(normalizedDest),
            path: normalizedDest,
            createdAt: new Date(result.created_at),
            modifiedAt: new Date(result.modified_at),
          })
        : createFileItem({
            id: result.id,
            name: this.getBaseName(normalizedDest),
            path: normalizedDest,
            size: result.size,
            mimeType: result.mime_type,
            createdAt: new Date(result.created_at),
            modifiedAt: new Date(result.modified_at),
          });

      return this.successResult(item);
    } catch (error) {
      return this.errorResult(`Move failed: ${(error as Error).message}`);
    }
  }

  async deleteFile(path: string): Promise<OperationResult> {
    this.ensureInitialized();

    try {
      const normalized = this.normalizePath(path);
      await this.client!.deleteFile(normalized);
      return this.successResult();
    } catch (error) {
      return this.errorResult(`Delete failed: ${(error as Error).message}`);
    }
  }

  async renameFile(
    path: string,
    newName: string,
    options: RenameOptions = {}
  ): Promise<OperationResult<FileItem>> {
    this.ensureInitialized();

    try {
      const normalized = this.normalizePath(path);
      const parentPath = this.getParentPath(normalized);
      const newPath = this.joinPath(parentPath, newName);

      const result = await this.client!.renameFile(normalized, newName);

      const fileItem = createFileItem({
        id: result.id,
        name: newName,
        path: newPath,
        size: result.size,
        mimeType: result.mime_type,
        createdAt: new Date(result.created_at),
        modifiedAt: new Date(result.modified_at),
      });

      return this.successResult(fileItem);
    } catch (error) {
      return this.errorResult(`Rename failed: ${(error as Error).message}`);
    }
  }

  async renameFolder(
    path: string,
    newName: string,
    options: RenameOptions = {}
  ): Promise<OperationResult<FolderItem>> {
    this.ensureInitialized();

    try {
      const normalized = this.normalizePath(path);
      const parentPath = this.getParentPath(normalized);
      const newPath = this.joinPath(parentPath, newName);

      const result = await this.client!.renameFolder(normalized, newName);

      const folderItem = createFolderItem({
        id: result.id,
        name: newName,
        path: newPath,
        createdAt: new Date(result.created_at),
        modifiedAt: new Date(result.modified_at),
      });

      return this.successResult(folderItem);
    } catch (error) {
      return this.errorResult(`Rename failed: ${(error as Error).message}`);
    }
  }

  async listDirectory(
    path: string,
    options: ListOptions = {}
  ): Promise<OperationResult<FileSystemItem[]>> {
    this.ensureInitialized();

    try {
      const normalized = this.normalizePath(path);
      const files = await this.client!.listFiles(normalized);

      const items: FileSystemItem[] = files.map(file => {
        const itemPath = this.joinPath(normalized, file.name);

        if (file.is_directory) {
          return createFolderItem({
            id: file.id,
            name: file.name,
            path: itemPath,
            createdAt: new Date(file.created_at),
            modifiedAt: new Date(file.modified_at),
          });
        }

        return createFileItem({
          id: file.id,
          name: file.name,
          path: itemPath,
          size: file.size,
          mimeType: file.mime_type || getMimeType(file.name),
          createdAt: new Date(file.created_at),
          modifiedAt: new Date(file.modified_at),
        });
      });

      // Apply filter if provided
      const filtered = options.filter
        ? items.filter(options.filter)
        : items;

      return this.successResult(filtered);
    } catch (error) {
      return this.errorResult(`List failed: ${(error as Error).message}`);
    }
  }

  async getItem(path: string): Promise<OperationResult<FileSystemItem>> {
    this.ensureInitialized();

    try {
      const normalized = this.normalizePath(path);
      const info = await this.client!.getFileInfo(normalized);

      const item = info.is_directory
        ? createFolderItem({
            id: info.id,
            name: this.getBaseName(normalized),
            path: normalized,
            createdAt: new Date(info.created_at),
            modifiedAt: new Date(info.modified_at),
          })
        : createFileItem({
            id: info.id,
            name: this.getBaseName(normalized),
            path: normalized,
            size: info.size,
            mimeType: info.mime_type,
            createdAt: new Date(info.created_at),
            modifiedAt: new Date(info.modified_at),
          });

      return this.successResult(item);
    } catch (error) {
      return this.errorResult(`Get item failed: ${(error as Error).message}`);
    }
  }

  async exists(path: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      const normalized = this.normalizePath(path);
      return await this.client!.fileExists(normalized);
    } catch {
      return false;
    }
  }
}

// Factory function
export function createMyStorageModule(): MyStorageModule {
  return new MyStorageModule();
}

// Export types
export type { MyStorageConfig } from './types';
```

### Step 5: Register Module

```typescript
// src/modules/index.ts
import { createMyStorageModule } from './my-storage';

// Register module
registerModule('my_storage', createMyStorageModule);

// Export
export { MyStorageModule, createMyStorageModule } from './my-storage';
export type { MyStorageConfig } from './my-storage/types';
```

### Step 6: Update Package Exports

```typescript
// src/index.ts
export {
  MyStorageModule,
  createMyStorageModule,
} from './modules';

export type { MyStorageConfig } from './modules';
```

## Interface Reference

### Required Methods

Every storage module must implement these methods:

```typescript
interface StorageModule {
  // Lifecycle
  readonly provider: StorageProvider;
  initialize(config: HazoFilesConfig): Promise<void>;

  // Directory operations
  createDirectory(path: string): Promise<OperationResult<FolderItem>>;
  removeDirectory(path: string, recursive?: boolean): Promise<OperationResult>;

  // File operations
  uploadFile(source, remotePath, options?): Promise<OperationResult<FileItem>>;
  downloadFile(remotePath, localPath?, options?): Promise<OperationResult<Buffer | string>>;
  moveItem(sourcePath, destinationPath, options?): Promise<OperationResult<FileSystemItem>>;
  deleteFile(path: string): Promise<OperationResult>;
  renameFile(path, newName, options?): Promise<OperationResult<FileItem>>;
  renameFolder(path, newName, options?): Promise<OperationResult<FolderItem>>;

  // Query operations
  listDirectory(path, options?): Promise<OperationResult<FileSystemItem[]>>;
  getItem(path: string): Promise<OperationResult<FileSystemItem>>;
  exists(path: string): Promise<boolean>;
  getFolderTree(path?, depth?): Promise<OperationResult<TreeNode[]>>;
}
```

### BaseStorageModule Utilities

Available protected methods from `BaseStorageModule`:

```typescript
// Configuration
protected ensureInitialized(): void
protected getProviderConfig<T>(): T

// Path utilities
protected normalizePath(path: string): string
protected joinPath(...segments: string[]): string
protected getBaseName(path: string): string
protected getParentPath(path: string): string

// Result helpers
protected successResult<T>(data?: T): OperationResult<T>
protected errorResult(error: string): OperationResult

// Tree building (can override for optimization)
protected async buildTree(path, maxDepth, currentDepth): Promise<TreeNode[]>
```

## Best Practices

### 1. Path Normalization

Always normalize paths at the start of each operation:

```typescript
async uploadFile(source, remotePath, options?): Promise<OperationResult<FileItem>> {
  this.ensureInitialized();
  const normalized = this.normalizePath(remotePath); // ← Always do this first
  // Rest of implementation
}
```

### 2. Error Handling

Use try-catch and return OperationResult:

```typescript
async uploadFile(...): Promise<OperationResult<FileItem>> {
  try {
    // Implementation
    return this.successResult(fileItem);
  } catch (error) {
    if (error instanceof MySpecificError) {
      return this.errorResult(error.message);
    }
    return this.errorResult(`Unexpected error: ${(error as Error).message}`);
  }
}
```

### 3. Progress Tracking

Call progress callback if provided:

```typescript
if (options?.onProgress) {
  // During upload/download
  options.onProgress(
    (bytesTransferred / totalBytes) * 100,
    bytesTransferred,
    totalBytes
  );
}
```

### 4. Source Type Handling

Handle all three source types in uploadFile:

```typescript
async uploadFile(source, remotePath, options?): Promise<OperationResult<FileItem>> {
  let buffer: Buffer;

  if (typeof source === 'string') {
    // File path
    buffer = await fs.promises.readFile(source);
  } else if (Buffer.isBuffer(source)) {
    // Already a buffer
    buffer = source;
  } else {
    // ReadableStream
    buffer = await streamToBuffer(source);
  }

  // Use buffer for upload
}
```

### 5. Metadata Preservation

Include provider-specific metadata:

```typescript
const fileItem = createFileItem({
  id: apiResult.id,
  name: fileName,
  path: normalized,
  size: apiResult.size,
  mimeType: apiResult.mimeType || getMimeType(fileName),
  createdAt: new Date(apiResult.createdAt),
  modifiedAt: new Date(apiResult.modifiedAt),
  metadata: {
    // Provider-specific metadata
    storageClass: apiResult.storageClass,
    etag: apiResult.etag,
    versionId: apiResult.versionId,
  },
});
```

### 6. Configuration Validation

Validate configuration in initialize():

```typescript
async initialize(config: HazoFilesConfig): Promise<void> {
  await super.initialize(config);

  const myConfig = this.getProviderConfig<MyStorageConfig>();

  if (!myConfig.apiKey) {
    throw new ConfigurationError('API key is required');
  }

  if (!myConfig.endpoint) {
    throw new ConfigurationError('Endpoint is required');
  }

  // Initialize client
  this.client = new MyStorageClient(myConfig);
}
```

## Testing

### Unit Tests

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MyStorageModule } from './my-storage';

describe('MyStorageModule', () => {
  let module: MyStorageModule;

  beforeEach(async () => {
    module = new MyStorageModule();
    await module.initialize({
      provider: 'my_storage',
      my_storage: {
        apiKey: 'test-key',
        endpoint: 'https://api.test.com',
      },
    });
  });

  it('should create directory', async () => {
    const result = await module.createDirectory('/test');
    expect(result.success).toBe(true);
    expect(result.data?.name).toBe('test');
  });

  it('should upload file', async () => {
    const buffer = Buffer.from('test content');
    const result = await module.uploadFile(buffer, '/test.txt');
    expect(result.success).toBe(true);
    expect(result.data?.size).toBe(buffer.length);
  });

  // Add more tests...
});
```

### Integration Tests

```typescript
describe('MyStorageModule Integration', () => {
  it('should upload and download file', async () => {
    const module = new MyStorageModule();
    await module.initialize({
      provider: 'my_storage',
      my_storage: {
        apiKey: process.env.MY_STORAGE_API_KEY!,
        endpoint: process.env.MY_STORAGE_ENDPOINT!,
      },
    });

    // Upload
    const content = Buffer.from('Hello, World!');
    const uploadResult = await module.uploadFile(content, '/test.txt');
    expect(uploadResult.success).toBe(true);

    // Download
    const downloadResult = await module.downloadFile('/test.txt');
    expect(downloadResult.success).toBe(true);
    expect(downloadResult.data).toEqual(content);

    // Cleanup
    await module.deleteFile('/test.txt');
  });
});
```

## Examples

### Example 1: AWS S3 Module (Sketch)

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { BaseStorageModule } from 'hazo_files';

export class S3StorageModule extends BaseStorageModule {
  readonly provider = 's3' as StorageProvider;
  private s3Client: S3Client | null = null;
  private bucket: string = '';

  async initialize(config: HazoFilesConfig): Promise<void> {
    await super.initialize(config);
    const s3Config = this.getProviderConfig<S3Config>();

    this.s3Client = new S3Client({
      region: s3Config.region,
      credentials: {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey,
      },
    });

    this.bucket = s3Config.bucket;
  }

  async uploadFile(source, remotePath, options?): Promise<OperationResult<FileItem>> {
    // Convert source to Buffer
    const buffer = await this.sourceToBuffer(source);

    // Upload to S3
    await this.s3Client!.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: remotePath,
      Body: buffer,
    }));

    // Create FileItem
    // Return result
  }

  // Implement other methods...
}
```

### Example 2: Dropbox Module (Sketch)

```typescript
import { Dropbox } from 'dropbox';
import { BaseStorageModule } from 'hazo_files';

export class DropboxStorageModule extends BaseStorageModule {
  readonly provider = 'dropbox' as StorageProvider;
  private dbx: Dropbox | null = null;

  async initialize(config: HazoFilesConfig): Promise<void> {
    await super.initialize(config);
    const dropboxConfig = this.getProviderConfig<DropboxConfig>();

    this.dbx = new Dropbox({
      accessToken: dropboxConfig.accessToken,
    });
  }

  async uploadFile(source, remotePath, options?): Promise<OperationResult<FileItem>> {
    const buffer = await this.sourceToBuffer(source);

    const response = await this.dbx!.filesUpload({
      path: remotePath,
      contents: buffer,
    });

    // Create FileItem from response
    // Return result
  }

  // Implement other methods...
}
```

## Checklist

Use this checklist when creating a new module:

- [ ] Created module file structure
- [ ] Defined configuration interface
- [ ] Extended BaseStorageModule
- [ ] Implemented all required interface methods
- [ ] Added path normalization to all methods
- [ ] Implemented proper error handling with OperationResult
- [ ] Added progress tracking for upload/download
- [ ] Handled all source types (string, Buffer, ReadableStream)
- [ ] Created factory function
- [ ] Registered module
- [ ] Updated package exports
- [ ] Added TypeScript type definitions
- [ ] Wrote unit tests
- [ ] Wrote integration tests
- [ ] Updated documentation
- [ ] Added example usage

## Support

For questions or issues:

- Review existing modules: `src/modules/local` and `src/modules/google-drive`
- Check main documentation: [README.md](../README.md)
- Visit GitHub: [https://github.com/pub12/hazo_files](https://github.com/pub12/hazo_files)

---

Happy module development!
