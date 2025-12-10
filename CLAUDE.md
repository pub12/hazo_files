# hazo_files - AI Reference Guide

AI-optimized technical reference for the hazo_files package. This document is designed for Claude and other AI assistants to quickly understand the project structure and implement features correctly.

## Project Overview

**Purpose**: Universal file management package supporting multiple storage backends (local, Google Drive) with a unified API and React UI components.

**Core Philosophy**:
- Provider-agnostic: Single API works across all storage types
- Type-safe: Full TypeScript with comprehensive types
- Modular: Easy to add new storage providers
- Server + Client: Works in Node.js servers and React browsers

**Key Use Cases**:
1. Building file management UIs in Next.js/React apps
2. Server-side file operations with multiple storage backends
3. Google Drive integration with OAuth
4. Custom storage provider implementations

## Architecture Overview

```
hazo_files/
├── Core Layer (TypeScript)
│   ├── FileManager (main service)
│   ├── StorageModule interface (contract)
│   ├── Configuration system (INI + env vars)
│   └── Naming system (file/folder name generation)
├── Module Layer (storage providers)
│   ├── LocalStorageModule (filesystem)
│   └── GoogleDriveModule (Drive API + OAuth)
├── UI Layer (React components)
│   ├── FileBrowser (complete solution)
│   ├── NamingRuleConfigurator (naming pattern builder)
│   └── Individual components + hooks
└── Common Layer (utilities)
    ├── Error types (12 specific errors)
    ├── Path utilities (normalization, joining)
    ├── MIME type detection
    ├── Naming utilities (pattern generation)
    └── Helper functions
```

## Critical Patterns

### 1. Module System

All storage providers implement `StorageModule` interface:

```typescript
interface StorageModule {
  readonly provider: StorageProvider;
  initialize(config: HazoFilesConfig): Promise<void>;

  // Directory operations
  createDirectory(path: string): Promise<OperationResult<FolderItem>>;
  removeDirectory(path: string, recursive?: boolean): Promise<OperationResult>;

  // File operations
  uploadFile(source, remotePath, options?): Promise<OperationResult<FileItem>>;
  downloadFile(remotePath, localPath?, options?): Promise<OperationResult<Buffer | string>>;
  moveItem(sourcePath, destinationPath, options?): Promise<OperationResult<FileSystemItem>>;
  deleteFile(path: string): Promise<OperationResult>;
  renameFile(path, newName, options?): Promise<OperationResult<FileItem>>;
  renameFolder(path, newName, options?): Promise<OperationResult<FolderItem>>;

  // Query operations
  listDirectory(path, options?): Promise<OperationResult<FileSystemItem[]>>;
  getItem(path: string): Promise<OperationResult<FileSystemItem>>;
  exists(path: string): Promise<boolean>;
  getFolderTree(path?, depth?): Promise<OperationResult<TreeNode[]>>;
}
```

**Implementation Pattern**: Extend `BaseStorageModule` which provides:
- Common initialization logic
- Path utility methods (normalizePath, joinPath, etc.)
- Result helpers (successResult, errorResult)
- Default `getFolderTree` implementation

### 2. Path System

**Virtual Paths**: All modules work with virtual paths (Unix-style: `/folder/file.txt`)

**Local Module Mapping**:
- Virtual path `/documents/file.pdf` → Physical path `{basePath}/documents/file.pdf`
- Conversion: `resolveFullPath()` and `toVirtualPath()`

**Google Drive Mapping**:
- Virtual path `/documents/file.pdf` → Drive folder hierarchy lookup
- Root can be custom folder ID or Drive root
- Path segments resolved recursively via Drive API queries

**Path Rules**:
- Always start with `/`
- Use forward slashes only
- No trailing slashes for files
- Empty path defaults to `/`

### 3. Result Pattern

All operations return `OperationResult<T>`:

```typescript
interface OperationResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// Usage
const result = await fileManager.createDirectory('/test');
if (result.success) {
  console.log(result.data); // FolderItem
} else {
  console.error(result.error);
}
```

**Why**: Avoids throwing exceptions for expected failures (file not found, etc.)

### 4. Configuration System

**Priority Order** (highest to lowest):
1. Programmatic config passed to constructor
2. Environment variables
3. INI file (`hazo_files_config.ini`)
4. Defaults

