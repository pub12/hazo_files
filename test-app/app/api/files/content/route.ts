/**
 * File content API route (for text files)
 */

import { NextRequest, NextResponse } from 'next/server';
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
    const result = await fm.readFile(path);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
