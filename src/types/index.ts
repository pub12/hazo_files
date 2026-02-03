/**
 * Core types for the hazo_files package
 */

/** Supported storage provider types */
export type StorageProvider = 'local' | 'google_drive';

/** File item representing a file in storage */
export interface FileItem {
  id: string;
  name: string;
  path: string;
  size: number;
  mimeType: string;
  createdAt: Date;
  modifiedAt: Date;
  isDirectory: false;
  parentId?: string;
  metadata?: Record<string, unknown>;
}

/** Folder item representing a directory in storage */
export interface FolderItem {
  id: string;
  name: string;
  path: string;
  createdAt: Date;
  modifiedAt: Date;
  isDirectory: true;
  parentId?: string;
  children?: (FileItem | FolderItem)[];
  metadata?: Record<string, unknown>;
}

/** Union type for file system items */
export type FileSystemItem = FileItem | FolderItem;

/** Configuration for the file manager */
export interface HazoFilesConfig {
  provider: StorageProvider;
  local?: LocalStorageConfig;
  google_drive?: GoogleDriveConfig;
}

/** Local storage specific configuration */
export interface LocalStorageConfig {
  basePath: string;
  allowedExtensions?: string[];
  maxFileSize?: number;
}

/** Google Drive specific configuration */
export interface GoogleDriveConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  refreshToken?: string;
  accessToken?: string;
  rootFolderId?: string;
}

/** Result of file operations */
export interface OperationResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

/** Progress callback for upload/download operations */
export type ProgressCallback = (progress: number, bytesTransferred: number, totalBytes: number) => void;

/** Options for upload operations */
export interface UploadOptions {
  overwrite?: boolean;
  onProgress?: ProgressCallback;
  metadata?: Record<string, unknown>;
}

/** Options for download operations */
export interface DownloadOptions {
  onProgress?: ProgressCallback;
}

/** Options for list operations */
export interface ListOptions {
  recursive?: boolean;
  includeHidden?: boolean;
  filter?: (item: FileSystemItem) => boolean;
}

/** Options for move operations */
export interface MoveOptions {
  overwrite?: boolean;
}

/** Options for rename operations */
export interface RenameOptions {
  overwrite?: boolean;
}

/** Tree node for folder tree representation */
export interface TreeNode {
  id: string;
  name: string;
  path: string;
  children: TreeNode[];
  isExpanded?: boolean;
  isLoading?: boolean;
}

/** UI State for the file browser */
export interface FileBrowserState {
  currentPath: string;
  selectedItem: FileSystemItem | null;
  tree: TreeNode[];
  files: FileSystemItem[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Interface that all storage modules must implement
 */
export interface StorageModule {
  /** Provider identifier */
  readonly provider: StorageProvider;

  /** Initialize the module with configuration */
  initialize(config: HazoFilesConfig): Promise<void>;

  /** Create a directory */
  createDirectory(path: string): Promise<OperationResult<FolderItem>>;

  /** Remove a directory */
  removeDirectory(path: string, recursive?: boolean): Promise<OperationResult>;

  /** Upload/save a file */
  uploadFile(
    localPath: string | Buffer | ReadableStream,
    remotePath: string,
    options?: UploadOptions
  ): Promise<OperationResult<FileItem>>;

  /** Download a file */
  downloadFile(
    remotePath: string,
    localPath?: string,
    options?: DownloadOptions
  ): Promise<OperationResult<Buffer | string>>;

  /** Move a file or folder */
  moveItem(
    sourcePath: string,
    destinationPath: string,
    options?: MoveOptions
  ): Promise<OperationResult<FileSystemItem>>;

  /** Delete a file */
  deleteFile(path: string): Promise<OperationResult>;

  /** Rename a file */
  renameFile(path: string, newName: string, options?: RenameOptions): Promise<OperationResult<FileItem>>;

  /** Rename a folder */
  renameFolder(path: string, newName: string, options?: RenameOptions): Promise<OperationResult<FolderItem>>;

  /** List contents of a directory */
  listDirectory(path: string, options?: ListOptions): Promise<OperationResult<FileSystemItem[]>>;

  /** Get item info */
  getItem(path: string): Promise<OperationResult<FileSystemItem>>;

  /** Check if item exists */
  exists(path: string): Promise<boolean>;

  /** Get folder tree structure */
  getFolderTree(path?: string, depth?: number): Promise<OperationResult<TreeNode[]>>;
}

// Naming rule types
export type {
  VariableCategory,
  NamingVariable,
  PatternSegment,
  NamingRuleSchema,
  GeneratedNameResult,
  NameGenerationOptions,
  NamingRuleHistoryEntry,
  NamingRuleConfiguratorProps,
  UseNamingRuleState,
  UseNamingRuleActions,
  UseNamingRuleReturn,
} from './naming';

// Metadata tracking types
export type {
  FileMetadataRecord,
  FileMetadataInput,
  FileMetadataUpdate,
  DatabaseTrackingConfig,
  TrackedFileManagerOptions,
  ExtractionData,
  FileDataStructure,
  AddExtractionOptions,
  RemoveExtractionOptions,
} from './metadata';

// Naming convention types
export type {
  NamingConventionType,
  NamingConventionRecord,
  NamingConventionInput,
  NamingConventionUpdate,
  ParsedNamingConvention,
  ListNamingConventionsOptions,
} from './naming-convention';
