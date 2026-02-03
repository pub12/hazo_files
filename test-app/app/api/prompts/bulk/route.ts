/**
 * API routes for bulk prompt operations
 * Implements the HazoConnect interface from hazo_llm_api
 */

import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase, getPromptsCrudService } from '@/config/database';
import type { PromptRecord } from 'hazo_llm_api';
import { randomUUID } from 'crypto';

// Initialize database on first request
let initialized = false;
async function ensureInitialized() {
  if (!initialized) {
    await initializeDatabase();
    initialized = true;
  }
}

/**
 * POST /api/prompts/bulk - Bulk import prompts
 */
export async function POST(request: NextRequest) {
  try {
    await ensureInitialized();
    const crudService = getPromptsCrudService();
    const body = await request.json();

    const { prompts } = body;

    if (!Array.isArray(prompts) || prompts.length === 0) {
      return NextResponse.json(
        { success: false, error: 'prompts array is required' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const errors: string[] = [];
    let importedCount = 0;

    for (const prompt of prompts) {
      try {
        if (!prompt.prompt_area || !prompt.prompt_key || !prompt.prompt_text_body) {
          errors.push(`Missing required fields for prompt: ${prompt.prompt_name || 'unknown'}`);
          continue;
        }

        const record: Partial<PromptRecord> = {
          id: randomUUID(),
          prompt_area: prompt.prompt_area,
          prompt_key: prompt.prompt_key,
          local_1: prompt.local_1 || null,
          local_2: prompt.local_2 || null,
          local_3: prompt.local_3 || null,
          user_id: prompt.user_id || null,
          scope_id: prompt.scope_id || null,
          prompt_name: prompt.prompt_name || '',
          prompt_text_head: prompt.prompt_text_head || '',
          prompt_text_body: prompt.prompt_text_body,
          prompt_text_tail: prompt.prompt_text_tail || '',
          prompt_variables: typeof prompt.prompt_variables === 'string'
            ? prompt.prompt_variables
            : JSON.stringify(prompt.prompt_variables || []),
          prompt_notes: prompt.prompt_notes || '',
          next_prompt: prompt.next_prompt || null,
          created_at: now,
          changed_at: now,
        };

        await crudService.insert(record);
        importedCount++;
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to import prompt ${prompt.prompt_name || 'unknown'}: ${msg}`);
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      imported_count: importedCount,
      count: importedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('[api/prompts/bulk] POST error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to import prompts' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/prompts/bulk - Bulk delete prompts
 */
export async function DELETE(request: NextRequest) {
  try {
    await ensureInitialized();
    const crudService = getPromptsCrudService();
    const body = await request.json();

    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ids array is required' },
        { status: 400 }
      );
    }

    const errors: string[] = [];
    let deletedCount = 0;

    for (const id of ids) {
      try {
        await crudService.deleteById(id);
        deletedCount++;
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to delete prompt ${id}: ${msg}`);
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      deleted_count: deletedCount,
      count: deletedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('[api/prompts/bulk] DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete prompts' },
      { status: 500 }
    );
  }
}
