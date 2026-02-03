/**
 * Upload + Extract Service
 * Combined workflow for uploading files with optional LLM extraction and naming convention application
 */

import type { FileItem, FolderItem, OperationResult } from '../types';
import type { NamingRuleSchema, NamingVariable, GeneratedNameResult } from '../types/naming';
import type { ExtractionData } from '../types/metadata';
import type { TrackedFileManager, TrackedUploadOptions } from './tracked-file-manager';
import type { LLMExtractionService, ExtractionOptions, ExtractionResult } from './llm-extraction-service';
import type { NamingConventionService } from './naming-convention-service';
import { hazo_files_generate_file_name, hazo_files_generate_folder_name } from '../common/naming-utils';
import { getMimeType } from '../common/mime-types';
import { joinPath } from '../common/path-utils';

/**
 * Options for upload with extraction
 */
export interface UploadExtractOptions extends TrackedUploadOptions {
  /**
   * Whether to extract data from the file
   */
  extract?: boolean;

  /**
   * Options for LLM extraction
   */
  extractionOptions?: ExtractionOptions;

  /**
   * Naming convention ID to apply
   */
  namingConventionId?: string;

  /**
   * Direct naming schema (alternative to namingConventionId)
   */
  namingSchema?: NamingRuleSchema;

  /**
   * Variables to use for naming pattern generation
   */
  namingVariables?: Record<string, string>;

  /**
   * User-defined variables for the naming convention
   */
  userVariables?: NamingVariable[];

  /**
   * Base path where file should be uploaded
   * The generated folder path is appended to this
   */
  basePath?: string;

  /**
   * Counter value for {counter} variable
   */
  counterValue?: number;

  /**
   * Whether to create the folder path if it doesn't exist
   */
  createFolders?: boolean;
}

/**
 * Result of upload with extraction
 */
export interface UploadExtractResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Uploaded file item */
  file?: FileItem;
  /** Extracted data if extraction was performed */
  extraction?: ExtractionData;
  /** Generated file path */
  generatedPath?: string;
  /** Generated folder path (without file name) */
  generatedFolderPath?: string;
  /** Original file name before renaming */
  originalFileName?: string;
}

/**
 * Options for creating folders from naming convention
 */
export interface CreateFolderOptions {
  /**
   * Base path to prepend to generated path
   */
  basePath?: string;

  /**
   * Whether to create nested folders recursively
   */
  recursive?: boolean;
}

/**
 * Upload + Extract Service
 *
 * Provides a combined workflow for:
 * 1. Uploading files with tracking
 * 2. Optionally extracting data using LLM
 * 3. Applying naming conventions to generate file/folder names
 *
 * @example
 * ```typescript
 * import { UploadExtractService } from 'hazo_files';
 *
 * const uploadExtract = new UploadExtractService(
 *   trackedFileManager,
 *   namingService,
 *   extractionService
 * );
 *
 * // Upload with extraction and naming convention
 * const result = await uploadExtract.uploadWithExtract(
 *   pdfBuffer,
 *   'quarterly-report.pdf',
 *   {
 *     extract: true,
 *     extractionOptions: {
 *       promptArea: 'reports',
 *       promptKey: 'extract_summary'
 *     },
 *     namingConventionId: 'reports-convention-id',
 *     namingVariables: { client_id: 'ACME', project: 'Q4' },
 *     basePath: '/documents',
 *     createFolders: true
 *   }
 * );
 *
 * console.log(result.generatedPath); // '/documents/ACME/2024/Q4/quarterly-report_001.pdf'
 * console.log(result.extraction?.data); // { summary: '...', total: 50000 }
 * ```
 */
export class UploadExtractService {
  private fileManager: TrackedFileManager;
  private namingService?: NamingConventionService;
  private extractionService?: LLMExtractionService;

  constructor(
    fileManager: TrackedFileManager,
    namingService?: NamingConventionService,
    extractionService?: LLMExtractionService
  ) {
    this.fileManager = fileManager;
    this.namingService = namingService;
    this.extractionService = extractionService;
  }

