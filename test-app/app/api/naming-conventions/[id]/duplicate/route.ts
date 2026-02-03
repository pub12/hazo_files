/**
 * API route for duplicating a naming convention
 */

import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase, getNamingCrudService } from '@/config/database';
import { NamingConventionService } from 'hazo_files';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/naming-conventions/[id]/duplicate
 * Duplicate a naming convention
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await initializeDatabase();
    const service = new NamingConventionService(getNamingCrudService());
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const newTitle = body.newTitle;

    const record = await service.duplicate(id, newTitle);
    if (!record) {
      return NextResponse.json({ success: false, error: 'Failed to duplicate' }, { status: 500 });
    }

    const parsed = service.parseRecord(record);
    return NextResponse.json({ success: true, data: parsed });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
