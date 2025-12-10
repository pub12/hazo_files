'use client';

import React, { useMemo, useState } from 'react';
import { FileBrowser } from 'hazo_files/ui';
import { createFileBrowserAPI } from '@/lib/hazo-files';
import { HardDrive, Grid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LocalFilesPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [error, setError] = useState<string | null>(null);

  const api = useMemo(() => createFileBrowserAPI('local'), []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <HardDrive className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl font-semibold">Local Files</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="m-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* File Browser */}
      <div className="flex-1 p-4">
        <FileBrowser
          api={api}
          initialPath="/"
          viewMode={viewMode}
          showPreview={true}
          showTree={true}
          treeWidth={250}
          previewHeight={250}
          onError={setError}
          className="h-full"
        />
      </div>
    </div>
  );
}
