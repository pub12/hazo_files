/**
 * API route to check LLM API configuration status using hazo_llm_api
 */

import { NextResponse } from 'next/server';
import {
  initialize_llm_api,
  is_initialized,
} from 'hazo_llm_api/server';

/**
 * GET /api/llm/status - Check if hazo_llm_api is configured
 */
export async function GET() {
  try {
    // Try to initialize if not already
    if (!is_initialized()) {
      try {
        await initialize_llm_api();
      } catch (initError) {
        // Initialization failed - not configured
        console.error('[api/llm/status] Init failed:', initError);
        return NextResponse.json({
          configured: false,
          provider: null,
          model: null,
          error: initError instanceof Error ? initError.message : 'Initialization failed',
        });
      }
    }

    return NextResponse.json({
      configured: true,
    });
  } catch (error) {
    console.error('[api/llm/status] Error:', error);
    return NextResponse.json(
      { configured: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
