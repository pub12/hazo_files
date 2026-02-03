/**
 * Server Factory
 * Creates fully-configured hazo_files instances with integration support
 *
 * Integrates with:
 * - hazo_connect: Database adapter
 * - hazo_config: Configuration management
 * - hazo_logs: Logging
 * - hazo_llm_api: LLM extraction
 */

import type { HazoFilesConfig, FileMetadataRecord } from '../types';
import type { NamingConventionRecord } from '../types/naming-convention';
import {
  TrackedFileManager,
  createInitializedTrackedFileManager,
  TrackedFileManagerFullOptions,
} from '../services/tracked-file-manager';
import { FileMetadataService, CrudServiceLike } from '../services/file-metadata-service';
import { NamingConventionService } from '../services/naming-convention-service';
import { LLMExtractionService, LLMFactory, LLMProvider } from '../services/llm-extraction-service';
import { UploadExtractService } from '../services/upload-extract-service';

/**
 * Logger interface compatible with hazo_logs PackageLogger
 */
export interface HazoLogger {
  debug?(message: string, data?: Record<string, unknown>): void;
  info?(message: string, data?: Record<string, unknown>): void;
  warn?(message: string, data?: Record<string, unknown>): void;
  error?(message: string, data?: Record<string, unknown>): void;
}

/**
 * Options for creating a hazo_files server instance
 */
export interface HazoFilesServerOptions {
  /**
   * hazo_connect adapter for database operations
   * If provided, enables database tracking
   */
  crudService?: CrudServiceLike<FileMetadataRecord>;

  /**
   * CRUD service for naming conventions table
   * Required if you want to use NamingConventionService
   */
  namingCrudService?: CrudServiceLike<NamingConventionRecord>;

  /**
   * File storage configuration
   */
  config?: HazoFilesConfig;

  /**
   * Logger instance (compatible with hazo_logs)
   */
  logger?: HazoLogger;

  /**
   * Enable LLM extraction features
   * Requires llmFactory to be provided
   */
  enableExtraction?: boolean;

  /**
   * Factory function for creating LLM instances
   * Required if enableExtraction is true
   */
  llmFactory?: LLMFactory;

  /**
   * Default LLM provider for extraction
   */
  defaultLLMProvider?: LLMProvider;

  /**
   * Table name for file metadata (default: 'hazo_files')
   */
  metadataTableName?: string;

  /**
   * Table name for naming conventions (default: 'hazo_files_naming')
   */
  namingTableName?: string;

  /**
   * Enable tracking of file operations in database
   */
  enableTracking?: boolean;

  /**
   * Track download/access operations
   */
  trackDownloads?: boolean;
}

/**
 * Result of createHazoFilesServer
 */
export interface HazoFilesServerInstance {
  /** File manager with database tracking */
  fileManager: TrackedFileManager;

  /** Metadata service for direct database access */
  metadataService: FileMetadataService | null;

  /** Naming convention service */
  namingService: NamingConventionService | null;

  /** LLM extraction service (if enabled) */
  extractionService: LLMExtractionService | null;

  /** Combined upload + extract service */
  uploadExtractService: UploadExtractService;
}

/**
 * Create a fully-configured hazo_files server instance
 *
 * This factory creates all the services needed for server-side file management
 * with optional database tracking, naming conventions, and LLM extraction.
 *
 * @example Basic usage with hazo_connect
 * ```typescript
 * import { createHazoConnect, createCrudService } from 'hazo_connect/server';
 * import { createHazoFilesServer, HAZO_FILES_TABLE_SCHEMA } from 'hazo_files/server';
 *
 * // Create database adapter
 * const adapter = createHazoConnect({ type: 'sqlite', sqlite: { database_path: './data.db' } });
 * const fileCrud = createCrudService(adapter, HAZO_FILES_TABLE_SCHEMA.tableName);
 *
 * // Create hazo_files server
 * const { fileManager, uploadExtractService } = await createHazoFilesServer({
 *   crudService: fileCrud,
 *   config: { provider: 'local', local: { basePath: './files' } },
 *   enableTracking: true
 * });
 *
 * // Upload a file
 * await fileManager.uploadFile(buffer, '/documents/report.pdf');
 * ```
 *
 * @example With naming conventions and extraction
 * ```typescript
 * import { createHazoFilesServer } from 'hazo_files/server';
 * import { createLLM } from 'hazo_llm_api';
 *
 * const { uploadExtractService } = await createHazoFilesServer({
 *   crudService: fileCrud,
 *   namingCrudService: namingCrud,
 *   config: { provider: 'local', local: { basePath: './files' } },
 *   enableTracking: true,
 *   enableExtraction: true,
 *   llmFactory: (provider) => createLLM({ provider })
 * });
 *
 * // Upload with extraction and naming convention
 * const result = await uploadExtractService.uploadWithExtract(
 *   pdfBuffer,
 *   'report.pdf',
 *   {
 *     extract: true,
 *     extractionOptions: { promptArea: 'reports', promptKey: 'summary' },
 *     namingConventionId: 'reports-convention',
 *     namingVariables: { client: 'ACME' }
 *   }
 * );
 * ```
 */
export async function createHazoFilesServer(
  options: HazoFilesServerOptions = {}
): Promise<HazoFilesServerInstance> {
  const {
    crudService,
    namingCrudService,
    config,
    logger,
    enableExtraction = false,
    llmFactory,
    defaultLLMProvider = 'gemini',
    metadataTableName = 'hazo_files',
    namingTableName = 'hazo_files_naming',
    enableTracking = !!crudService,
    trackDownloads = true,
  } = options;

  // Build file manager options
  const fileManagerOptions: TrackedFileManagerFullOptions = {
    config,
    crudService,
    tracking: {
      enabled: enableTracking,
      tableName: metadataTableName,
      trackDownloads,
      logErrors: true,
    },
  };

  // Create and initialize file manager
  const fileManager = await createInitializedTrackedFileManager(fileManagerOptions);

  // Get metadata service from file manager
  const metadataService = fileManager.getMetadataService();

  // Create naming convention service if CRUD is provided
  let namingService: NamingConventionService | null = null;
  if (namingCrudService) {
    namingService = new NamingConventionService(namingCrudService, {
      tableName: namingTableName,
      logger,
      logErrors: true,
    });
  }

  // Create extraction service if enabled and factory is provided
  let extractionService: LLMExtractionService | null = null;
  if (enableExtraction && llmFactory) {
    extractionService = new LLMExtractionService(llmFactory, defaultLLMProvider);
  }

  // Create upload + extract service
  const uploadExtractService = new UploadExtractService(
    fileManager,
    namingService || undefined,
    extractionService || undefined
  );

  return {
    fileManager,
    metadataService,
    namingService,
    extractionService,
    uploadExtractService,
  };
}

/**
 * Simplified factory for basic file management without all integrations
 */
export async function createBasicFileManager(
  config: HazoFilesConfig,
  crudService?: CrudServiceLike<FileMetadataRecord>
): Promise<TrackedFileManager> {
  return createInitializedTrackedFileManager({
    config,
    crudService,
    tracking: crudService
      ? {
          enabled: true,
          trackDownloads: true,
          logErrors: true,
        }
      : undefined,
  });
}
