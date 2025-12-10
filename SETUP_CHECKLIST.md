# hazo_files Setup Checklist

Step-by-step guide to get hazo_files up and running in your project. Check off each step as you complete it.

## Prerequisites

- [ ] Node.js 16+ installed (`node --version`)
- [ ] npm or yarn package manager
- [ ] Text editor or IDE
- [ ] (Optional) React 18+ for UI components
- [ ] (Optional) Next.js 14+ for full-stack integration
- [ ] (Optional) PostgreSQL or SQLite for Google Drive token storage

## Part 1: Basic Installation

### 1.1 Install Package

- [ ] Install hazo_files package:
  ```bash
  npm install hazo_files
  ```

- [ ] Verify installation:
  ```bash
  npm list hazo_files
  ```

### 1.2 Create Configuration File

- [ ] Create `hazo_files_config.ini` in your project root:
  ```bash
  touch hazo_files_config.ini
  ```

- [ ] Add basic configuration:
  ```ini
  [general]
  provider = local

  [local]
  base_path = ./files
  allowed_extensions =
  max_file_size = 0
  ```

### 1.3 Test Basic Setup

- [ ] Create a test script `test-hazo.js`:
  ```javascript
  const { createInitializedFileManager } = require('hazo_files');

  async function test() {
    const fm = await createInitializedFileManager();
    console.log('FileManager initialized!');
    console.log('Provider:', fm.getProvider());

    const result = await fm.createDirectory('/test');
    console.log('Test directory created:', result.success);
  }

  test().catch(console.error);
  ```

- [ ] Run the test:
  ```bash
  node test-hazo.js
  ```

- [ ] Verify `./files/test` directory was created

- [ ] Clean up test files:
  ```bash
  rm test-hazo.js
  rm -rf ./files/test
  ```

**Checkpoint**: Basic installation complete. FileManager can create directories.

## Part 2: Local Storage Setup

### 2.1 Configure Local Storage

- [ ] Update `hazo_files_config.ini`:
  ```ini
  [general]
  provider = local

  [local]
  base_path = ./storage
  allowed_extensions = jpg,png,pdf,txt,doc,docx,xlsx
  max_file_size = 10485760
  ```

- [ ] Create storage directory:
  ```bash
  mkdir -p ./storage
  ```

- [ ] Set appropriate permissions (Unix/Linux):
  ```bash
  chmod 750 ./storage
  ```

### 2.2 Implement File Operations

- [ ] Create `file-operations.js`:
  ```javascript
  const { createInitializedFileManager } = require('hazo_files');
  const fs = require('fs');

  async function testOperations() {
    const fm = await createInitializedFileManager();

    // Create directory
    await fm.createDirectory('/documents');

    // Write text file
    await fm.writeFile('/documents/readme.txt', 'Hello, World!');

    // Upload file
    const buffer = Buffer.from('Test content');
    await fm.uploadFile(buffer, '/documents/test.txt');

    // List directory
    const result = await fm.listDirectory('/documents');
    console.log('Files:', result.data);

    // Download file
    const readResult = await fm.readFile('/documents/readme.txt');
    console.log('Content:', readResult.data);
  }

  testOperations().catch(console.error);
  ```

- [ ] Run the operations test:
  ```bash
  node file-operations.js
  ```

- [ ] Verify files in `./storage/documents/`

**Checkpoint**: Local storage is fully functional.

## Part 3: Next.js Integration (Optional)

### 3.1 Setup Next.js Project

- [ ] If not already in a Next.js project, create one:
  ```bash
  npx create-next-app@latest my-file-app
  cd my-file-app
  ```

- [ ] Install hazo_files in Next.js project:
  ```bash
  npm install hazo_files
  ```

- [ ] Copy `hazo_files_config.ini` to Next.js project root

### 3.2 Create API Routes

