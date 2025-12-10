'use client';

import React from 'react';
import Link from 'next/link';
import { HardDrive, Cloud, FolderOpen, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <FolderOpen className="h-12 w-12 text-primary" />
            <h1 className="text-4xl font-bold">Hazo Files</h1>
          </div>
          <p className="text-xl text-muted-foreground">
            File Management Package Test Application
          </p>
        </div>

        {/* Storage options */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Local Storage */}
          <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <HardDrive className="h-6 w-6 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold">Local Storage</h2>
            </div>
            <p className="text-muted-foreground mb-6">
              Browse and manage files on your local file system. Create folders,
              upload files, rename, move, and delete items.
            </p>
            <Link href="/local">
              <Button className="w-full group">
                Browse Local Files
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          {/* Google Drive */}
          <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Cloud className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold">Google Drive</h2>
            </div>
            <p className="text-muted-foreground mb-6">
              Connect to your Google Drive account and manage cloud files.
              One-time authentication, then automatic access.
            </p>
            <Link href="/google-drive">
              <Button variant="outline" className="w-full group">
                Connect Google Drive
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Available Services</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              'Create Directory',
              'Remove Directory',
              'Upload File',
              'Download File',
              'Move File',
              'Delete File',
              'Rename File',
              'Rename Folder',
            ].map((service) => (
              <div
                key={service}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <div className="h-2 w-2 bg-green-500 rounded-full" />
                {service}
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 p-4 bg-muted rounded-lg">
          <h3 className="font-medium mb-2">Getting Started</h3>
          <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
            <li>Choose a storage provider above (Local or Google Drive)</li>
            <li>For Google Drive, you'll need to authenticate first</li>
            <li>Use the file browser to navigate, upload, and manage files</li>
            <li>Right-click or use toolbar buttons for file actions</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
