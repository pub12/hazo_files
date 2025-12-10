/**
 * File download API route
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBaseName, getMimeType } from 'hazo_files';
import { getFileManager } from '@/lib/file-manager';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');
  const provider = (searchParams.get('provider') || 'local') as 'local' | 'google_drive';

  if (!path) {
    return NextResponse.json(
      { success: false, error: 'No path provided' },
      { status: 400 }
    );
  }

  try {
    const fm = await getFileManager(provider);
    const result = await fm.downloadFile(path);

    if (!result.success || !result.data) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to download' },
        { status: 404 }
      );
    }

    const buffer = result.data as Buffer;
    const filename = getBaseName(path);
    const mimeType = getMimeType(filename);

    // Convert Buffer to Uint8Array for NextResponse compatibility
    const uint8Array = new Uint8Array(buffer);

    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
