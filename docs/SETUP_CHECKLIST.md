# hazo_files Setup Checklist

Complete guide to setting up hazo_files in your project.

## 1. Installation

```bash
# Install hazo_files
npm install hazo_files

# Optional peer dependencies
npm install hazo_connect      # For database tracking
npm install hazo_llm_api      # For LLM extraction
npm install server-only       # For server entry point safety
npm install xxhash-wasm       # For fast file hashing (included by default)
```

## 2. Database Setup

### a. Create Tables

Using hazo_connect:

```typescript
import { createHazoConnect, SqliteAdapter } from 'hazo_connect/server';
import { HAZO_FILES_TABLE_SCHEMA, HAZO_FILES_NAMING_TABLE_SCHEMA } from 'hazo_files';

// Create adapter
const adapter = createHazoConnect({
  type: 'sqlite',
  sqlite: { database_path: './data/hazo_files.sqlite' }
});

// Initialize file metadata table
const fileStatements = HAZO_FILES_TABLE_SCHEMA.sqlite.ddl
  .split(';')
  .filter(s => s.trim());
for (const stmt of fileStatements) {
  await (adapter as SqliteAdapter).rawQuery(stmt + ';', { method: 'POST' });
}
for (const idx of HAZO_FILES_TABLE_SCHEMA.sqlite.indexes) {
  await (adapter as SqliteAdapter).rawQuery(idx, { method: 'POST' });
}

// Initialize naming conventions table
const namingStatements = HAZO_FILES_NAMING_TABLE_SCHEMA.sqlite.ddl
  .split(';')
  .filter(s => s.trim());
for (const stmt of namingStatements) {
  await (adapter as SqliteAdapter).rawQuery(stmt + ';', { method: 'POST' });
}
for (const idx of HAZO_FILES_NAMING_TABLE_SCHEMA.sqlite.indexes) {
  await (adapter as SqliteAdapter).rawQuery(idx, { method: 'POST' });
}
```

### b. Column Reference

**hazo_files table:**
- `id` - Primary key (UUID)
- `filename` - File/folder name
- `file_type` - MIME type or 'folder'
- `file_data` - JSON metadata and extractions
- `created_at` - Creation timestamp
- `changed_at` - Last modification timestamp
- `file_path` - Virtual path
- `storage_type` - 'local' or 'google_drive'
- `file_hash` - xxHash for change detection
- `file_size` - Size in bytes
- `file_changed_at` - Content change timestamp

**hazo_files_naming table:**
- `id` - Primary key (UUID)
- `scope_id` - Links to hazo_scopes (optional)
- `naming_title` - Display name
- `naming_type` - 'file', 'folder', or 'both'
- `naming_value` - JSON NamingRuleSchema
- `created_at` - Creation timestamp
- `changed_at` - Last modification timestamp
- `variables` - JSON array of NamingVariable

## 3. Server Setup

### Option A: Using Factory

```typescript
// server/hazo-files.ts
import { createHazoFilesServer } from 'hazo_files/server';
import { createCrudService } from 'hazo_connect/server';

export async function getHazoFiles() {
  const fileCrud = createCrudService(adapter, 'hazo_files');
  const namingCrud = createCrudService(adapter, 'hazo_files_naming');

  return createHazoFilesServer({
    crudService: fileCrud,
    namingCrudService: namingCrud,
    config: {
      provider: 'local',
      local: { basePath: './storage/files' }
    },
    enableTracking: true
  });
}
```

### Option B: Manual Setup

```typescript
import {
  TrackedFileManager,
  FileMetadataService,
  NamingConventionService,
  UploadExtractService
} from 'hazo_files';

// Create file manager
const fileManager = new TrackedFileManager({
  config: { provider: 'local', local: { basePath: './files' } },
  crudService: fileCrud,
  tracking: { enabled: true }
});
await fileManager.initialize();

// Create services
const namingService = new NamingConventionService(namingCrud);
const uploadService = new UploadExtractService(fileManager, namingService);
```

## 4. UI Setup (React)

### a. Install UI Dependencies

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### b. Configure Tailwind (v4)

In your `globals.css`:

```css
@import "tailwindcss";

/* Include hazo_files for Tailwind to scan classes */
@source "../node_modules/hazo_files/dist";
```

### c. Use Components

```tsx
import { FileBrowser, NamingConventionManager } from 'hazo_files/ui';

// File Browser
<FileBrowser api={fileBrowserAPI} />

// Naming Convention Manager
<NamingConventionManager api={namingAPI} />
```

## 5. API Routes (Next.js)

### File Operations

```typescript
// app/api/files/route.ts
import { getFileManager } from '@/server/hazo-files';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const path = searchParams.get('path') || '/';

  const { fileManager } = await getHazoFiles();

  switch (action) {
    case 'list':
      return NextResponse.json(await fileManager.listDirectory(path));
    case 'tree':
      return NextResponse.json(await fileManager.getFolderTree(path));
  }
}
```

### Naming Conventions

```typescript
// app/api/naming-conventions/route.ts
import { NamingConventionService } from 'hazo_files';
import { getNamingCrudService } from '@/config/database';

export async function GET() {
  const service = new NamingConventionService(getNamingCrudService());
  const conventions = await service.listParsed();
  return NextResponse.json({ success: true, data: conventions });
}
```

## 6. Environment Variables

```env
# Storage
HAZO_FILES_BASE_PATH=./storage/files

# Database
HAZO_CONNECT_SQLITE_PATH=./data/hazo_files.sqlite
HAZO_FILES_DB_ENABLED=true

# Google Drive (optional)
HAZO_GOOGLE_DRIVE_CLIENT_ID=your-client-id
HAZO_GOOGLE_DRIVE_CLIENT_SECRET=your-client-secret
HAZO_GOOGLE_DRIVE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

## 7. Verification

Run the test-app to verify your setup:

```bash
cd hazo_files
npm run dev:test-app
```

Then open http://localhost:3000 and test:
- [ ] Local Files - file browser works
- [ ] Naming Config - create/edit naming rules
- [ ] Naming Conventions - CRUD for conventions
- [ ] Upload & Extract - upload with conventions
- [ ] File Metadata - view tracked files

## Common Issues

### 1. Module not found: 'fs'

You're importing server code in a client component. Use the `/server` entry point:

```typescript
// Wrong
import { TrackedFileManager } from 'hazo_files';

// Right (server only)
import { TrackedFileManager } from 'hazo_files/server';
```

### 2. Tailwind classes not applied

Add `@source` directive for hazo_files in your CSS:

```css
@source "../node_modules/hazo_files/dist";
```

### 3. Database not initialized

Ensure you call `initializeDatabase()` before using services:

```typescript
await initializeDatabase();
const crud = getCrudService();
```
