/**
 * LLM Extraction Service
 * Integrates with hazo_llm_api for document extraction using LLMs
 *
 * Prompts are configurable per call - the consuming app manages prompts
 * via hazo_llm_api's prompt system.
 */

import type { ExtractionData, AddExtractionOptions } from '../types';
import { generateExtractionId } from '../common/file-data-utils';

/**
 * Supported LLM providers
 */
export type LLMProvider = 'gemini' | 'qwen' | 'openai' | 'anthropic';

/**
 * Options for LLM extraction
 */
export interface ExtractionOptions {
  /**
   * Option 1: Use hazo_llm_api prompt lookup
   * Area for the prompt (e.g., 'tax_documents', 'invoices')
   */
  promptArea?: string;

  /**
   * Key for the prompt within the area (e.g., 'extract_w2', 'extract_1099')
   */
  promptKey?: string;

  /**
   * Variables to substitute in the prompt template
   */
  promptVariables?: Record<string, string>;

  /**
   * Option 2: Pass custom prompt directly
   * Raw prompt text (takes precedence over promptArea/promptKey)
   */
  customPrompt?: string;

  /**
   * LLM provider to use (default: 'gemini')
   */
  llmProvider?: LLMProvider;

  /**
   * Model name to use (provider-specific)
   */
  model?: string;

  /**
   * Additional options for the LLM call
   */
  llmOptions?: Record<string, unknown>;
}

/**
 * Result of an extraction operation
 */
export interface ExtractionResult {
  /** Whether extraction was successful */
  success: boolean;
  /** Extracted data (if successful) */
  data?: Record<string, unknown>;
  /** Error message (if failed) */
  error?: string;
  /** Extraction metadata */
  extraction?: ExtractionData;
}

/**
 * Interface for hazo_llm_api LLM instance
 * This matches the expected interface from hazo_llm_api
 */
export interface HazoLLMInstance {
  /** Extract data from content using the configured prompt */
  extract(
    content: string | Buffer,
    options?: {
      mimeType?: string;
      prompt?: string;
      promptArea?: string;
      promptKey?: string;
      promptVariables?: Record<string, string>;
    }
  ): Promise<Record<string, unknown>>;

  /** Process file content with vision capabilities */
  processImage?(
    imageBuffer: Buffer,
    prompt: string,
    options?: Record<string, unknown>
  ): Promise<Record<string, unknown>>;
}

/**
 * Factory function type for creating LLM instances
 */
export type LLMFactory = (provider: LLMProvider, options?: Record<string, unknown>) => HazoLLMInstance | Promise<HazoLLMInstance>;

/**
 * LLM Extraction Service
 *
 * Provides document and image extraction using LLMs.
 * Integrates with hazo_llm_api for multi-provider support.
 *
 * @example
 * ```typescript
 * import { LLMExtractionService } from 'hazo_files';
 * import { createLLM } from 'hazo_llm_api';
 *
 * // Create service with LLM factory
 * const extractionService = new LLMExtractionService((provider, options) => {
 *   return createLLM({ provider, ...options });
 * });
 *
 * // Extract using prompt from hazo_llm_api prompt system
 * const result = await extractionService.extractFromDocument(
 *   pdfBuffer,
 *   'application/pdf',
 *   {
 *     promptArea: 'tax_documents',
 *     promptKey: 'extract_w2',
 *     llmProvider: 'gemini'
 *   }
 * );
 *
 * // Or use a custom prompt
 * const result2 = await extractionService.extractFromDocument(
 *   pdfBuffer,
 *   'application/pdf',
 *   {
 *     customPrompt: 'Extract all names and dates from this document',
 *     llmProvider: 'qwen'
 *   }
 * );
 * ```
 */
export class LLMExtractionService {
  private llmFactory: LLMFactory;
  private defaultProvider: LLMProvider;

  constructor(llmFactory: LLMFactory, defaultProvider: LLMProvider = 'gemini') {
    this.llmFactory = llmFactory;
    this.defaultProvider = defaultProvider;
  }