**Environment Variable Mapping**:
- `GOOGLE_DRIVE_CLIENT_ID` → `google_drive.clientId`
- `GOOGLE_DRIVE_CLIENT_SECRET` → `google_drive.clientSecret`
- `GOOGLE_DRIVE_REDIRECT_URI` → `google_drive.redirectUri`
- `GOOGLE_DRIVE_REFRESH_TOKEN` → `google_drive.refreshToken`
- `GOOGLE_DRIVE_ACCESS_TOKEN` → `google_drive.accessToken`
- `GOOGLE_DRIVE_ROOT_FOLDER_ID` → `google_drive.rootFolderId`

**Config Loading**:
```typescript
// Sync (blocks)
const config = loadConfig('./custom-config.ini');

// Async (preferred)
const config = await loadConfigAsync('./custom-config.ini');

// Via FileManager
const fm = await createInitializedFileManager({
  config: { provider: 'local', local: { basePath: './files' } }
});
```

## Storage Modules

### LocalStorageModule

**Location**: `src/modules/local/index.ts`

**Key Features**:
- Direct Node.js `fs` operations
- Extension filtering via `allowedExtensions`
- Size limits via `maxFileSize`
- Recursive directory operations
- Progress tracking for streams

**Critical Methods**:
- `resolveFullPath(virtualPath)`: Virtual → absolute filesystem path
- `toVirtualPath(absolutePath)`: Absolute → virtual path
- `validateExtension(filename)`: Throws `InvalidExtensionError` if not allowed
- `validateFileSize(size, filename)`: Throws `FileTooLargeError` if exceeds limit

**Gotchas**:
- Always creates parent directories automatically
- `basePath` is resolved to absolute path on init
- Relative paths in config are resolved from `process.cwd()`

### GoogleDriveModule

**Location**: `src/modules/google-drive/index.ts`

**Key Features**:
- Google Drive API v3 integration
- OAuth 2.0 authentication with refresh
- Path-to-ID resolution caching concept (not implemented, but needed)
- Folder hierarchy traversal
- Metadata storage in item objects

**Authentication Flow**:
1. Create module with OAuth credentials
2. Generate auth URL: `module.getAuth().getAuthUrl()`
3. User authorizes, get auth code
4. Exchange code: `auth.exchangeCodeForTokens(code)`
5. Module is now authenticated

**Auth Callbacks**:
```typescript
setAuthCallbacks({
  onTokensUpdated: async (tokens) => {
    // Save tokens to database/file
  },
  getStoredTokens: async () => {
    // Retrieve saved tokens
    return { accessToken, refreshToken, expiryDate };
  }
});
```

**Critical Methods**:
- `getIdFromPath(path, createIfMissing)`: Resolve virtual path to Drive file ID
- `getPathFromId(fileId)`: Build virtual path from Drive file ID
- `ensureAuthenticated()`: Check auth, throw if not authenticated
- `driveFileToItem(file, virtualPath)`: Convert Drive file to FileSystemItem

**Performance Considerations**:
- Each path resolution requires API calls for each segment
- No caching implemented (opportunity for optimization)
- Batch operations not used (opportunity for optimization)

**Gotchas**:
- Must call `ensureAuthenticated()` before every operation
- Token auto-refresh via `oauth2Client.on('tokens')` event
- Folder MIME type: `application/vnd.google-apps.folder`
- Trash vs permanent delete (currently uses trash)

## UI Components

### FileBrowser Component

**Location**: `src/ui/components/FileBrowser.tsx`

**Architecture**:
```
┌─────────────────────────────────────┐
│ PathBreadcrumb | FileActions        │  Header
├──────────┬──────────────────────────┤
│ Folder   │ FileList                 │  Main
│ Tree     │ (grid or list view)      │
├──────────┴──────────────────────────┤
│ FilePreview                          │  Footer
└─────────────────────────────────────┘
```

**Props Pattern**:
- `api: FileBrowserAPI` - Required adapter to backend
- Layout controls: `showPreview`, `showTree`, `viewMode`
- Sizing: `treeWidth`, `previewHeight`
- Callbacks: `onError`, `onNavigate`, `onSelect`

**State Management**:
- Internal state for current path, files, tree, selection
- Callbacks trigger on navigation/selection
- Dialogs managed via boolean flags