- [ ] Create `app/api/files/route.ts`:
  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { createInitializedFileManager } from 'hazo_files';

  async function getFileManager() {
    return createInitializedFileManager({
      config: {
        provider: 'local',
        local: {
          basePath: process.env.LOCAL_STORAGE_BASE_PATH || './files',
        }
      }
    });
  }

  export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const path = searchParams.get('path') || '/';

    const fm = await getFileManager();

    switch (action) {
      case 'list':
        return NextResponse.json(await fm.listDirectory(path));
      case 'tree':
        const depth = parseInt(searchParams.get('depth') || '3', 10);
        return NextResponse.json(await fm.getFolderTree(path, depth));
      default:
        return NextResponse.json({ success: false, error: 'Invalid action' });
    }
  }

  export async function POST(request: NextRequest) {
    const body = await request.json();
    const { action, ...params } = body;

    const fm = await getFileManager();

    switch (action) {
      case 'createDirectory':
        return NextResponse.json(await fm.createDirectory(params.path));
      case 'deleteFile':
        return NextResponse.json(await fm.deleteFile(params.path));
      case 'renameFile':
        return NextResponse.json(await fm.renameFile(params.path, params.newName));
      default:
        return NextResponse.json({ success: false, error: 'Invalid action' });
    }
  }
  ```

- [ ] Create `app/api/files/upload/route.ts`:
  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { createInitializedFileManager } from 'hazo_files';

  async function getFileManager() {
    return createInitializedFileManager({
      config: {
        provider: 'local',
        local: {
          basePath: process.env.LOCAL_STORAGE_BASE_PATH || './files',
        }
      }
    });
  }

  export async function POST(request: NextRequest) {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const path = formData.get('path') as string;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const fm = await getFileManager();
    return NextResponse.json(await fm.uploadFile(buffer, path));
  }
  ```