  /**
   * Extract data from a document
   *
   * @param buffer - Document content as a Buffer
   * @param mimeType - MIME type of the document (e.g., 'application/pdf')
   * @param options - Extraction options including prompt configuration
   * @returns Extraction result with data or error
   */
  async extractFromDocument(
    buffer: Buffer,
    mimeType: string,
    options: ExtractionOptions = {}
  ): Promise<ExtractionResult> {
    try {
      const provider = options.llmProvider || this.defaultProvider;
      const llm = await this.llmFactory(provider, options.llmOptions);

      // Build extraction options
      const extractOptions: Parameters<HazoLLMInstance['extract']>[1] = {
        mimeType,
      };

      if (options.customPrompt) {
        extractOptions.prompt = options.customPrompt;
      } else if (options.promptArea && options.promptKey) {
        extractOptions.promptArea = options.promptArea;
        extractOptions.promptKey = options.promptKey;
        extractOptions.promptVariables = options.promptVariables;
      }

      // Perform extraction
      const data = await llm.extract(buffer, extractOptions);

      // Create extraction metadata
      const extraction: ExtractionData = {
        id: generateExtractionId(),
        extracted_at: new Date().toISOString(),
        source: `${provider}${options.model ? `:${options.model}` : ''}`,
        data,
      };

      return {
        success: true,
        data,
        extraction,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Extraction failed: ${message}`,
      };
    }
  }

  /**
   * Extract data from an image
   *
   * @param buffer - Image content as a Buffer
   * @param mimeType - MIME type of the image (e.g., 'image/png', 'image/jpeg')
   * @param options - Extraction options including prompt configuration
   * @returns Extraction result with data or error
   */
  async extractFromImage(
    buffer: Buffer,
    mimeType: string,
    options: ExtractionOptions = {}
  ): Promise<ExtractionResult> {
    try {
      const provider = options.llmProvider || this.defaultProvider;
      const llm = await this.llmFactory(provider, options.llmOptions);

      // Determine prompt
      let prompt: string;
      if (options.customPrompt) {
        prompt = options.customPrompt;
      } else if (options.promptArea && options.promptKey) {
        // For images, we might need to use the extract method if available
        // or fall back to processImage with a constructed prompt
        const extractOptions = {
          mimeType,
          promptArea: options.promptArea,
          promptKey: options.promptKey,
          promptVariables: options.promptVariables,
        };
        const data = await llm.extract(buffer, extractOptions);

        const extraction: ExtractionData = {
          id: generateExtractionId(),
          extracted_at: new Date().toISOString(),
          source: `${provider}${options.model ? `:${options.model}` : ''}`,
          data,
        };

        return {
          success: true,
          data,
          extraction,
        };
      } else {
        prompt = 'Extract all relevant information from this image.';
      }

      // Try processImage if available, otherwise use extract
      let data: Record<string, unknown>;
      if (llm.processImage) {
        data = await llm.processImage(buffer, prompt, options.llmOptions);
      } else {
        data = await llm.extract(buffer, { mimeType, prompt });
      }

      const extraction: ExtractionData = {
        id: generateExtractionId(),
        extracted_at: new Date().toISOString(),
        source: `${provider}${options.model ? `:${options.model}` : ''}`,
        data,
      };

      return {
        success: true,
        data,
        extraction,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Image extraction failed: ${message}`,
      };
    }
  }

  /**
   * Extract with automatic type detection based on MIME type
   */
  async extract(
    buffer: Buffer,
    mimeType: string,
    options: ExtractionOptions = {}
  ): Promise<ExtractionResult> {
    if (mimeType.startsWith('image/')) {
      return this.extractFromImage(buffer, mimeType, options);
    }
    return this.extractFromDocument(buffer, mimeType, options);
  }

  /**
   * Create ExtractionData from raw extracted data
   * Useful when you perform extraction outside this service
   */
  createExtractionData(
    data: Record<string, unknown>,
    source?: string,
    options?: AddExtractionOptions
  ): ExtractionData {
    return {
      id: options?.id || generateExtractionId(),
      extracted_at: new Date().toISOString(),
      source: source || options?.source,
      data,
    };
  }
}

/**
 * Create an LLMExtractionService instance
 *
 * @param llmFactory - Factory function for creating LLM instances
 * @param defaultProvider - Default LLM provider (default: 'gemini')
 */
export function createLLMExtractionService(
  llmFactory: LLMFactory,
  defaultProvider?: LLMProvider
): LLMExtractionService {
  return new LLMExtractionService(llmFactory, defaultProvider);
}
