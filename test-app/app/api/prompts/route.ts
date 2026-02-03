/**
 * API routes for managing prompts
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
 * GET /api/prompts - List all prompts
 * GET /api/prompts?area=xxx - Filter by prompt_area
 */
export async function GET(request: NextRequest) {
  try {
    await ensureInitialized();
    const crudService = getPromptsCrudService();

    const { searchParams } = new URL(request.url);
    const area = searchParams.get('area');

    let result: PromptRecord[];

    if (area) {
      // Filter by prompt_area
      result = await crudService.findBy({ prompt_area: area }) as unknown as PromptRecord[];
    } else {
      // Get all prompts
      result = await crudService.list((qb) => qb.order('changed_at', 'desc')) as unknown as PromptRecord[];
    }

    // Add computed prompt_text_full field
    const prompts = result.map((record) => ({
      ...record,
      prompt_text_full: [
        record.prompt_text_head,
        record.prompt_text_body,
        record.prompt_text_tail,
      ].filter(Boolean).join('\n'),
    }));

    return NextResponse.json({ success: true, data: prompts });
  } catch (error) {
    console.error('[api/prompts] GET error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to get prompts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/prompts - Create a new prompt
 */
export async function POST(request: NextRequest) {
  try {
    await ensureInitialized();
    const crudService = getPromptsCrudService();
    const body = await request.json();

    const {
      prompt_area,
      prompt_key,
      local_1,
      local_2,
      local_3,
      user_id,
      scope_id,
      prompt_name,
      prompt_text_head,
      prompt_text_body,
      prompt_text_tail,
      prompt_variables,
      prompt_notes,
      next_prompt,
    } = body;

    if (!prompt_area || !prompt_key || !prompt_text_body) {
      return NextResponse.json(
        { success: false, error: 'prompt_area, prompt_key, and prompt_text_body are required' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const record = {
      id: randomUUID(),
      prompt_area,
      prompt_key,
      local_1: local_1 || null,
      local_2: local_2 || null,
      local_3: local_3 || null,
      user_id: user_id || null,
      scope_id: scope_id || null,
      prompt_name: prompt_name || '',
      prompt_text_head: prompt_text_head || '',
      prompt_text_body,
      prompt_text_tail: prompt_text_tail || '',
      prompt_variables: typeof prompt_variables === 'string'
        ? prompt_variables
        : JSON.stringify(prompt_variables || []),
      prompt_notes: prompt_notes || '',
      next_prompt: next_prompt || null,
      created_at: now,
      changed_at: now,
    };

    const results = await crudService.insert(record);
    const result = results[0] as unknown as PromptRecord;

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        prompt_text_full: [
          result.prompt_text_head,
          result.prompt_text_body,
          result.prompt_text_tail,
        ].filter(Boolean).join('\n'),
      },
    });
  } catch (error) {
    console.error('[api/prompts] POST error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create prompt' },
      { status: 500 }
    );
  }
}
