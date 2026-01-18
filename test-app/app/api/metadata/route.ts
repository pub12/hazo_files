/**
 * API route for fetching hazo_files metadata records
 */

import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase, isTrackingEnabled } from '@/config/database';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const storageType = searchParams.get('storage_type');
  const limit = parseInt(searchParams.get('limit') || '100', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  try {
    // Check if tracking is enabled
    if (!isTrackingEnabled()) {
      return NextResponse.json({
        success: false,
        error: 'Database tracking is disabled. Set HAZO_FILES_DB_ENABLED=true to enable.',
      });
    }

    const crudService = await initializeDatabase();

    // Use list() with configure callback to build query
    const data = await crudService.list((qb) => {
      // Add storage_type filter if provided
      if (storageType) {
        qb.where('storage_type', 'eq', storageType);
      }

      // Add ordering (descending by changed_at)
      qb.order('changed_at', 'desc');

      // Add pagination
      if (limit > 0) {
        qb.limit(limit);
      }

      if (offset > 0) {
        qb.offset(offset);
      }

      return qb;
    });

    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    console.error('[metadata API] Error fetching records:', error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { success: false, error: 'Missing id parameter' },
      { status: 400 }
    );
  }

  try {
    if (!isTrackingEnabled()) {
      return NextResponse.json({
        success: false,
        error: 'Database tracking is disabled.',
      });
    }

    const crudService = await initializeDatabase();
    await crudService.deleteById(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[metadata API] Error deleting record:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