**API Adapter Pattern**:
```typescript
const api: FileBrowserAPI = {
  listDirectory: (path) => fetch(`/api/files?action=list&path=${path}`).then(r => r.json()),
  uploadFile: (file, path) => { /* FormData upload */ },
  // ... other methods must return OperationResult
};
```

**Critical**: All API methods must return `OperationResult<T>` format

### Component Hierarchy

**Standalone Components**:
- `PathBreadcrumb` - Clickable path navigation
- `FolderTree` - Hierarchical folder view with expand/collapse
- `FileList` - Grid or list file display with selection
- `FilePreview` - Preview pane for images, text, PDFs
- `FileActions` - Action buttons toolbar

**Dialogs**:
- `CreateFolderDialog` - Folder name input
- `RenameDialog` - Rename file/folder
- `DeleteConfirmDialog` - Deletion confirmation
- `UploadDialog` - File upload interface

**Hooks**:
- `useFileBrowser` - Main state management hook
- `useFileOperations` - Operation execution hook
- `useMultiFileOperations` - Batch operations
- `useNamingRule` - Naming pattern state with undo/redo

### NamingRuleConfigurator Component

**Location**: `src/ui/components/naming/NamingRuleConfigurator.tsx`

**Architecture**:
```
┌─────────────────────────────────────┐
│ VariableList (Category Tabs)        │  Variables Panel
│ [User] [Date] [File] [Counter]      │
├─────────────────────────────────────┤
│ PatternBuilder                       │  Pattern Builder
│ - File Pattern: drag/drop zones     │
│ - Folder Pattern: drag/drop zones   │
├─────────────────────────────────────┤
│ PatternPreview                       │  Live Preview
│ - Generated file name                │
│ - Generated folder path              │
├─────────────────────────────────────┤
│ Actions: Undo | Redo | Import | Export│  Action Bar
└─────────────────────────────────────┘
```

**Purpose**: Interactive UI for building file/folder naming rules using drag-and-drop variables and literal text.

**Props Pattern**:
- `variables: NamingVariable[]` - User-defined variables (e.g., project_name, client_id)
- `initialSchema?: NamingRuleSchema` - Load existing rule for editing
- `onChange?: (schema) => void` - Callback on every pattern change
- `onExport?: (schema) => void` - Export JSON schema
- `onImport?: (schema) => void` - Import JSON schema
- `customDateFormats?: string[]` - Override default date formats
- `readOnly?: boolean` - Disable editing
- `sampleFileName?: string` - Example file for preview (default: "document.pdf")

**Usage Example**:
```typescript
import { NamingRuleConfigurator } from 'hazo_files/ui';

const userVariables = [
  { variable_name: 'project_name', description: 'Project name', example_value: 'WebApp', category: 'user' },
  { variable_name: 'client_id', description: 'Client ID', example_value: 'ACME', category: 'user' },
];

<NamingRuleConfigurator
  variables={userVariables}
  onChange={(schema) => saveSchema(schema)}
  sampleFileName="proposal.pdf"
/>
```

**Subcomponents**:
- `VariableList` - Category tabs with draggable variables
- `PatternBuilder` - Drop zones for file and folder patterns
- `PatternPreview` - Live preview with example values
- `DraggableVariable` - Individual variable chips
- `PatternSegmentItem` - Segments in the pattern (variable or literal)
- `SeparatorPicker` - Quick-add common separators (-, _, space, etc.)

**Keyboard Shortcuts**:
- `Ctrl+Z` / `Cmd+Z` - Undo
- `Ctrl+Y` / `Cmd+Y` - Redo
- `Ctrl+Shift+Z` / `Cmd+Shift+Z` - Redo (alternative)

**Drag-and-Drop Architecture**:

**Critical Design Pattern**: Single Parent DndContext

The component uses a single DndContext at the top level (NamingRuleConfigurator) that handles ALL drag-and-drop operations. Child components (PatternBuilder, PatternSegmentItem) use only droppable/sortable contexts, never nested DndContext.

```
NamingRuleConfigurator (DndContext - TOP LEVEL ONLY)
├── PointerSensor (8px activation distance)
├── DragOverlay (visual feedback during drag)
├── handleDragStart (track active variable)
└── handleDragEnd (handle both cases):
    ├── Case 1: New variable drop
    │   └── Detect target (file-pattern-drop / folder-pattern-drop)
    └── Case 2: Segment reordering
        └── Call reorderFilePattern / reorderFolderPattern

PatternBuilder (NO DndContext)
├── SortableContext (for reordering segments)
├── useDroppable (for drop zone)
└── PatternSegmentItem (useSortable)
```