  /**
   * Upload a file with optional extraction and naming convention
   */
  async uploadWithExtract(
    source: Buffer,
    originalFileName: string,
    options: UploadExtractOptions = {}
  ): Promise<UploadExtractResult> {
    try {
      const mimeType = getMimeType(originalFileName);
      let extractionResult: ExtractionResult | undefined;
      let extractionData: ExtractionData | undefined;

      // Step 1: Extract data if requested
      if (options.extract && this.extractionService && options.extractionOptions) {
        extractionResult = await this.extractionService.extract(
          source,
          mimeType,
          options.extractionOptions
        );

        if (extractionResult.success && extractionResult.extraction) {
          extractionData = extractionResult.extraction;
        }
      }

      // Step 2: Determine naming schema
      let namingSchema: NamingRuleSchema | undefined;
      // userVariables from the convention - stored for potential future use
      let _userVariables: NamingVariable[] = options.userVariables || [];

      if (options.namingSchema) {
        namingSchema = options.namingSchema;
      } else if (options.namingConventionId && this.namingService) {
        const convention = await this.namingService.getByIdParsed(options.namingConventionId);
        if (convention) {
          namingSchema = convention.schema;
          _userVariables = convention.variables;
        }
      }
      void _userVariables; // Mark as intentionally unused for now

      // Step 3: Generate file and folder names
      let generatedFileName = originalFileName;
      let generatedFolderPath = '';
      let finalPath = options.basePath || '/';

      if (namingSchema) {
        const namingVariables = options.namingVariables || {};

        // Generate folder name
        const folderResult = hazo_files_generate_folder_name(namingSchema, namingVariables, {
          counterValue: options.counterValue,
        });

        if (folderResult.success && folderResult.name) {
          generatedFolderPath = folderResult.name;
          finalPath = joinPath(finalPath, generatedFolderPath);
        }

        // Generate file name
        const fileResult = hazo_files_generate_file_name(
          namingSchema,
          namingVariables,
          originalFileName,
          {
            counterValue: options.counterValue,
            preserveExtension: true,
          }
        );

        if (fileResult.success && fileResult.name) {
          generatedFileName = fileResult.name;
        }
      }

      // Step 4: Create folders if requested
      if (options.createFolders && generatedFolderPath) {
        const folderPath = options.basePath
          ? joinPath(options.basePath, generatedFolderPath)
          : generatedFolderPath.startsWith('/')
            ? generatedFolderPath
            : '/' + generatedFolderPath;

        const folderResult = await this.fileManager.ensureDirectory(folderPath);
        if (!folderResult.success) {
          return {
            success: false,
            error: `Failed to create folder: ${folderResult.error}`,
            originalFileName,
          };
        }
      }

      // Step 5: Build final path
      const fullPath = joinPath(finalPath, generatedFileName);

      // Step 6: Prepare metadata with extraction data
      const metadata: Record<string, unknown> = {
        ...(options.metadata || {}),
        original_filename: originalFileName,
      };

      if (extractionData) {
        metadata.extraction_id = extractionData.id;
        metadata.extraction_source = extractionData.source;
      }

      // Step 7: Upload file
      // When extraction is enabled, use awaitRecording to ensure the database record
      // exists before we try to add extraction data in Step 8.
      const uploadResult = await this.fileManager.uploadFile(source, fullPath, {
        ...options,
        metadata,
        awaitRecording: !!extractionData, // Await recording when extraction needs to be added
      });

      if (!uploadResult.success) {
        return {
          success: false,
          error: uploadResult.error,
          originalFileName,
        };
      }

      // Step 8: Add extraction to file metadata if tracking is enabled
      // Since we used awaitRecording: true above, the record is guaranteed to exist
      if (extractionData && this.fileManager.isTrackingActive()) {
        const metadataService = this.fileManager.getMetadataService();
        if (metadataService) {
          const storageType = this.fileManager.getProvider() || 'local';
          await metadataService.addExtraction(
            fullPath,
            storageType,
            extractionData.data,
            {
              id: extractionData.id,
              source: extractionData.source,
            }
          );
        }
      }

      return {
        success: true,
        file: uploadResult.data!,
        extraction: extractionData,
        generatedPath: fullPath,
        generatedFolderPath: generatedFolderPath || undefined,
        originalFileName,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Upload with extract failed: ${message}`,
        originalFileName,
      };
    }
  }

  /**
   * Create a folder structure from a naming convention
   *
   * @param namingConventionId - ID of the naming convention to use
   * @param variables - Variables to substitute in the folder pattern
   * @param options - Additional options
   * @returns Operation result with created folder
   */
  async createFolderFromConvention(
    namingConventionId: string,
    variables: Record<string, string>,
    options: CreateFolderOptions = {}
  ): Promise<OperationResult<FolderItem>> {
    if (!this.namingService) {
      return {
        success: false,
        error: 'Naming service not configured',
      };
    }

    try {
      const convention = await this.namingService.getByIdParsed(namingConventionId);
      if (!convention) {
        return {
          success: false,
          error: `Naming convention not found: ${namingConventionId}`,
        };
      }

      // Generate folder path
      const result = hazo_files_generate_folder_name(convention.schema, variables);
      if (!result.success || !result.name) {
        return {
          success: false,
          error: result.error || 'Failed to generate folder name',
        };
      }

      // Build full path
      const fullPath = options.basePath
        ? joinPath(options.basePath, result.name)
        : result.name.startsWith('/')
          ? result.name
          : '/' + result.name;

      // Create folder
      if (options.recursive !== false) {
        return this.fileManager.ensureDirectory(fullPath);
      } else {
        return this.fileManager.createDirectory(fullPath);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to create folder from convention: ${message}`,
      };
    }
  }

