/**
 * Content Tag API route
 * Handles manual content tagging of existing files and upload-with-tag workflows
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTrackedFileManager } from '@/lib/file-manager';
import { initializeDatabase, getNamingCrudService, getPromptsCrudService } from '@/config/database';
import {
  NamingConventionService,
  UploadExtractService,
  LLMExtractionService,
} from 'hazo_files';
import type { TrackedFileManager, HazoLLMInstance, LLMFactoryConfig, ContentTagConfig } from 'hazo_files';
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
  if (is_initialized()) return;
  if (!llmInitPromise) {
    llmInitPromise = (async () => {
      try {
        await initialize_llm_api();
      } catch (error) {
        console.error('[api/files/content-tag] Failed to initialize hazo_llm_api:', error);
        llmInitPromise = null;
        throw error;
      }
    })();
  }
  await llmInitPromise;
}

/**
 * Create an LLM instance adapter (same pattern as upload-extract route)
 */
function createLLMFactory(promptsCrud: CrudService): LLMFactoryConfig {
  const create = (): HazoLLMInstance => {
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
        let promptText: string | undefined;

        if (options?.prompt) {
          promptText = options.prompt;
        } else if (options?.promptArea && options?.promptKey) {
          const prompt = await promptsCrud.findOneBy({
            prompt_area: options.promptArea,
            prompt_key: options.promptKey,
          }) as PromptRecord | null;
          if (!prompt) {
            throw new Error(`Prompt not found: ${options.promptArea}/${options.promptKey}`);
          }
          promptText = [prompt.prompt_text_head, prompt.prompt_text_body, prompt.prompt_text_tail]
            .filter(Boolean)
            .join('\n');

          if (options.promptVariables) {
            for (const [key, value] of Object.entries(options.promptVariables)) {
              promptText = promptText.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
            }
          }
        }

        if (!promptText) {
          throw new Error('No prompt provided for extraction');
        }

        const fileBuffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
        const mimeType = options?.mimeType || 'application/octet-stream';
        const base64Data = fileBuffer.toString('base64');
        const isImage = mimeType.startsWith('image/');

        let result;
        if (isImage) {
          result = await hazo_llm_image_text({
            prompt: promptText,
            image_b64: base64Data,
            image_mime_type: mimeType,
          });
        } else {
          result = await hazo_llm_document_text({
            prompt: promptText,
            document_b64: base64Data,
            document_mime_type: mimeType,
          });
        }

        if (!result.success) {
          throw new Error(result.error || 'LLM extraction failed');
        }

        try {
          const text = result.text || '{}';
          const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
          const jsonStr = jsonMatch[1]?.trim() || text;
          return JSON.parse(jsonStr);
        } catch {
          return { text: result.text, raw: true };
        }
      },
    };
  };
  return { create };
}

/**
 * POST /api/files/content-tag
 * Manually tag an existing file's content via LLM
 *
 * Body: { fileId, promptArea, promptKey, returnFieldname, promptVariables? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      fileId,
      promptArea,
      promptKey,
      returnFieldname,
      promptVariables,
      provider = 'local',
    } = body;

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: 'fileId is required' },
        { status: 400 }
      );
    }
    if (!promptArea || !promptKey) {
      return NextResponse.json(
        { success: false, error: 'promptArea and promptKey are required' },
        { status: 400 }
      );
    }
    if (!returnFieldname) {
      return NextResponse.json(
        { success: false, error: 'returnFieldname is required' },
        { status: 400 }
      );
    }

    // Initialize database and services
    await initializeDatabase();

    // Initialize LLM
    await ensureLLMInitialized();
    const promptsCrud = getPromptsCrudService();
    const llmFactory = createLLMFactory(promptsCrud);
    const extractionService = new LLMExtractionService(llmFactory, 'gemini');

    // Get tracked file manager
    let fileManager: TrackedFileManager;
    try {
      fileManager = await getTrackedFileManager(provider);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: `File tracking required: ${(error as Error).message}` },
        { status: 500 }
      );
    }

    // Build content tag config
    const contentTagConfig: ContentTagConfig = {
      content_tag_set_by_llm: true,
      content_tag_prompt_area: promptArea,
      content_tag_prompt_key: promptKey,
      content_tag_prompt_variables: promptVariables,
      content_tag_prompt_return_fieldname: returnFieldname,
    };

    // Create upload-extract service with content tag config
    const namingCrud = getNamingCrudService();
    const namingService = new NamingConventionService(namingCrud);
    const uploadExtractService = new UploadExtractService(
      fileManager,
      namingService,
      extractionService,
      contentTagConfig
    );

    // Tag the file
    const result = await uploadExtractService.tagFileContent(fileId, contentTagConfig);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[api/files/content-tag] Error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