**Why This Matters**: Nested DndContext blocks drag events from parent. Initially, PatternBuilder had its own DndContext which prevented variables from being dragged into patterns. The fix removed the nested context and moved all drag handling to the parent.

**Drag Event Flow**:
1. User drags variable from VariableList
2. handleDragStart captures variable data, shows DragOverlay
3. User drops on pattern drop zone or segment
4. handleDragEnd determines action:
   - If dropped on drop zone: Add to end of pattern
   - If dropped on segment: Insert after that segment
   - If reordering segment: Call reorder function with indices
5. DragOverlay hidden, activeVariable cleared

**Sensors Configuration**:
- `PointerSensor` with 8px activation distance prevents accidental drags
- `closestCenter` collision detection for accurate drop targeting

## Common Utilities

### Error Types

**Location**: `src/common/errors.ts`

12 specific error types, all extend `HazoFilesError`:

1. `FileNotFoundError` - File doesn't exist
2. `DirectoryNotFoundError` - Directory doesn't exist
3. `FileExistsError` - File already exists
4. `DirectoryExistsError` - Directory already exists
5. `DirectoryNotEmptyError` - Cannot delete non-empty directory
6. `PermissionDeniedError` - Access denied
7. `InvalidPathError` - Malformed path
8. `FileTooLargeError` - Exceeds size limit
9. `InvalidExtensionError` - Extension not allowed
10. `AuthenticationError` - Auth failure
11. `ConfigurationError` - Config issue
12. `OperationError` - Generic operation failure

**Usage Pattern**:
```typescript
try {
  await module.uploadFile(buffer, '/test.exe');
} catch (error) {
  if (error instanceof InvalidExtensionError) {
    return errorResult(error.message);
  }
  throw error; // Unexpected errors re-throw
}
```

### Path Utilities

**Location**: `src/common/path-utils.ts`

Key functions:
- `normalizePath(path)` - Normalize to Unix style, remove trailing slash
- `joinPath(...segments)` - Join and normalize
- `getParentPath(path)` - Get parent directory
- `getBaseName(path)` - Get filename/folder name
- `getDirName(path)` - Get directory portion
- `validatePath(path)` - Check valid path format
- `sanitizeFilename(name)` - Remove unsafe characters
- `getExtension(path)` - Get file extension with dot
- `getBreadcrumbs(path)` - Array of path segments for breadcrumb

**Pattern**: All path operations use these utilities, never raw string manipulation

### MIME Types

**Location**: `src/common/mime-types.ts`

- `getMimeType(filename)` - Detect MIME from extension
- `getExtensionFromMime(mimeType)` - Reverse lookup
- `isImage(mimeType)` - Image check
- `isVideo(mimeType)` - Video check
- `isAudio(mimeType)` - Audio check
- `isText(mimeType)` - Text check
- `isDocument(mimeType)` - Document check
- `isPreviewable(mimeType)` - Can preview in browser
- `getFileCategory(mimeType)` - Category string

### Naming Utilities

**Location**: `src/common/naming-utils.ts`

**Purpose**: Generate file/folder names from naming rule schemas with variable substitution.

**Core Functions**:
- `hazo_files_generate_file_name(schema, variables, originalFileName?, options?)` - Generate file name from pattern
- `hazo_files_generate_folder_name(schema, variables, options?)` - Generate folder path from pattern
- `validateNamingRuleSchema(schema)` - Validate schema structure
- `createEmptyNamingRuleSchema()` - Create blank schema

**Pattern Manipulation**:
- `parsePatternString(patternStr)` - Parse "{var}text" to segments
- `patternToString(pattern)` - Convert segments to "{var}text"
- `createVariableSegment(name)` - Create variable segment
- `createLiteralSegment(text)` - Create literal segment
- `clonePattern(pattern)` - Deep clone with new IDs
- `generateSegmentId()` - Unique ID for segments

**Variable Detection**:
- `isDateVariable(varName, dateFormats?)` - Check if date variable
- `isFileMetadataVariable(varName)` - Check if file variable
- `isCounterVariable(varName)` - Check if counter variable