- [ ] Create `app/api/files/download/route.ts`:
  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { createInitializedFileManager } from 'hazo_files';

  async function getFileManager() {
    return createInitializedFileManager({
      config: {
        provider: 'local',
        local: {
          basePath: process.env.LOCAL_STORAGE_BASE_PATH || './files',
        }
      }
    });
  }

  export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '/';

    const fm = await getFileManager();
    const result = await fm.downloadFile(path);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 404 });
    }

    const buffer = result.data as Buffer;
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${path.split('/').pop()}"`,
      },
    });
  }
  ```

### 3.3 Test API Routes

- [ ] Start Next.js dev server:
  ```bash
  npm run dev
  ```

- [ ] Test list endpoint:
  ```bash
  curl http://localhost:3000/api/files?action=list&path=/
  ```

- [ ] Test create directory:
  ```bash
  curl -X POST http://localhost:3000/api/files \
    -H "Content-Type: application/json" \
    -d '{"action":"createDirectory","path":"/test-api"}'
  ```

- [ ] Verify directory created in `./files/test-api`

**Checkpoint**: API routes are working correctly.

## Part 4: UI Components (Optional)

### 4.1 Install React Dependencies

- [ ] Install React (if not already installed):
  ```bash
  npm install react react-dom
  ```

- [ ] Install UI dependencies (for styling):
  ```bash
  npm install tailwindcss @tailwindcss/forms
  ```

- [ ] Install drag-and-drop dependencies (for NamingRuleConfigurator):
  ```bash
  npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
  ```

### 4.2 Create API Adapter

- [ ] Create `lib/file-api.ts`:
  ```typescript
  import type { FileBrowserAPI } from 'hazo_files/ui';

  export function createFileAPI(): FileBrowserAPI {
    return {
      async listDirectory(path: string) {
        const res = await fetch(`/api/files?action=list&path=${encodeURIComponent(path)}`);
        return res.json();
      },

      async getFolderTree(path = '/', depth = 3) {
        const res = await fetch(`/api/files?action=tree&path=${encodeURIComponent(path)}&depth=${depth}`);
        return res.json();
      },

      async createDirectory(path: string) {
        const res = await fetch('/api/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'createDirectory', path }),
        });
        return res.json();
      },

      async uploadFile(file: File, remotePath: string) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', remotePath);
        const res = await fetch('/api/files/upload', {
          method: 'POST',
          body: formData,
        });
        return res.json();
      },

      async downloadFile(path: string) {
        const res = await fetch(`/api/files/download?path=${encodeURIComponent(path)}`);
        if (!res.ok) {
          const error = await res.json();
          return { success: false, error: error.error };
        }
        const blob = await res.blob();
        return { success: true, data: blob };
      },

      async deleteFile(path: string) {
        const res = await fetch('/api/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'deleteFile', path }),
        });
        return res.json();
      },

      async renameFile(path: string, newName: string) {
        const res = await fetch('/api/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'renameFile', path, newName }),
        });
        return res.json();
      },

      async renameFolder(path: string, newName: string) {
        const res = await fetch('/api/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'renameFolder', path, newName }),
        });
        return res.json();
      },

      async moveItem(sourcePath: string, destinationPath: string) {
        const res = await fetch('/api/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'moveItem', sourcePath, destinationPath }),
        });
        return res.json();
      },

      async removeDirectory(path: string, recursive = false) {
        const res = await fetch('/api/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'removeDirectory', path, recursive }),
        });
        return res.json();
      },
    };
  }
  ```

### 4.3 Create FileBrowser Page

- [ ] Create `app/files/page.tsx`:
  ```typescript
  'use client';

  import { FileBrowser } from 'hazo_files/ui';
  import { createFileAPI } from '@/lib/file-api';

  export default function FilesPage() {
    const api = createFileAPI();

    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">File Manager</h1>
        <div className="h-screen">
          <FileBrowser
            api={api}
            initialPath="/"
            showPreview={true}
            showTree={true}
            viewMode="grid"
            onError={(error) => console.error('File browser error:', error)}
            onNavigate={(path) => console.log('Navigated to:', path)}
          />
        </div>
      </div>
    );
  }
  ```

### 4.4 Test UI

- [ ] Navigate to http://localhost:3000/files

- [ ] Test UI operations:
  - [ ] Navigate folders
  - [ ] Create new folder
  - [ ] Upload file
  - [ ] Download file
  - [ ] Rename file/folder
  - [ ] Delete file/folder
  - [ ] View file preview

**Checkpoint**: UI components are fully functional.

## Part 4.5: Naming Rule Configurator (Optional)

### 4.5.1 Create Naming Configuration Page

- [ ] Create `app/naming/page.tsx`:
  ```typescript
  'use client';

  import { useState } from 'react';
  import { NamingRuleConfigurator } from 'hazo_files/ui';
  import type { NamingVariable, NamingRuleSchema } from 'hazo_files/ui';

  export default function NamingConfigPage() {
    const [schema, setSchema] = useState<NamingRuleSchema | null>(null);

    // Define user-specific variables
    const userVariables: NamingVariable[] = [
      {
        variable_name: 'project_name',
        description: 'Name of the project',
        example_value: 'WebApp',
        category: 'user',
      },
      {
        variable_name: 'client_id',
        description: 'Client identifier',
        example_value: 'ACME',
        category: 'user',
      },
      {
        variable_name: 'document_type',
        description: 'Type of document',
        example_value: 'Proposal',
        category: 'user',
      },
    ];

    const handleSchemaChange = (newSchema: NamingRuleSchema) => {
      setSchema(newSchema);
      console.log('Schema updated:', newSchema);
      // Save to database or localStorage
    };

    const handleExport = (exportSchema: NamingRuleSchema) => {
      const blob = new Blob([JSON.stringify(exportSchema, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'naming-rule.json';
      a.click();
      URL.revokeObjectURL(url);
    };

    const handleImport = async () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const text = await file.text();
        const importedSchema = JSON.parse(text);
        setSchema(importedSchema);
      };
      input.click();
    };

    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Naming Rule Configurator</h1>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <NamingRuleConfigurator
            variables={userVariables}
            initialSchema={schema || undefined}
            onChange={handleSchemaChange}
            onExport={handleExport}
            sampleFileName="proposal.pdf"
          />
        </div>

        {schema && (
          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-2">Current Schema</h2>
            <pre className="bg-white p-4 rounded border overflow-auto">
              {JSON.stringify(schema, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  }
  ```

### 4.5.2 Test Naming Rule Generation

- [ ] Create test utility `lib/test-naming.ts`:
  ```typescript
  import {
    hazo_files_generate_file_name,
    hazo_files_generate_folder_name,
    type NamingRuleSchema,
  } from 'hazo_files';

  export function testNamingRule(
    schema: NamingRuleSchema,
    variables: Record<string, string>
  ) {
    // Test file name generation
    const fileResult = hazo_files_generate_file_name(
      schema,
      variables,
      'document.pdf',
      {
        counterValue: 1,
        preserveExtension: true,
        date: new Date(),
      }
    );

    // Test folder name generation
    const folderResult = hazo_files_generate_folder_name(schema, variables);

    return {
      file: fileResult,
      folder: folderResult,
    };
  }
  ```

### 4.5.3 Verify Naming Configuration

- [ ] Navigate to http://localhost:3000/naming

- [ ] Test configurator operations:
  - [ ] Drag date variables to file pattern
  - [ ] Drag user variables to patterns
  - [ ] Add literal text separators (-, _, space)
  - [ ] Reorder segments within pattern
  - [ ] Remove segments
  - [ ] Clear entire pattern
  - [ ] Verify live preview updates

- [ ] Test undo/redo:
  - [ ] Make several changes
  - [ ] Press Ctrl+Z (Cmd+Z on Mac) to undo
  - [ ] Press Ctrl+Y (Cmd+Y on Mac) to redo
  - [ ] Verify pattern history works

- [ ] Test export/import:
  - [ ] Build a pattern
  - [ ] Export as JSON file
  - [ ] Clear the pattern
  - [ ] Import the JSON file
  - [ ] Verify pattern is restored

**Checkpoint**: Naming rule configurator is working.

## Part 5: Google Drive Setup (Optional)

### 5.1 Google Cloud Console Setup

- [ ] Go to [Google Cloud Console](https://console.cloud.google.com)

- [ ] Create new project or select existing project

- [ ] Enable Google Drive API:
  - [ ] Navigate to "APIs & Services" > "Library"
  - [ ] Search for "Google Drive API"
  - [ ] Click "Enable"

- [ ] Create OAuth 2.0 credentials:
  - [ ] Navigate to "APIs & Services" > "Credentials"
  - [ ] Click "Create Credentials" > "OAuth client ID"
  - [ ] Choose "Web application"
  - [ ] Set name: "hazo_files"
  - [ ] Add authorized redirect URI: `http://localhost:3000/api/auth/google/callback`
  - [ ] Click "Create"
  - [ ] Copy Client ID and Client Secret

### 5.2 Environment Variables

- [ ] Create `.env.local` file:
  ```bash
  HAZO_GOOGLE_DRIVE_CLIENT_ID=your-client-id.apps.googleusercontent.com
  HAZO_GOOGLE_DRIVE_CLIENT_SECRET=GOCSPX-xxxxx
  HAZO_GOOGLE_DRIVE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
  ```

- [ ] Update `hazo_files_config.ini`:
  ```ini
  [general]
  provider = google_drive

  [google_drive]
  client_id =
  client_secret =
  redirect_uri = http://localhost:3000/api/auth/google/callback
  refresh_token =
  ```

- [ ] Add `.env.local` to `.gitignore`:
  ```bash
  echo ".env.local" >> .gitignore
  ```

### 5.3 Database Setup for Token Storage

#### PostgreSQL Setup

- [ ] Create database:
  ```sql
  CREATE DATABASE hazo_files_db;
  ```

- [ ] Create user:
  ```sql
  CREATE USER hazo_files_user WITH PASSWORD 'your_secure_password';
  ```

- [ ] Grant privileges:
  ```sql
  GRANT ALL PRIVILEGES ON DATABASE hazo_files_db TO hazo_files_user;
  ```

- [ ] Connect to database:
  ```bash
  psql -U hazo_files_user -d hazo_files_db
  ```

- [ ] Create tokens table:
  ```sql
  CREATE TABLE google_drive_tokens (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expiry_date BIGINT,
    scope TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
  ```

- [ ] Create index:
  ```sql
  CREATE INDEX idx_tokens_user_id ON google_drive_tokens(user_id);
  ```

- [ ] Grant table privileges:
  ```sql
  GRANT ALL PRIVILEGES ON TABLE google_drive_tokens TO hazo_files_user;
  GRANT USAGE, SELECT ON SEQUENCE google_drive_tokens_id_seq TO hazo_files_user;
  ```

#### SQLite Setup (Alternative)

- [ ] Create database file:
  ```bash
  touch hazo_files.db
  ```

- [ ] Create tokens table:
  ```bash
  sqlite3 hazo_files.db << 'EOF'
  CREATE TABLE google_drive_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT UNIQUE NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expiry_date INTEGER,
    scope TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX idx_tokens_user_id ON google_drive_tokens(user_id);
  EOF
  ```

### 5.4 Implement OAuth Flow

- [ ] Create `app/api/auth/google/route.ts`:
  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { createFileManager, GoogleDriveModule } from 'hazo_files';

  export async function GET(request: NextRequest) {
    const fm = createFileManager({
      config: {
        provider: 'google_drive',
        google_drive: {
          clientId: process.env.HAZO_GOOGLE_DRIVE_CLIENT_ID!,
          clientSecret: process.env.HAZO_GOOGLE_DRIVE_CLIENT_SECRET!,
          redirectUri: process.env.HAZO_GOOGLE_DRIVE_REDIRECT_URI!,
        }
      }
    });

    await fm.initialize();
    const module = fm.getModule() as GoogleDriveModule;
    const authUrl = module.getAuth().getAuthUrl();

    return NextResponse.redirect(authUrl);
  }
  ```

- [ ] Create `app/api/auth/google/callback/route.ts`:
  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import { createFileManager, GoogleDriveModule } from 'hazo_files';

  export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'No code provided' }, { status: 400 });
    }

    const fm = createFileManager({
      config: {
        provider: 'google_drive',
        google_drive: {
          clientId: process.env.HAZO_GOOGLE_DRIVE_CLIENT_ID!,
          clientSecret: process.env.HAZO_GOOGLE_DRIVE_CLIENT_SECRET!,
          redirectUri: process.env.HAZO_GOOGLE_DRIVE_REDIRECT_URI!,
        }
      }
    });

    await fm.initialize();
    const module = fm.getModule() as GoogleDriveModule;

    // Exchange code for tokens
    const tokens = await module.getAuth().exchangeCodeForTokens(code);

    // Store tokens in database (implement this)
    // await storeTokens(userId, tokens);

    return NextResponse.redirect('/files?connected=true');
  }
  ```

### 5.5 Test Google Drive Integration

- [ ] Navigate to http://localhost:3000/api/auth/google

- [ ] Grant permissions when prompted

- [ ] Verify redirect to `/files?connected=true`

- [ ] Test Google Drive operations:
  - [ ] List files
  - [ ] Create folder
  - [ ] Upload file
  - [ ] Download file

**Checkpoint**: Google Drive integration is complete.

## Part 6: Production Deployment

### 6.1 Environment Configuration

- [ ] Set production environment variables on hosting platform

- [ ] Update redirect URI for production:
  ```
  https://yourdomain.com/api/auth/google/callback
  ```

- [ ] Add production redirect URI to Google Cloud Console

### 6.2 Security Checklist

- [ ] Environment variables are not committed to git
- [ ] Database credentials are secure
- [ ] API routes have authentication/authorization
- [ ] File size limits are configured
- [ ] Extension whitelist is configured
- [ ] CORS is properly configured
- [ ] Rate limiting is implemented

### 6.3 Performance Optimization

- [ ] Enable caching for file listings
- [ ] Implement pagination for large directories
- [ ] Configure CDN for static file downloads (if applicable)
- [ ] Set up monitoring and logging

### 6.4 Backup Strategy

- [ ] Configure automated backups for local storage
- [ ] Set up database backups for tokens
- [ ] Test backup restoration process

**Checkpoint**: Application is production-ready.

## Verification

Run through this final checklist to ensure everything is working:

- [ ] FileManager initializes without errors
- [ ] Can create directories
- [ ] Can upload files
- [ ] Can download files
- [ ] Can delete files
- [ ] Can rename files/folders
- [ ] Can move files
- [ ] Can list directories
- [ ] UI displays file browser (if using UI components)
- [ ] Google Drive authentication works (if using Google Drive)
- [ ] Tokens are persisted (if using Google Drive)
- [ ] All API endpoints return correct responses
- [ ] Error handling works correctly
- [ ] File size limits are enforced
- [ ] Extension filtering works

## Troubleshooting

### Common Issues

**Issue**: FileManager fails to initialize

- Check configuration file syntax
- Verify environment variables are set
- Check file permissions on storage directory

**Issue**: Upload fails with "Extension not allowed"

- Check `allowed_extensions` in config
- Ensure file extension matches allowed list
- Leave `allowed_extensions` empty to allow all types

**Issue**: Google Drive authentication fails

- Verify OAuth credentials are correct
- Check redirect URI matches exactly
- Ensure Google Drive API is enabled

**Issue**: "ENOENT" error when accessing files

- Verify `base_path` directory exists
- Check file permissions
- Ensure path starts with `/`

**Issue**: FileBrowser UI not rendering

- Check React version (must be 18+)
- Verify hazo_files/ui is imported correctly
- Check browser console for errors

## Next Steps

- [ ] Review [README.md](README.md) for advanced usage examples
- [ ] Read [TECHDOC.md](TECHDOC.md) for technical details
- [ ] Check [docs/ADDING_MODULES.md](docs/ADDING_MODULES.md) to create custom storage modules
- [ ] Explore test-app for complete implementation example

---

Congratulations! You have successfully set up hazo_files. For support, visit the [GitHub repository](https://github.com/pub12/hazo_files).
