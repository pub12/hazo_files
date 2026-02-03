/**
 * Hazo Files - Server Entry Point
 *
 * Server-only exports for Node.js environments.
 * Use this entry point when you need full server-side functionality
 * including database tracking, LLM extraction, and file operations.
 *
 * @example
 * ```typescript
 * import {
 *   createHazoFilesServer,
 *   HAZO_FILES_TABLE_SCHEMA,
 *   HAZO_FILES_NAMING_TABLE_SCHEMA
 * } from 'hazo_files/server';
 * ```
 */

// Ensure this module is only used on the server
// The consuming app should install 'server-only' package
try {
  // Dynamic import to avoid bundler issues if package not installed
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('server-only');
} catch {
  // server-only package not installed, skip the check
  // This allows the package to work without the dependency
}

// Factory
export {
  createHazoFilesServer,
  createBasicFileManager,
} from './factory';

export type {
  HazoFilesServerOptions,
  HazoFilesServerInstance,
  HazoLogger,
} from './factory';

// Services
export {
  FileManager,
  createFileManager,
  createInitializedFileManager,
  TrackedFileManager,
  createTrackedFileManager,
  createInitializedTrackedFileManager,
  FileMetadataService,
  createFileMetadataService,
  NamingConventionService,
  createNamingConventionService,
  LLMExtractionService,
  createLLMExtractionService,
  UploadExtractService,
  createUploadExtractService,
} from '../services';

export type {
  FileManagerOptions,
  TrackedFileManagerFullOptions,
  TrackedUploadOptions,
  MetadataLogger,
  CrudServiceLike,
  FileMetadataServiceOptions,
  NamingConventionServiceOptions,
  LLMProvider,
  LLMFactory,
  HazoLLMInstance,
  ExtractionOptions,
  ExtractionResult,
  UploadExtractOptions,
  UploadExtractResult,
  CreateFolderOptions,
} from '../services';

// Schema exports
export {
  HAZO_FILES_TABLE_SCHEMA,
  HAZO_FILES_DEFAULT_TABLE_NAME,
  getSchemaForTable,
  HAZO_FILES_NAMING_TABLE_SCHEMA,
  HAZO_FILES_NAMING_DEFAULT_TABLE_NAME,
  getNamingSchemaForTable,
} from '../schema';

export type {
  HazoFilesTableSchema,
  HazoFilesNamingTableSchema,
  DatabaseSchemaDefinition,
  HazoFilesColumnDefinitions,
  HazoFilesNamingColumnDefinitions,
} from '../schema';

// Modules
export {
  createModule,
  createAndInitializeModule,
  getRegisteredProviders,
  isProviderRegistered,
  registerModule,
  LocalStorageModule,
  createLocalModule,
  GoogleDriveModule,
  createGoogleDriveModule,
  GoogleDriveAuth,
  createGoogleDriveAuth,
} from '../modules';

export type {
  TokenData,
  AuthCallbacks,
  GoogleAuthConfig,
} from '../modules';

// Configuration
export {
  loadConfig,
  loadConfigAsync,
  parseConfig,
  saveConfig,
  generateSampleConfig,
} from '../config';

// Common utilities
export {
  // Utils
  successResult,
  errorResult,
  generateId,
  formatBytes,
  isFile,
  isFolder,
  sortItems,
  filterItems,
  createFileItem,
  createFolderItem,
  // Path utils
  normalizePath,
  joinPath,
  getParentPath,
  getBaseName,
  getDirName,
  getPathSegments,
  isChildPath,
  getRelativePath,
  validatePath,
  sanitizeFilename,
  getExtension,
  getNameWithoutExtension,
  hasExtension,
  getBreadcrumbs,
  // MIME types
  getMimeType,
  getExtensionFromMime,
  isImage,
  isVideo,
  isAudio,
  isText,
  isDocument,
  isPreviewable,
  getFileCategory,
  // Errors
  HazoFilesError,
  FileNotFoundError,
  DirectoryNotFoundError,
  FileExistsError,
  DirectoryExistsError,
  DirectoryNotEmptyError,
  PermissionDeniedError,
  InvalidPathError,
  FileTooLargeError,
  InvalidExtensionError,
  AuthenticationError,
  ConfigurationError,
  OperationError,
  // Naming utilities
  DEFAULT_DATE_FORMATS,
  SYSTEM_DATE_VARIABLES,
  SYSTEM_FILE_VARIABLES,
  SYSTEM_COUNTER_VARIABLES,
  ALL_SYSTEM_VARIABLES,
  formatDateToken,
  isDateVariable,
  isFileMetadataVariable,
  isCounterVariable,
  formatCounter,
  getFileMetadataValues,
  hazo_files_generate_folder_name,
  hazo_files_generate_file_name,
  validateNamingRuleSchema,
  createEmptyNamingRuleSchema,
  generateSegmentId,
  createVariableSegment,
  createLiteralSegment,
  patternToString,
  parsePatternString,
  clonePattern,
  getSystemVariablePreviewValues,
  generatePreviewName,
  // File data utilities
  generateExtractionId,
  createEmptyFileDataStructure,
  hasExtractionStructure,
  validateExtractionData,
  validateFileDataStructure,
  deepMerge,
  parseFileData,
  stringifyFileData,
  recalculateMergedData,
  addExtractionToFileData,
  removeExtractionById,
  removeExtractionByIndex,
  getMergedData,
  getExtractions,
  getExtractionById,
  getExtractionCount,
  clearExtractions,
  updateExtractionById,
  // Hash utilities
  computeFileHash,
  computeFileHashSync,
  computeFileInfo,
  computeFileHashFromStream,
  hashesEqual,
  hasFileContentChanged,
} from '../common';

export type { FileInfo } from '../common/hash-utils';

// Types
export type {
  StorageProvider,
  StorageModule,
  FileItem,
  FolderItem,
  FileSystemItem,
  HazoFilesConfig,
  LocalStorageConfig,
  GoogleDriveConfig,
  OperationResult,
  ProgressCallback,
  UploadOptions,
  DownloadOptions,
  ListOptions,
  MoveOptions,
  RenameOptions,
  TreeNode,
  FileBrowserState,
  // Naming types
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
  // Metadata tracking types
  FileMetadataRecord,
  FileMetadataInput,
  FileMetadataUpdate,
  DatabaseTrackingConfig,
  TrackedFileManagerOptions,
  // Extraction data types
  ExtractionData,
  FileDataStructure,
  AddExtractionOptions,
  RemoveExtractionOptions,
  // Naming convention types
  NamingConventionType,
  NamingConventionRecord,
  NamingConventionInput,
  NamingConventionUpdate,
  ParsedNamingConvention,
  ListNamingConventionsOptions,
} from '../types';