**Formatting**:
- `formatDateToken(date, format)` - Format date to token value
- `formatCounter(value, digits)` - Pad counter with zeros
- `getFileMetadataValues(filename)` - Extract original_name, extension, ext
- `getSystemVariablePreviewValues(date?, options?)` - Get all system variable values
- `generatePreviewName(pattern, userVariables, options?)` - Preview name with examples

**System Variables**:
- `SYSTEM_DATE_VARIABLES` - Array of date variables (YYYY, MM, DD, etc.)
- `SYSTEM_FILE_VARIABLES` - Array of file variables (original_name, extension, ext)
- `SYSTEM_COUNTER_VARIABLES` - Array of counter variables (counter)
- `ALL_SYSTEM_VARIABLES` - Combined array of all system variables
- `DEFAULT_DATE_FORMATS` - Default supported date format tokens

**Usage Example**:
```typescript
import {
  hazo_files_generate_file_name,
  hazo_files_generate_folder_name,
  createVariableSegment,
  createLiteralSegment
} from 'hazo_files';

const schema = {
  version: 1,
  filePattern: [
    createVariableSegment('project_name'),
    createLiteralSegment('_'),
    createVariableSegment('YYYY-MM-DD'),
    createLiteralSegment('_'),
    createVariableSegment('counter'),
  ],
  folderPattern: [
    createVariableSegment('client_id'),
    createLiteralSegment('/'),
    createVariableSegment('YYYY'),
  ],
};

const userVars = {
  project_name: 'WebApp',
  client_id: 'ACME',
};

// Generate file name
const fileResult = hazo_files_generate_file_name(
  schema,
  userVars,
  'original.pdf',
  { counterValue: 42, preserveExtension: true }
);
// Result: { success: true, name: 'WebApp_2024-12-09_042.pdf' }

// Generate folder path
const folderResult = hazo_files_generate_folder_name(schema, userVars);
// Result: { success: true, name: 'ACME/2024' }
```

**Name Generation Options**:
```typescript
interface NameGenerationOptions {
  dateFormats?: string[];          // Override default date formats
  date?: Date;                     // Date for date variables (default: now)
  preserveExtension?: boolean;     // Preserve original extension (default: true)
  counterValue?: number;           // Counter value (default: 1)
  counterDigits?: number;          // Counter padding digits (default: 3)
}
```

**Pattern Segment Structure**:
```typescript
interface PatternSegment {
  id: string;                      // Unique ID for React/drag-drop
  type: 'variable' | 'literal';    // Segment type
  value: string;                   // Variable name or literal text
}
```

**Gotchas**:
- Date variables use current date unless overridden via options.date
- Counter is formatted with 3 digits by default (001, 042, 123)
- File extension preservation is automatic unless preserveExtension=false
- Folder patterns can include "/" for nested paths
- All generated names are sanitized via sanitizeFilename()
- Missing variable values return error result, not exception

## Integration Patterns

### Next.js App Router

**API Route Pattern** (`app/api/files/route.ts`):
```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const path = searchParams.get('path') || '/';

  const fm = await getFileManager();

  switch (action) {
    case 'list': return NextResponse.json(await fm.listDirectory(path));
    case 'tree': return NextResponse.json(await fm.getFolderTree(path));
    // ...
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, ...params } = body;
  const fm = await getFileManager();

  switch (action) {
    case 'createDirectory': return NextResponse.json(await fm.createDirectory(params.path));
    // ...
  }
}
```

