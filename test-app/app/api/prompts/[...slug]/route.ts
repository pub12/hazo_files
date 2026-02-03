/**
 * Catch-all API route for prompt operations
 * Handles both single ID lookups and area/key lookups
 *
 * Routes:
 * - GET /api/prompts/:id - Get prompt by ID
 * - PUT /api/prompts/:id - Update prompt
 * - DELETE /api/prompts/:id - Delete prompt
 * - GET /api/prompts/:area/:key - Get prompt by area and key
 */

import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase, getPromptsCrudService } from '@/config/database';
import type { PromptRecord } from 'hazo_llm_api';

// Initialize database on first request
let initialized = false;
async function ensureInitialized() {
  if (!initialized) {
    await initializeDatabase();
    initialized = true;
  }
}

interface RouteParams {
  params: Promise<{ slug: string[] }>;
}

/**
 * GET handler - supports both ID and area/key lookups
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await ensureInitialized();
    const crudService = getPromptsCrudService();
    const { slug } = await params;

    if (slug.length === 1) {
      // Single slug: ID lookup
      const id = slug[0];
      const result = await crudService.findById(id) as unknown as PromptRecord | null;

      if (!result) {
        return NextResponse.json(
          { success: false, error: 'Prompt not found' },
          { status: 404 }
        );
      }

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
    } else if (slug.length === 2) {
      // Two slugs: area/key lookup
      const [area, key] = slug;

      const { searchParams } = new URL(request.url);
      const local_1 = searchParams.get('local_1');
      const local_2 = searchParams.get('local_2');
      const local_3 = searchParams.get('local_3');
      const user_id = searchParams.get('user_id');
      const scope_id = searchParams.get('scope_id');

      // Build where clause
      const where: Record<string, string | null> = {
        prompt_area: area,
        prompt_key: key,
      };

      if (local_1) where.local_1 = local_1;
      if (local_2) where.local_2 = local_2;
      if (local_3) where.local_3 = local_3;
      if (user_id) where.user_id = user_id;
      if (scope_id) where.scope_id = scope_id;

      const result = await crudService.findOneBy(where) as unknown as PromptRecord | null;

      if (!result) {
        return NextResponse.json(
          { success: false, error: 'Prompt not found' },
          { status: 404 }
        );
      }

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
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid path' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[api/prompts/[...slug]] GET error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to get prompt' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/prompts/:id - Update prompt
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await ensureInitialized();
    const crudService = getPromptsCrudService();
    const { slug } = await params;

    if (slug.length !== 1) {
      return NextResponse.json(
        { success: false, error: 'Invalid path for update' },
        { status: 400 }
      );
    }

    const id = slug[0];
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

    const updates: Record<string, unknown> = {
      changed_at: new Date().toISOString(),
    };

    if (prompt_area !== undefined) updates.prompt_area = prompt_area;
    if (prompt_key !== undefined) updates.prompt_key = prompt_key;
    if (local_1 !== undefined) updates.local_1 = local_1 || null;
    if (local_2 !== undefined) updates.local_2 = local_2 || null;
    if (local_3 !== undefined) updates.local_3 = local_3 || null;
    if (user_id !== undefined) updates.user_id = user_id || null;
    if (scope_id !== undefined) updates.scope_id = scope_id || null;
    if (prompt_name !== undefined) updates.prompt_name = prompt_name || '';
    if (prompt_text_head !== undefined) updates.prompt_text_head = prompt_text_head || '';
    if (prompt_text_body !== undefined) updates.prompt_text_body = prompt_text_body;
    if (prompt_text_tail !== undefined) updates.prompt_text_tail = prompt_text_tail || '';
    if (prompt_variables !== undefined) {
      updates.prompt_variables = typeof prompt_variables === 'string'
        ? prompt_variables
        : JSON.stringify(prompt_variables || []);
    }
    if (prompt_notes !== undefined) updates.prompt_notes = prompt_notes || '';
    if (next_prompt !== undefined) updates.next_prompt = next_prompt || null;

    const results = await crudService.updateById(id, updates);
    const result = results[0] as unknown as PromptRecord | undefined;

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Prompt not found' },
        { status: 404 }
      );
    }

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
    console.error('[api/prompts/[...slug]] PUT error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update prompt' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/prompts/:id - Delete prompt
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await ensureInitialized();
    const crudService = getPromptsCrudService();
    const { slug } = await params;

    if (slug.length !== 1) {
      return NextResponse.json(
        { success: false, error: 'Invalid path for delete' },
        { status: 400 }
      );
    }

    const id = slug[0];
    await crudService.deleteById(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[api/prompts/[...slug]] DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete prompt' },
      { status: 500 }
    );
  }
}
