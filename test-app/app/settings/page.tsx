'use client';

import React from 'react';
import { Settings, HardDrive, Cloud, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export default function SettingsPage() {
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Settings className="h-8 w-8" />
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      {/* Local Storage Settings */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <HardDrive className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold">Local Storage</h2>
        </div>
        <div className="border rounded-lg p-4 space-y-4">
          <div>
            <label className="text-sm font-medium">Base Path</label>
            <p className="text-sm text-muted-foreground">
              Configure in <code className="bg-muted px-1 rounded">hazo_files_config.ini</code>
            </p>
          </div>
          <div>
            <label className="text-sm font-medium">Allowed Extensions</label>
            <p className="text-sm text-muted-foreground">
              Leave empty to allow all file types
            </p>
          </div>
          <div>
            <label className="text-sm font-medium">Max File Size</label>
            <p className="text-sm text-muted-foreground">
              Set to 0 for unlimited
            </p>
          </div>
        </div>
      </section>

      <Separator className="my-6" />

      {/* Google Drive Settings */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Cloud className="h-5 w-5 text-green-600" />
          <h2 className="text-lg font-semibold">Google Drive</h2>
        </div>
        <div className="border rounded-lg p-4 space-y-4">
          <div>
            <label className="text-sm font-medium">Client ID</label>
            <p className="text-sm text-muted-foreground">
              Set via <code className="bg-muted px-1 rounded">GOOGLE_DRIVE_CLIENT_ID</code> env variable
            </p>
          </div>
          <div>
            <label className="text-sm font-medium">Client Secret</label>
            <p className="text-sm text-muted-foreground">
              Set via <code className="bg-muted px-1 rounded">GOOGLE_DRIVE_CLIENT_SECRET</code> env variable
            </p>
          </div>
          <div>
            <label className="text-sm font-medium">Redirect URI</label>
            <p className="text-sm text-muted-foreground">
              Default: <code className="bg-muted px-1 rounded">http://localhost:3000/api/auth/google/callback</code>
            </p>
          </div>
        </div>
      </section>

      <Separator className="my-6" />

      {/* Configuration Info */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Info className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Configuration Files</h2>
        </div>
        <div className="bg-muted rounded-lg p-4">
          <h3 className="font-medium mb-2">hazo_files_config.ini</h3>
          <pre className="text-xs overflow-x-auto">
{`[general]
provider = local

[local]
base_path = ./files
allowed_extensions =
max_file_size = 0

[google_drive]
client_id =
client_secret =
redirect_uri = http://localhost:3000/api/auth/google/callback`}
          </pre>
        </div>
        <div className="bg-muted rounded-lg p-4 mt-4">
          <h3 className="font-medium mb-2">.env.local</h3>
          <pre className="text-xs overflow-x-auto">
{`GOOGLE_DRIVE_CLIENT_ID=your_client_id
GOOGLE_DRIVE_CLIENT_SECRET=your_client_secret
GOOGLE_DRIVE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback`}
          </pre>
        </div>
      </section>
    </div>
  );
}
