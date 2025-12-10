/**
 * File operations API route
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFileManager } from '@/lib/file-manager';

// GET handler for list and tree operations
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const path = searchParams.get('path') || '/';
  const provider = (searchParams.get('provider') || 'local') as 'local' | 'google_drive';
  const depth = parseInt(searchParams.get('depth') || '3', 10);

  try {
    const fm = await getFileManager(provider);

    switch (action) {
      case 'list':
        return NextResponse.json(await fm.listDirectory(path));

      case 'tree':
        return NextResponse.json(await fm.getFolderTree(path, depth));

      case 'exists':
        return NextResponse.json({ success: true, data: await fm.exists(path) });

      case 'get':
        return NextResponse.json(await fm.getItem(path));

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST handler for write operations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, provider = 'local', ...params } = body;

    const fm = await getFileManager(provider);

    switch (action) {
      case 'createDirectory':
        return NextResponse.json(await fm.createDirectory(params.path));

      case 'removeDirectory':
        return NextResponse.json(await fm.removeDirectory(params.path, params.recursive));

      case 'deleteFile':
        return NextResponse.json(await fm.deleteFile(params.path));

      case 'renameFile':
        return NextResponse.json(await fm.renameFile(params.path, params.newName));

      case 'renameFolder':
        return NextResponse.json(await fm.renameFolder(params.path, params.newName));

      case 'moveItem':
        return NextResponse.json(await fm.moveItem(params.sourcePath, params.destinationPath));

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