**Upload Route** (`app/api/files/upload/route.ts`):
```typescript
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

### Client-Side API Adapter

**Pattern** (from `test-app/lib/hazo-files.ts`):
```typescript
export function createFileBrowserAPI(provider: 'local' | 'google_drive'): FileBrowserAPI {
  return {
    async listDirectory(path) {
      const res = await fetch(`/api/files?action=list&path=${encodeURIComponent(path)}&provider=${provider}`);
      return res.json();
    },
    async uploadFile(file, remotePath) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', remotePath);
      formData.append('provider', provider);
      const res = await fetch('/api/files/upload', { method: 'POST', body: formData });
      return res.json();
    },
    // ... other methods
  };
}
```

## Performance Considerations

### Local Module

- **Fast**: Direct filesystem access
- **Blocking**: Sync config loading blocks startup
- **Streams**: Use streams for large files to avoid memory issues
- **Progress**: Accurate progress via stream chunks

### Google Drive Module

- **API Quota**: 1,000 queries per 100 seconds per user
- **Latency**: Network round trips for every operation
- **Path Resolution**: O(n) API calls where n = path depth
- **Optimization Opportunities**:
  - Cache path-to-ID mappings
  - Batch API requests
  - Use partial response fields
  - Implement exponential backoff

### UI Components

- **Virtual Scrolling**: Not implemented (needed for large directories)
- **Tree Lazy Loading**: Implemented via `onExpand`
- **File List**: Re-renders on every file change
- **Preview**: Loads full file content (memory issue for large files)

## Testing Strategy

### Unit Tests

- Mock filesystem (`memfs`) for local module tests
- Mock Google APIs for Drive module tests
- Test each operation independently
- Test error conditions

### Integration Tests

- Test-app serves as integration test
- Manual testing of UI components
- OAuth flow testing

### Not Covered

- E2E tests for file operations
- Performance benchmarks
- Load testing
- Browser compatibility matrix

## Common Gotchas

1. **Path separators**: Always use `/`, never backslash
2. **Root path**: Must be `/`, not empty string
3. **File vs Buffer**: `uploadFile` accepts string path, Buffer, or ReadableStream
4. **Download destination**: If `localPath` omitted, returns Buffer
5. **Google Drive auth**: Module can be initialized but not authenticated
6. **Token refresh**: Automatic via googleapis library
7. **Progress callbacks**: Called synchronously, don't use async functions
8. **Extension validation**: Applies only to uploads, not to existing files
9. **Recursive delete**: Must explicitly set `recursive: true`
10. **Virtual paths**: Never expose physical filesystem paths to clients
11. **Nested DndContext**: NEVER nest DndContext components (from @dnd-kit/core). Child contexts block drag events from parent handlers. Always use single top-level DndContext with droppable/sortable children only. See NamingRuleConfigurator for correct pattern.

## Extension Points

### Adding New Storage Provider

1. Create class extending `BaseStorageModule`
2. Implement all `StorageModule` interface methods
3. Add provider type to `StorageProvider` union
4. Add config interface to `HazoFilesConfig`
5. Register via `registerModule(providerName, factory)`
6. Add to module index exports

See `docs/ADDING_MODULES.md` for detailed guide.

### Custom UI Components

- Use `useFileBrowser` hook for state management
- Implement `FileBrowserAPI` for backend calls
- Reuse individual components (FolderTree, FileList, etc.)
- Style with Tailwind classes or custom CSS

### Custom Error Handling

- Extend `HazoFilesError` for domain-specific errors
- Throw from module operations
- Catch in FileManager layer
- Return via `OperationResult.error`

## Dependencies

**Runtime**:
- `googleapis` - Google Drive API client
- `ini` - INI file parsing

**Development**:
- `typescript` - Type checking
- `tsup` - Build tool (uses esbuild)
- `vitest` - Testing framework

**Peer** (UI components):
- `react` ^18.0.0
- `react-dom` ^18.0.0
- `@dnd-kit/core` - Drag and drop for naming configurator
- `@dnd-kit/sortable` - Sortable lists for naming configurator
- `@dnd-kit/utilities` - Utility functions for drag and drop

## Build System

**Tool**: tsup (esbuild wrapper)

**Outputs**:
- `dist/index.js` - CommonJS build
- `dist/index.mjs` - ESM build
- `dist/index.d.ts` - Type definitions
- `dist/ui/` - Separate UI component build

**Entry Points**:
- Main: `src/index.ts`
- UI: `src/ui/index.ts`

**Exports** (package.json):
```json
{
  ".": {
    "import": "./dist/index.mjs",
    "require": "./dist/index.js",
    "types": "./dist/index.d.ts"
  },
  "./ui": {
    "import": "./dist/ui/index.mjs",
    "require": "./dist/ui/index.js",
    "types": "./dist/ui/index.d.ts"
  }
}
```

## Quick Reference

### File Operations Cheat Sheet

```typescript
// Create
await fm.createDirectory('/folder');
await fm.uploadFile(buffer, '/folder/file.pdf');

// Read
await fm.listDirectory('/folder');
await fm.getItem('/folder/file.pdf');
await fm.downloadFile('/folder/file.pdf', './local.pdf');
await fm.exists('/folder/file.pdf');

