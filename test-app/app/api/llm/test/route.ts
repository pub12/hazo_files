/**
 * API route to test LLM API connectivity using hazo_llm_api
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  initialize_llm_api,
  hazo_llm_text_text,
  is_initialized,
} from 'hazo_llm_api/server';

// Initialize once per process
let initPromise: Promise<void> | null = null;

async function ensureInitialized() {
  if (is_initialized()) {
    return;
  }

  if (!initPromise) {
    initPromise = (async () => {
      try {
        await initialize_llm_api();
      } catch (error) {
        console.error('[api/llm/test] Failed to initialize hazo_llm_api:', error);
        initPromise = null;
        throw error;
      }
    })();
  }

  await initPromise;
}

/**
 * POST /api/llm/test - Send a test prompt to the LLM using hazo_llm_api
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt } = body;

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Initialize hazo_llm_api if not already
    await ensureInitialized();

    // Call hazo_llm_text_text with the prompt
    const result = await hazo_llm_text_text({ prompt });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'LLM API call failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      response: result.text,
    });

  } catch (error) {
    console.error('[api/llm/test] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to test LLM API' },
      { status: 500 }
    );
  }
}
