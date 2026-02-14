/**
 * Hazo Files - File Management Package
 * Supports local storage and Google Drive with a unified API
 */

// Main service
export {
  FileManager,
  createFileManager,
  createInitializedFileManager,
  // Tracked file manager with database support
  TrackedFileManager,
  createTrackedFileManager,
  createInitializedTrackedFileManager,
  // File metadata service
  FileMetadataService,
  createFileMetadataService,
  // Naming convention service
  NamingConventionService,
  createNamingConventionService,
  // LLM extraction service
  LLMExtractionService,
  createLLMExtractionService,
  // Upload + extract service
  UploadExtractService,
  createUploadExtractService,
} from './services';

// Configuration
export {
  loadConfig,
  loadConfigAsync,
  parseConfig,
  saveConfig,
  generateSampleConfig,
} from './config';

// Schema exports for database setup
export {
  HAZO_FILES_TABLE_SCHEMA,
  HAZO_FILES_DEFAULT_TABLE_NAME,
  getSchemaForTable,
  HAZO_FILES_NAMING_TABLE_SCHEMA,
  HAZO_FILES_NAMING_DEFAULT_TABLE_NAME,
  getNamingSchemaForTable,
  HAZO_FILES_MIGRATION_V2,
  getMigrationForTable,
} from './schema';

// Migration utilities
export {
  migrateToV2,
  backfillV2Defaults,
} from './migrations';

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
} from './modules';

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
  // File data utilities (extraction management)
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
  // Reference tracking utilities
  generateRefId,
  parseFileRefs,
  stringifyFileRefs,
  createFileRef,
  removeRefFromArray,
  removeRefsByCriteriaFromArray,
  toV2Record,
  buildFileWithStatus,
} from './common';

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
  // Reference tracking types
  FileStatus,
  FileRefVisibility,
  FileRef,
  FileMetadataRecordV2,
  AddRefOptions,
  RemoveRefsCriteria,
  FileWithStatus,
  FindOrphanedOptions,
  CleanupOrphanedOptions,
  UploadWithRefOptions,
} from './types';

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
} from './services';
export type { TokenData, AuthCallbacks, GoogleAuthConfig } from './modules';
export type {
  HazoFilesTableSchema,
  HazoFilesNamingTableSchema,
  DatabaseSchemaDefinition,
  HazoFilesColumnDefinitions,
  HazoFilesNamingColumnDefinitions,
  HazoFilesMigrationV2,
  MigrationSchemaDefinition,
} from './schema';
export type { MigrationExecutor } from './migrations';
export type { FileInfo } from './common/hash-utils';
