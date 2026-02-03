/**
 * Upload + Extract API route
 * Handles file uploads with optional naming conventions and LLM extraction
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTrackedFileManager } from '@/lib/file-manager';
import { initializeDatabase, getNamingCrudService, getPromptsCrudService } from '@/config/database';
import {
  NamingConventionService,
  UploadExtractService,
  LLMExtractionService,
} from 'hazo_files';
import type { TrackedFileManager, HazoLLMInstance, LLMFactory } from 'hazo_files';
import {
  initialize_llm_api,
  hazo_llm_document_text,
  hazo_llm_image_text,
  is_initialized,
} from 'hazo_llm_api/server';
import type { CrudService } from 'hazo_connect/server';

interface PromptRecord {
  id: string;
  prompt_area: string;
  prompt_key: string;
  prompt_text_head?: string;
  prompt_text_body: string;
  prompt_text_tail?: string;
}

// Initialize LLM API once per process
let llmInitPromise: Promise<void> | null = null;

async function ensureLLMInitialized() {
  if (is_initialized()) {
    return;
  }

  if (!llmInitPromise) {
    llmInitPromise = (async () => {
      try {
        await initialize_llm_api();
      } catch (error) {
        console.error('[api/files/upload-extract] Failed to initialize hazo_llm_api:', error);
        llmInitPromise = null;
        throw error;
      }
    })();
  }

  await llmInitPromise;
}

/**
 * Create an LLM instance adapter for hazo_files LLMExtractionService
 * This bridges hazo_llm_api with hazo_files extraction service
 */
function createLLMFactory(promptsCrud: CrudService): LLMFactory {
  return (): HazoLLMInstance => {
    return {
      async extract(
        content: string | Buffer,
        options?: {
          mimeType?: string;
          prompt?: string;
          promptArea?: string;
          promptKey?: string;
          promptVariables?: Record<string, string>;
        }
      ): Promise<Record<string, unknown>> {
        // Determine the prompt
        let promptText: string | undefined;

        if (options?.prompt) {
          // Direct prompt provided
          promptText = options.prompt;
        } else if (options?.promptArea && options?.promptKey) {
          // Lookup prompt from database using CrudService
          const prompt = await promptsCrud.findOneBy({
            prompt_area: options.promptArea,
            prompt_key: options.promptKey,
          }) as PromptRecord | null;
          if (!prompt) {
            throw new Error(`Prompt not found: ${options.promptArea}/${options.promptKey}`);
          }
          // Combine prompt parts
          promptText = [
            prompt.prompt_text_head,
            prompt.prompt_text_body,
            prompt.prompt_text_tail,
          ]
            .filter(Boolean)
            .join('\n');

          // Substitute variables if provided - simple {var_name} replacement
          if (options.promptVariables) {
            for (const [key, value] of Object.entries(options.promptVariables)) {
              promptText = promptText.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
            }
          }
        }

        if (!promptText) {
          throw new Error('No prompt provided for extraction');
        }

        // Prepare file data for hazo_llm_api
        const fileBuffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
        const mimeType = options?.mimeType || 'application/octet-stream';

        // Convert buffer to base64
        const base64Data = fileBuffer.toString('base64');

        // Choose the right LLM function based on MIME type
        const isImage = mimeType.startsWith('image/');

        let result;
        if (isImage) {
          // Use image_text for image files
          result = await hazo_llm_image_text({
            prompt: promptText,
            image_b64: base64Data,
            image_mime_type: mimeType,
          });
        } else {
          // Use document_text for documents (PDF, etc.)
          result = await hazo_llm_document_text({
            prompt: promptText,
            document_b64: base64Data,
            document_mime_type: mimeType,
          });
        }

        if (!result.success) {
          throw new Error(result.error || 'LLM extraction failed');
        }

        // Parse the result as JSON
        try {
          const text = result.text || '{}';
          // Try to extract JSON from the response (might be wrapped in markdown code blocks)
          const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
          const jsonStr = jsonMatch[1]?.trim() || text;
          return JSON.parse(jsonStr);
        } catch {
          // Return as text if not valid JSON
          return { text: result.text, raw: true };
        }
      },
    };
  };
}

/**
 * POST /api/files/upload-extract
 * Upload a file with optional naming convention and LLM extraction
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Extract form fields
    const file = formData.get('file') as File;
    const basePath = formData.get('basePath') as string;
    const namingConventionId = formData.get('namingConventionId') as string | null;
    const variablesJson = formData.get('variables') as string | null;
    const extract = formData.get('extract') === 'true';
    const promptArea = formData.get('promptArea') as string | null;
    const promptKey = formData.get('promptKey') as string | null;
    const createFolders = formData.get('createFolders') !== 'false';
    const provider = (formData.get('provider') as 'local' | 'google_drive') || 'local';

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!basePath) {
      return NextResponse.json(
        { success: false, error: 'No path provided' },
        { status: 400 }
      );
    }

    // Parse variables
    let variables: Record<string, string> = {};
    if (variablesJson) {
      try {
        variables = JSON.parse(variablesJson);
      } catch {
        return NextResponse.json(
          { success: false, error: 'Invalid variables JSON' },
          { status: 400 }
        );
      }
    }

    // Initialize database and services
    await initializeDatabase();
    const namingCrud = getNamingCrudService();
    const namingService = new NamingConventionService(namingCrud);

    // Get tracked file manager
    let fileManager: TrackedFileManager;
    try {
      fileManager = await getTrackedFileManager(provider);
    } catch (error) {
      // If tracking is disabled or failed, use regular upload
      return NextResponse.json(
        { success: false, error: `File tracking required: ${(error as Error).message}` },
        { status: 500 }
      );
    }

    // Create extraction service if extraction is requested
    let extractionService: LLMExtractionService | undefined;
    if (extract && promptArea && promptKey) {
      try {
        await ensureLLMInitialized();
        const promptsCrud = getPromptsCrudService();
        const llmFactory = createLLMFactory(promptsCrud);
        extractionService = new LLMExtractionService(llmFactory, 'gemini');
      } catch (error) {
        console.warn('[api/files/upload-extract] LLM initialization failed:', error);
        // Continue without extraction
      }
    }

    // Create upload-extract service
    const uploadExtractService = new UploadExtractService(
      fileManager,
      namingService,
      extractionService
    );

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Perform upload with optional extraction
    const result = await uploadExtractService.uploadWithExtract(buffer, file.name, {
      basePath: basePath.startsWith('/') ? basePath : '/' + basePath,
      namingConventionId: namingConventionId || undefined,
      namingVariables: variables,
      extract: extract && !!extractionService,
      extractionOptions:
        extract && promptArea && promptKey
          ? {
              promptArea,
              promptKey,
            }
          : undefined,
      createFolders,
      overwrite: true,
    });

    // Get the file record ID if tracking is enabled
    let fileId: string | undefined;
    if (result.success && result.generatedPath) {
      try {
        const metadataService = fileManager.getMetadataService();
        if (metadataService) {
          const record = await metadataService.findByPath(
            result.generatedPath,
            provider
          );
          if (record) {
            fileId = record.id;
          }
        }
      } catch (err) {
        console.warn('[api/files/upload-extract] Could not get file record ID:', err);
      }
    }

    return NextResponse.json({
      ...result,
      fileId,
    });
  } catch (error) {
    console.error('[api/files/upload-extract] Error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
