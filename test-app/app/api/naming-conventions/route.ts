/**
 * API routes for naming conventions
 * Handles list and create operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase, getNamingCrudService } from '@/config/database';
import { NamingConventionService } from 'hazo_files';
import type { NamingConventionInput, ListNamingConventionsOptions } from 'hazo_files';

/**
 * GET /api/naming-conventions
 * List all naming conventions with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();
    const service = new NamingConventionService(getNamingCrudService());

    const { searchParams } = new URL(request.url);
    const scopeIdParam = searchParams.get('scope_id');
    const namingType = searchParams.get('naming_type') as 'file' | 'folder' | 'both' | null;
    const includeGlobal = searchParams.get('includeGlobal');

    const options: ListNamingConventionsOptions = {};

    if (scopeIdParam !== null) {
      options.scope_id = scopeIdParam === '' ? null : scopeIdParam;
    }
    if (namingType) {
      options.naming_type = namingType;
    }
    if (includeGlobal !== null) {
      options.includeGlobal = includeGlobal === 'true';
    }

    const conventions = await service.listParsed(
      Object.keys(options).length > 0 ? options : undefined
    );

    return NextResponse.json({ success: true, data: conventions });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/naming-conventions
 * Create a new naming convention
 */
export async function POST(request: NextRequest) {
  try {
    await initializeDatabase();
    const service = new NamingConventionService(getNamingCrudService());

    const body = await request.json();
    const input: NamingConventionInput = {
      naming_title: body.naming_title,
      naming_type: body.naming_type,
      naming_value: body.naming_value,
      scope_id: body.scope_id ?? null,
      variables: body.variables ?? [],
    };

    const record = await service.create(input);
    if (!record) {
      return NextResponse.json({ success: false, error: 'Failed to create' }, { status: 500 });
    }

    const parsed = service.parseRecord(record);
    return NextResponse.json({ success: true, data: parsed });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
