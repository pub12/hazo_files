/**
 * API route for fetching file metadata by path
 * Retrieves file_data from the hazo_files database table
 */

import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase, isTrackingEnabled } from '@/config/database';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');
  const provider = (searchParams.get('provider') || 'local') as 'local' | 'google_drive';

  if (!path) {
    return NextResponse.json(
      { success: false, error: 'Missing path parameter' },
      { status: 400 }
    );
  }

  try {
    // Check if tracking is enabled
    if (!isTrackingEnabled()) {
      // Return success with empty file_data if tracking is disabled
      return NextResponse.json({
        success: true,
        data: {
          id: '',
          name: path.split('/').pop() || '',
          path,
          isDirectory: false,
          createdAt: new Date(),
          modifiedAt: new Date(),
          storage_type: provider,
          file_data: undefined,
        },
      });
    }

    const crudService = await initializeDatabase();

    // Find the record by path and storage type
    const record = await crudService.findOneBy({
      file_path: path,
      storage_type: provider,
    });

    if (!record) {
      // Return success with no database record - basic metadata only
      return NextResponse.json({
        success: true,
        data: {
          id: '',
          name: path.split('/').pop() || '',
          path,
          isDirectory: false,
          createdAt: new Date(),
          modifiedAt: new Date(),
          storage_type: provider,
          file_data: undefined,
        },
      });
    }

    // Parse file_data JSON
    let fileData: Record<string, unknown> | undefined;
    if (record.file_data) {
      try {
        const parsed = JSON.parse(record.file_data);
        // Only include if it has actual data
        if (Object.keys(parsed).length > 0) {
          fileData = parsed;
        }
      } catch {
        // Invalid JSON, ignore
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: record.id,
        name: record.filename,
        path: record.file_path,
        mimeType: record.file_type !== 'folder' ? record.file_type : undefined,
        isDirectory: record.file_type === 'folder',
        createdAt: new Date(record.created_at),
        modifiedAt: new Date(record.changed_at),
        storage_type: record.storage_type,
        file_data: fileData,
      },
    });
  } catch (error) {
    console.error('[metadata API] Error fetching file metadata:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
