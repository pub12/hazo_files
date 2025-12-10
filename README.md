# hazo_files

[![npm version](https://img.shields.io/npm/v/hazo_files.svg)](https://www.npmjs.com/package/hazo_files)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful, modular file management package for Node.js and React applications with support for local filesystem and Google Drive storage. Built with TypeScript for type safety and developer experience.

## Features

- **Multiple Storage Providers**: Local filesystem and Google Drive support out of the box
- **Modular Architecture**: Easily add custom storage providers
- **Unified API**: Single consistent interface across all storage providers
- **React UI Components**: Drop-in FileBrowser component with folder tree, file list, and preview
- **Naming Rules System**: Visual configurator and utilities for generating consistent file/folder names
- **TypeScript**: Full type safety and IntelliSense support
- **OAuth Integration**: Built-in Google Drive OAuth authentication
- **Progress Tracking**: Upload/download progress callbacks
- **File Validation**: Extension filtering and file size limits
- **Error Handling**: Comprehensive error types and handling

## Installation

```bash
npm install hazo_files
```

For React UI components, ensure you have React 18+ installed:

```bash
npm install react react-dom
```

For the NamingRuleConfigurator component (drag-and-drop interface), also install:

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

## Quick Start

### Basic Usage (Server-side)

```typescript
import { createInitializedFileManager } from 'hazo_files';

// Create and initialize file manager
const fileManager = await createInitializedFileManager({
  config: {
    provider: 'local',
    local: {
      basePath: './files',
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedExtensions: ['jpg', 'png', 'pdf', 'txt']
    }
  }
});

// Create a directory
await fileManager.createDirectory('/documents');

// Upload a file
await fileManager.uploadFile(
  './local-file.pdf',
  '/documents/file.pdf',
  {
    onProgress: (progress, bytes, total) => {
      console.log(`Upload progress: ${progress}%`);
    }
  }
);

// List directory contents
const result = await fileManager.listDirectory('/documents');
if (result.success) {
  console.log(result.data);
}

// Download a file
await fileManager.downloadFile('/documents/file.pdf', './downloaded.pdf');
```

### Using Configuration File

Create `hazo_files_config.ini` in your project root:

```ini
[general]
provider = local

[local]
base_path = ./files
max_file_size = 10485760
allowed_extensions = jpg,png,pdf,txt
```

Then initialize without config object:

```typescript
import { createInitializedFileManager } from 'hazo_files';

const fileManager = await createInitializedFileManager();
```

### React UI Component

```typescript
import { FileBrowser } from 'hazo_files/ui';
import type { FileBrowserAPI } from 'hazo_files/ui';

// Create an API adapter that calls your server endpoints
const api: FileBrowserAPI = {
  async listDirectory(path: string) {
    const res = await fetch(`/api/files?action=list&path=${path}`);
    return res.json();
  },
  async getFolderTree(path = '/', depth = 3) {
    const res = await fetch(`/api/files?action=tree&path=${path}&depth=${depth}`);
    return res.json();
  },
  async uploadFile(file: File, remotePath: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', remotePath);
    const res = await fetch('/api/files/upload', { method: 'POST', body: formData });
    return res.json();
  },
  // ... implement other methods
};

function MyFileBrowser() {
  return (
    <FileBrowser
      api={api}
      initialPath="/"
      showPreview={true}
      showTree={true}
      viewMode="grid"
    />
  );
}
```

## Advanced Usage

### Google Drive Integration

#### 1. Set up Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the Google Drive API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs (e.g., `http://localhost:3000/api/auth/callback/google`)

#### 2. Configure Environment Variables

Create `.env.local`:

```env
GOOGLE_DRIVE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_DRIVE_CLIENT_SECRET=your-client-secret
GOOGLE_DRIVE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google
```

#### 3. Configure hazo_files

```ini
[general]
provider = google_drive

[google_drive]
client_id =
client_secret =
redirect_uri = http://localhost:3000/api/auth/callback/google
refresh_token =
```

Environment variables will automatically override empty values.

#### 4. Implement OAuth Flow

```typescript
import { createFileManager, GoogleDriveModule } from 'hazo_files';

// Initialize with Google Drive
const fileManager = createFileManager({
  config: {
    provider: 'google_drive',
    google_drive: {
      clientId: process.env.GOOGLE_DRIVE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET!,
      redirectUri: process.env.GOOGLE_DRIVE_REDIRECT_URI!,
    }
  }
});

await fileManager.initialize();

// Get the Google Drive module to access auth methods
const module = fileManager.getModule() as GoogleDriveModule;
const auth = module.getAuth();

// Generate auth URL
const authUrl = auth.getAuthUrl();
console.log('Visit:', authUrl);

// After user authorizes, exchange code for tokens
const tokens = await auth.exchangeCodeForTokens(authCode);

// Authenticate the module
await module.authenticate(tokens);

// Now you can use the file manager
await fileManager.createDirectory('/MyFolder');
```

### Next.js API Route Example

```typescript
// app/api/files/route.ts
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

### File Upload API Route

```typescript
// app/api/files/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createInitializedFileManager } from 'hazo_files';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const path = formData.get('path') as string;

  const fm = await getFileManager();

  // Convert File to Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const result = await fm.uploadFile(buffer, path);
  return NextResponse.json(result);
}
```

### Progress Tracking

```typescript
// Upload with progress tracking
await fileManager.uploadFile(
  './large-file.zip',
  '/uploads/large-file.zip',
  {
    onProgress: (progress, bytesTransferred, totalBytes) => {
      console.log(`Progress: ${progress.toFixed(2)}%`);
      console.log(`${bytesTransferred} / ${totalBytes} bytes`);
    }
  }
);

// Download with progress tracking
await fileManager.downloadFile(
  '/uploads/large-file.zip',
  './downloaded-file.zip',
  {
    onProgress: (progress, bytesTransferred, totalBytes) => {
      console.log(`Download: ${progress.toFixed(2)}%`);
    }
  }
);
```

### File Operations

```typescript
// Create directory structure
await fileManager.createDirectory('/projects/2024/docs');

// Upload file
const uploadResult = await fileManager.uploadFile(
  buffer,
  '/projects/2024/docs/report.pdf'
);

// Move file
await fileManager.moveItem(
  '/projects/2024/docs/report.pdf',
  '/archive/2024/report.pdf'
);

// Rename file
await fileManager.renameFile(
  '/archive/2024/report.pdf',
  'annual-report.pdf'
);

// Copy file (convenience method)
await fileManager.copyFile(
  '/archive/2024/annual-report.pdf',
  '/backup/annual-report.pdf'
);

// Delete file
await fileManager.deleteFile('/backup/annual-report.pdf');

// Remove directory (recursive)
await fileManager.removeDirectory('/archive/2024', true);

// Check if file exists
const exists = await fileManager.exists('/projects/2024/docs');

// Get file/folder information
const itemResult = await fileManager.getItem('/projects/2024/docs/report.pdf');
if (itemResult.success && itemResult.data) {
  console.log('File:', itemResult.data.name);
  console.log('Size:', itemResult.data.size);
  console.log('Modified:', itemResult.data.modifiedAt);
}

// List directory with options
const listResult = await fileManager.listDirectory('/projects', {
  recursive: true,
  includeHidden: false,
  filter: (item) => !item.isDirectory && item.name.endsWith('.pdf')
});
```

### Working with Text Files

```typescript
// Write text file
await fileManager.writeFile('/notes/readme.txt', 'Hello, World!');

// Read text file
const readResult = await fileManager.readFile('/notes/readme.txt');
if (readResult.success) {
  console.log(readResult.data); // "Hello, World!"
}
```

### Folder Tree

```typescript
// Get folder tree (3 levels deep by default)
const treeResult = await fileManager.getFolderTree('/projects', 3);
if (treeResult.success && treeResult.data) {
  console.log(JSON.stringify(treeResult.data, null, 2));
}

// Output:
// [
//   {
//     "id": "abc123",
//     "name": "2024",
//     "path": "/projects/2024",
//     "children": [
//       {
//         "id": "def456",
//         "name": "docs",
//         "path": "/projects/2024/docs",
//         "children": []
//       }
//     ]
//   }
// ]
```

## Configuration

### Configuration File (`hazo_files_config.ini`)

```ini
[general]
provider = local

[local]
base_path = ./files
allowed_extensions = jpg,png,pdf,txt,doc,docx
max_file_size = 10485760

[google_drive]
client_id = your-client-id.apps.googleusercontent.com
client_secret = your-client-secret
redirect_uri = http://localhost:3000/api/auth/callback/google
refresh_token =
access_token =
root_folder_id =

[naming]
; Supported date format tokens for naming rules
date_formats = YYYY,YY,MM,M,DD,D,MMM,MMMM,YYYY-MM-DD,YYYY-MMM-DD,DD-MM-YYYY,MM-DD-YYYY
```

### Environment Variables

The following environment variables can override configuration file values:

- `GOOGLE_DRIVE_CLIENT_ID`
- `GOOGLE_DRIVE_CLIENT_SECRET`
- `GOOGLE_DRIVE_REDIRECT_URI`
- `GOOGLE_DRIVE_REFRESH_TOKEN`
- `GOOGLE_DRIVE_ACCESS_TOKEN`
- `GOOGLE_DRIVE_ROOT_FOLDER_ID`

### Configuration via Code

```typescript
import { createInitializedFileManager } from 'hazo_files';

const fileManager = await createInitializedFileManager({
  config: {
    provider: 'local',
    local: {
      basePath: './storage',
      allowedExtensions: ['jpg', 'png', 'gif', 'pdf'],
      maxFileSize: 5 * 1024 * 1024 // 5MB
    }
  }
});
```

## UI Components

### FileBrowser Component

The `FileBrowser` is a complete, drop-in file management UI with:

- Folder tree navigation
- File list (grid or list view)
- Breadcrumb navigation
- File preview (images, text, PDFs)
- Context menus and actions
- Upload, download, rename, delete operations
- Drag-and-drop support (if implemented in API)

```typescript
import { FileBrowser } from 'hazo_files/ui';

<FileBrowser
  api={api}
  initialPath="/"
  showPreview={true}
  showTree={true}
  viewMode="grid"
  treeWidth={250}
  previewHeight={300}
  onError={(error) => console.error(error)}
  onNavigate={(path) => console.log('Navigated to:', path)}
  onSelect={(item) => console.log('Selected:', item)}
/>
```

### Individual Components

You can also use individual components:

```typescript
import {
  PathBreadcrumb,
  FolderTree,
  FileList,
  FilePreview,
  FileActions
} from 'hazo_files/ui';

// Use individually with your own layout
```

### Hooks

```typescript
import { useFileBrowser, useFileOperations } from 'hazo_files/ui';

function MyCustomFileBrowser() {
  const {
    currentPath,
    files,
    tree,
    selectedItem,
    isLoading,
    navigate,
    refresh,
    selectItem
  } = useFileBrowser(api, '/');

  const {
    createFolder,
    uploadFiles,
    deleteItem,
    renameItem
  } = useFileOperations(api, currentPath);

  // Build your custom UI
}
```

### Naming Rule Configurator

Build consistent file/folder naming patterns with a visual drag-and-drop interface:

```typescript
import { NamingRuleConfigurator } from 'hazo_files/ui';
import type { NamingVariable } from 'hazo_files/ui';

function NamingConfig() {
  // Define user-specific variables
  const userVariables: NamingVariable[] = [
    {
      variable_name: 'project_name',
      description: 'Name of the project',
      example_value: 'WebApp',
      category: 'user'
    },
    {
      variable_name: 'client_id',
      description: 'Client identifier',
      example_value: 'ACME',
      category: 'user'
    },
  ];

  const handleSchemaChange = (schema) => {
    console.log('New schema:', schema);
    // Save to database or state
  };

  const handleExport = (schema) => {
    // Export as JSON file
    const blob = new Blob([JSON.stringify(schema, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'naming-rule.json';
    a.click();
  };

  return (
    <NamingRuleConfigurator
      variables={userVariables}
      onChange={handleSchemaChange}
      onExport={handleExport}
      sampleFileName="proposal.pdf"
    />
  );
}
```

The configurator provides:
- **Category Tabs**: User, Date, File, Counter variables
- **Drag & Drop**: Build patterns by dragging variables into file/folder patterns
- **Segment Reordering**: Drag segments within patterns to reorder them
- **Live Preview**: See generated names in real-time with example values
- **Undo/Redo**: Full history with keyboard shortcuts (Ctrl+Z, Ctrl+Y)
- **Import/Export**: Save and load naming rules as JSON
- **Scrollable Layout**: Works in fixed-height containers with scrollable content area

System variables included:
- **Date**: YYYY, YY, MM, DD, YYYY-MM-DD, MMM, MMMM, etc.
- **File**: original_name, extension, ext
- **Counter**: counter (auto-incrementing with padding)

## Naming Rules API

Generate file and folder names programmatically from naming schemas:

```typescript
import {
  hazo_files_generate_file_name,
  hazo_files_generate_folder_name,
  createVariableSegment,
  createLiteralSegment,
  type NamingRuleSchema
} from 'hazo_files';

// Create a naming schema
const schema: NamingRuleSchema = {
  version: 1,
  filePattern: [
    createVariableSegment('client_id'),
    createLiteralSegment('_'),
    createVariableSegment('project_name'),
    createLiteralSegment('_'),
    createVariableSegment('YYYY-MM-DD'),
    createLiteralSegment('_'),
    createVariableSegment('counter'),
  ],
  folderPattern: [
    createVariableSegment('YYYY'),
    createLiteralSegment('/'),
    createVariableSegment('client_id'),
    createLiteralSegment('/'),
    createVariableSegment('project_name'),
  ],
};

// Define variable values
const variables = {
  client_id: 'ACME',
  project_name: 'Website',
};

// Generate file name
const fileResult = hazo_files_generate_file_name(
  schema,
  variables,
  'original-document.pdf',
  {
    counterValue: 42,
    preserveExtension: true,  // Keep original .pdf extension
    date: new Date('2024-12-09'),
  }
);

if (fileResult.success) {
  console.log(fileResult.name);
  // Output: "ACME_Website_2024-12-09_042.pdf"
}

// Generate folder path
const folderResult = hazo_files_generate_folder_name(schema, variables);

if (folderResult.success) {
  console.log(folderResult.name);
  // Output: "2024/ACME/Website"
}

// Use with FileManager
const uploadPath = `/${folderResult.name}/${fileResult.name}`;
await fileManager.uploadFile(buffer, uploadPath);
```

### Available System Variables

**Date Variables** (use current date unless overridden):
- `YYYY` - Full year (2024)
- `YY` - Two-digit year (24)
- `MM` - Month with zero padding (01-12)
- `M` - Month without padding (1-12)
- `DD` - Day with zero padding (01-31)
- `D` - Day without padding (1-31)
- `MMM` - Short month name (Jan, Feb, etc.)
- `MMMM` - Full month name (January, February, etc.)
- `YYYY-MM-DD` - ISO date format (2024-01-15)
- `YYYY-MMM-DD` - Date with month name (2024-Jan-15)
- `DD-MM-YYYY` - European format (15-01-2024)
- `MM-DD-YYYY` - US format (01-15-2024)

**File Metadata Variables** (from original filename):
- `original_name` - Filename without extension
- `extension` - File extension with dot (.pdf)
- `ext` - Extension without dot (pdf)

**Counter Variable**:
- `counter` - Auto-incrementing number with zero padding (001, 042, 123)

### Parsing Pattern Strings

You can also parse pattern strings directly:

```typescript
import { parsePatternString, patternToString } from 'hazo_files';

// Parse string to segments
const segments = parsePatternString('{client_id}_{YYYY-MM-DD}_{counter}');
console.log(segments);
// [
//   { id: '...', type: 'variable', value: 'client_id' },
//   { id: '...', type: 'literal', value: '_' },
//   { id: '...', type: 'variable', value: 'YYYY-MM-DD' },
//   { id: '...', type: 'literal', value: '_' },
//   { id: '...', type: 'variable', value: 'counter' },
// ]

// Convert back to string
const patternStr = patternToString(segments);
// "{client_id}_{YYYY-MM-DD}_{counter}"
```

## API Reference

### FileManager

Main service class providing unified file operations.

#### Methods

- `initialize(config?: HazoFilesConfig): Promise<void>` - Initialize the file manager
- `createDirectory(path: string): Promise<OperationResult<FolderItem>>` - Create directory
- `removeDirectory(path: string, recursive?: boolean): Promise<OperationResult>` - Remove directory
- `uploadFile(source, remotePath, options?): Promise<OperationResult<FileItem>>` - Upload file
- `downloadFile(remotePath, localPath?, options?): Promise<OperationResult<Buffer | string>>` - Download file
- `moveItem(sourcePath, destinationPath, options?): Promise<OperationResult<FileSystemItem>>` - Move file/folder
- `deleteFile(path: string): Promise<OperationResult>` - Delete file
- `renameFile(path, newName, options?): Promise<OperationResult<FileItem>>` - Rename file
- `renameFolder(path, newName, options?): Promise<OperationResult<FolderItem>>` - Rename folder
- `listDirectory(path, options?): Promise<OperationResult<FileSystemItem[]>>` - List directory contents
- `getItem(path: string): Promise<OperationResult<FileSystemItem>>` - Get file/folder info
- `exists(path: string): Promise<boolean>` - Check if file/folder exists
- `getFolderTree(path?, depth?): Promise<OperationResult<TreeNode[]>>` - Get folder tree
- `writeFile(path, content, options?): Promise<OperationResult<FileItem>>` - Write text file
- `readFile(path: string): Promise<OperationResult<string>>` - Read text file
- `copyFile(sourcePath, destinationPath, options?): Promise<OperationResult<FileItem>>` - Copy file
- `ensureDirectory(path: string): Promise<OperationResult<FolderItem>>` - Ensure directory exists

### Types

```typescript
type StorageProvider = 'local' | 'google_drive';

interface FileItem {
  id: string;
  name: string;
  path: string;
  size: number;
  mimeType: string;
  createdAt: Date;
  modifiedAt: Date;
  isDirectory: false;
  parentId?: string;
  metadata?: Record<string, unknown>;
}

interface FolderItem {
  id: string;
  name: string;
  path: string;
  createdAt: Date;
  modifiedAt: Date;
  isDirectory: true;
  parentId?: string;
  children?: (FileItem | FolderItem)[];
  metadata?: Record<string, unknown>;
}

interface OperationResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

interface UploadOptions {
  overwrite?: boolean;
  onProgress?: (progress: number, bytesTransferred: number, totalBytes: number) => void;
  metadata?: Record<string, unknown>;
}
```

See `src/types/index.ts` for complete type definitions.

## Error Handling

hazo_files provides comprehensive error types:

```typescript
import {
  FileNotFoundError,
  DirectoryNotFoundError,
  FileExistsError,
  DirectoryExistsError,
  DirectoryNotEmptyError,
  PermissionDeniedError,
  InvalidPathError,
  FileTooLargeError,
  InvalidExtensionError,
  AuthenticationError,
  ConfigurationError,
  OperationError
} from 'hazo_files';

// Use in try-catch
try {
  await fileManager.uploadFile(buffer, '/files/test.exe');
} catch (error) {
  if (error instanceof InvalidExtensionError) {
    console.error('File type not allowed');
  } else if (error instanceof FileTooLargeError) {
    console.error('File is too large');
  }
}
```

## Extending with Custom Storage Providers

See [docs/ADDING_MODULES.md](docs/ADDING_MODULES.md) for a complete guide on creating custom storage modules.

Quick example:

```typescript
import { BaseStorageModule } from 'hazo_files';
import type { StorageProvider, OperationResult, FileItem } from 'hazo_files';

class S3StorageModule extends BaseStorageModule {
  readonly provider: StorageProvider = 's3' as StorageProvider;

  async initialize(config: HazoFilesConfig): Promise<void> {
    await super.initialize(config);
    // Initialize S3 client
  }

  async uploadFile(source, remotePath, options?): Promise<OperationResult<FileItem>> {
    // Implement S3 upload
  }

  // Implement other required methods...
}

// Register the module
import { registerModule } from 'hazo_files';
registerModule('s3', () => new S3StorageModule());
```

## Testing

The package includes a test application in `test-app/` demonstrating:

- Next.js 14+ integration
- API routes for file operations
- FileBrowser UI component usage
- Local storage and Google Drive switching
- OAuth flow implementation

To run the test app:

```bash
cd test-app
npm install
npm run dev
```

Visit `http://localhost:3000`

## Browser Compatibility

The UI components require:

- Modern browsers with ES2020+ support
- React 18+
- CSS Grid and Flexbox support

Server-side code requires Node.js 16+

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Commit your changes with clear messages
4. Add tests for new functionality
5. Submit a pull request

## Support

- GitHub Issues: [https://github.com/pub12/hazo_files/issues](https://github.com/pub12/hazo_files/issues)
- Documentation: [https://github.com/pub12/hazo_files](https://github.com/pub12/hazo_files)

## Roadmap

- Amazon S3 storage module
- Dropbox storage module
- OneDrive storage module
- WebDAV support
- Advanced search and filtering
- Batch operations
- File versioning
- Sharing and permissions

## Credits

Created by Pubs Abayasiri

Built with:
- TypeScript
- React
- Google APIs (googleapis)
- tsup for building