// Update
await fm.renameFile('/folder/file.pdf', 'renamed.pdf');
await fm.renameFolder('/folder', 'renamed-folder');
await fm.moveItem('/folder/file.pdf', '/other/file.pdf');

// Delete
await fm.deleteFile('/folder/file.pdf');
await fm.removeDirectory('/folder', true); // recursive

// Utility
await fm.writeFile('/text.txt', 'content');
const { data } = await fm.readFile('/text.txt');
await fm.copyFile('/source.pdf', '/dest.pdf');
await fm.ensureDirectory('/folder'); // create if not exists
```

### Naming Rules Cheat Sheet

```typescript
import {
  hazo_files_generate_file_name,
  hazo_files_generate_folder_name,
  createVariableSegment,
  createLiteralSegment,
  SYSTEM_DATE_VARIABLES,
  SYSTEM_FILE_VARIABLES
} from 'hazo_files';

// Create schema
const schema = {
  version: 1,
  filePattern: [
    createVariableSegment('client_id'),
    createLiteralSegment('_'),
    createVariableSegment('YYYY-MM-DD'),
    createLiteralSegment('_'),
    createVariableSegment('counter'),
  ],
  folderPattern: [
    createVariableSegment('YYYY'),
    createLiteralSegment('/'),
    createVariableSegment('client_id'),
  ],
};

// Generate names
const variables = { client_id: 'ACME' };

const fileResult = hazo_files_generate_file_name(
  schema,
  variables,
  'document.pdf',
  { counterValue: 5, preserveExtension: true }
);
// Result: { success: true, name: 'ACME_2024-12-09_005.pdf' }

const folderResult = hazo_files_generate_folder_name(schema, variables);
// Result: { success: true, name: '2024/ACME' }

// Use with FileBrowser
import { NamingRuleConfigurator } from 'hazo_files/ui';

const userVars = [
  { variable_name: 'client_id', description: 'Client', example_value: 'ACME', category: 'user' }
];

<NamingRuleConfigurator
  variables={userVars}
  onChange={(schema) => saveSchema(schema)}
/>
```

### Configuration Cheat Sheet

```typescript
// File
const config = loadConfig('./hazo_files_config.ini');

// Code
const config = {
  provider: 'local',
  local: { basePath: './files', maxFileSize: 10485760 }
};

// FileManager
const fm = await createInitializedFileManager({ config });
await fm.initialize(); // if not using create helper
```

### Error Handling Cheat Sheet

```typescript
const result = await fm.uploadFile(buffer, '/file.pdf');
if (!result.success) {
  console.error(result.error);
  return;
}
const fileItem = result.data;
```

## Critical File Locations

**Core**:
- Types: `src/types/index.ts`
- Naming Types: `src/types/naming.ts`
- FileManager: `src/services/file-manager.ts`
- Base Module: `src/common/base-module.ts`
- Config: `src/config/index.ts`

**Storage Modules**:
- Local Module: `src/modules/local/index.ts`
- Google Drive Module: `src/modules/google-drive/index.ts`
- Google Drive Auth: `src/modules/google-drive/auth.ts`

**Common Utilities**:
- Errors: `src/common/errors.ts`
- Path Utils: `src/common/path-utils.ts`
- MIME Types: `src/common/mime-types.ts`
- Naming Utils: `src/common/naming-utils.ts`

**UI Components**:
- FileBrowser: `src/ui/components/FileBrowser.tsx`
- NamingRuleConfigurator: `src/ui/components/naming/NamingRuleConfigurator.tsx`
- VariableList: `src/ui/components/naming/VariableList.tsx`
- PatternBuilder: `src/ui/components/naming/PatternBuilder.tsx`
- PatternPreview: `src/ui/components/naming/PatternPreview.tsx`
- PatternSegmentItem: `src/ui/components/naming/PatternSegmentItem.tsx`
- DraggableVariable: `src/ui/components/naming/DraggableVariable.tsx`
- SeparatorPicker: `src/ui/components/naming/SeparatorPicker.tsx`

**UI Hooks**:
- useFileBrowser: `src/ui/hooks/useFileBrowser.ts`
- useNamingRule: `src/ui/hooks/useNamingRule.ts`

## Version

Current: 1.0.0

Node.js: 16+
React: 18+ (for UI components)
TypeScript: 5.3+