  /**
   * Generate a file path from a naming convention without uploading
   * Useful for previewing the path before upload
   */
  async generatePath(
    originalFileName: string,
    namingConventionId: string,
    variables: Record<string, string>,
    options: { basePath?: string; counterValue?: number } = {}
  ): Promise<GeneratedNameResult & { fullPath?: string; folderPath?: string }> {
    if (!this.namingService) {
      return {
        success: false,
        error: 'Naming service not configured',
      };
    }

    const convention = await this.namingService.getByIdParsed(namingConventionId);
    if (!convention) {
      return {
        success: false,
        error: `Naming convention not found: ${namingConventionId}`,
      };
    }

    // Generate folder path
    const folderResult = hazo_files_generate_folder_name(convention.schema, variables, {
      counterValue: options.counterValue,
    });

    // Generate file name
    const fileResult = hazo_files_generate_file_name(
      convention.schema,
      variables,
      originalFileName,
      {
        counterValue: options.counterValue,
        preserveExtension: true,
      }
    );

    if (!fileResult.success) {
      return fileResult;
    }

    const basePath = options.basePath || '/';
    const folderPath = folderResult.success && folderResult.name ? folderResult.name : '';
    const fullPath = joinPath(basePath, folderPath, fileResult.name!);

    return {
      success: true,
      name: fileResult.name,
      fullPath,
      folderPath: folderPath || undefined,
    };
  }

  /**
   * Get the file manager
   */
  getFileManager(): TrackedFileManager {
    return this.fileManager;
  }

  /**
   * Get the naming service
   */
  getNamingService(): NamingConventionService | undefined {
    return this.namingService;
  }

  /**
   * Get the extraction service
   */
  getExtractionService(): LLMExtractionService | undefined {
    return this.extractionService;
  }
}

/**
 * Create an UploadExtractService instance
 */
export function createUploadExtractService(
  fileManager: TrackedFileManager,
  namingService?: NamingConventionService,
  extractionService?: LLMExtractionService
): UploadExtractService {
  return new UploadExtractService(fileManager, namingService, extractionService);
}
