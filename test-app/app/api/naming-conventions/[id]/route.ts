/**
 * API routes for single naming convention
 * Handles get, update, delete, and duplicate operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase, getNamingCrudService } from '@/config/database';
import { NamingConventionService } from 'hazo_files';
import type { NamingConventionUpdate } from 'hazo_files';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/naming-conventions/[id]
 * Get a single naming convention by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await initializeDatabase();
    const service = new NamingConventionService(getNamingCrudService());
    const { id } = await params;

    const parsed = await service.getByIdParsed(id);
    if (!parsed) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: parsed });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * PUT /api/naming-conventions/[id]
 * Update a naming convention
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await initializeDatabase();
    const service = new NamingConventionService(getNamingCrudService());
    const { id } = await params;

    const body = await request.json();
    const update: NamingConventionUpdate = {};

    if (body.naming_title !== undefined) update.naming_title = body.naming_title;
    if (body.naming_type !== undefined) update.naming_type = body.naming_type;
    if (body.naming_value !== undefined) update.naming_value = body.naming_value;
    if (body.scope_id !== undefined) update.scope_id = body.scope_id;
    if (body.variables !== undefined) update.variables = body.variables;

    const record = await service.update(id, update);
    if (!record) {
      return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 });
    }

    const parsed = service.parseRecord(record);
    return NextResponse.json({ success: true, data: parsed });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/naming-conventions/[id]
 * Delete a naming convention
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await initializeDatabase();
    const service = new NamingConventionService(getNamingCrudService());
    const { id } = await params;

    const success = await service.delete(id);
    if (!success) {
      return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

