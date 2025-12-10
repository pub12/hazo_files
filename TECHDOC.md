# hazo_files - Technical Documentation

Comprehensive technical reference describing system architecture, components, data flows, and integration patterns.

## System Architecture

The hazo_files package is built on a layered architecture with pluggable storage modules.

### Architecture Diagram

```
Client Layer (React)
  └── FileBrowser Component
       └── HTTP API Calls

Server Layer (Node.js)
  └── API Routes (Next.js/Express)
       └── FileManager Service
            ├── LocalStorageModule → fs
            └── GoogleDriveModule → Google Drive API
```

## Core Components

### FileManager
Main service providing unified API across storage providers.
- Location: `src/services/file-manager.ts`
- Methods: createDirectory, uploadFile, downloadFile, listDirectory, etc.
- Delegates operations to active storage module

### Storage Modules
Implement `StorageModule` interface with all file operations.
- LocalStorageModule: Direct filesystem access
- GoogleDriveModule: Google Drive API v3 with OAuth

### Naming System
Pattern-based file/folder name generation system.
- Location: `src/common/naming-utils.ts`, `src/types/naming.ts`
- Components: Schema definition, pattern parsing, variable substitution
- Functions: hazo_files_generate_file_name, hazo_files_generate_folder_name
- System variables: Date formats, file metadata, counter

### UI Components
React components for file management and configuration:
- **File Browser**: FileBrowser, FolderTree, FileList, FilePreview, PathBreadcrumb
- **Naming Configurator**: NamingRuleConfigurator, VariableList, PatternBuilder, PatternPreview
- **Dialogs**: Create/rename/delete/upload dialogs
- **Hooks**: useFileBrowser, useFileOperations, useNamingRule

## Storage Modules

### LocalStorageModule
**Path Mapping**: Virtual paths (`/docs/file.pdf`) map to filesystem (`{basePath}/docs/file.pdf`)
**Features**: Extension filtering, size limits, progress tracking
**Performance**: <10ms for most operations

### GoogleDriveModule
**Path Resolution**: Recursive API queries to resolve paths to Drive file IDs
**Authentication**: OAuth 2.0 with token refresh
**Performance**: 200-1000ms per operation (network latency)

## API Endpoints

### GET /api/files
- Query params: action (list|tree|exists|get), path, provider
- Returns: OperationResult<T>

### POST /api/files
- Body: action, path, provider, operation-specific params
- Returns: OperationResult<T>

### POST /api/files/upload
- Content-Type: multipart/form-data
- Fields: file, path, provider
- Returns: OperationResult<FileItem>

### GET /api/files/download
- Query: path, provider
- Returns: Binary file stream

## Database Schema

### Token Storage (PostgreSQL)

```sql
CREATE TABLE google_drive_tokens (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) UNIQUE NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expiry_date BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tokens_user_id ON google_drive_tokens(user_id);

GRANT ALL PRIVILEGES ON DATABASE your_database TO your_user;
GRANT ALL PRIVILEGES ON TABLE google_drive_tokens TO your_user;
GRANT USAGE, SELECT ON SEQUENCE google_drive_tokens_id_seq TO your_user;
```

### Token Storage (SQLite)

```sql
CREATE TABLE google_drive_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT UNIQUE NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expiry_date INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tokens_user_id ON google_drive_tokens(user_id);
```

## Security

### Authentication
- Local: Server-side access control required
- Google Drive: OAuth 2.0 with token refresh

### Input Validation
- Path validation prevents directory traversal
- Filename sanitization removes dangerous characters
- Extension whitelist via allowedExtensions
- Size limits via maxFileSize

### Best Practices
- Store tokens in database, never expose to client
- Use CSRF protection on POST endpoints
- Implement rate limiting
- Validate all user inputs

## Performance

### Benchmarks

**Local Storage**:
- Upload 1MB: 5-10ms
- Download 1MB: 3-8ms  
- List 100 files: 2-5ms

**Google Drive**:
- Upload 1MB: 500-1000ms
- Download 1MB: 300-700ms
- List 100 files: 400-800ms

### Optimization Strategies
1. Path caching for Google Drive
2. Batch API requests
3. Virtual scrolling for large lists
4. React Query for client-side caching

## Error Handling

### Error Types
- FileNotFoundError, DirectoryNotFoundError
- FileExistsError, DirectoryExistsError
- InvalidPathError, FileTooLargeError
- InvalidExtensionError, AuthenticationError

### Error Flow
```
Module → Catch error → Return OperationResult with error
API → Return OperationResult as JSON
Client → Check result.success, handle error
```

## Naming System Architecture

### Pattern Structure

```
NamingRuleSchema
├── version: number
├── filePattern: PatternSegment[]
│   ├── { id, type: 'variable', value: 'client_id' }
│   ├── { id, type: 'literal', value: '_' }
│   └── { id, type: 'variable', value: 'YYYY-MM-DD' }
├── folderPattern: PatternSegment[]
└── metadata: { name?, description?, createdAt?, updatedAt? }
```

### Name Generation Flow

```
User provides:
  - NamingRuleSchema (pattern definition)
  - Variable values (user-defined variables)
  - Options (date, counter, etc.)

  ↓

Pattern segments iteration:
  For each segment:
    - If literal → Use value directly
    - If variable → Lookup value:
      - Check date variables (YYYY, MM, DD, etc.)
      - Check file metadata (original_name, extension)
      - Check counter variable
      - Check user variables
      - If missing → Return error

  ↓

Post-processing:
  - Join all segments
  - Sanitize filename (remove unsafe chars)
  - Preserve extension (if file pattern)

  ↓

Return GeneratedNameResult:
  { success: true, name: "ACME_2024-12-09_001.pdf" }
```

### Variable Resolution Order

1. **Date variables**: Checked first using formatDateToken()
2. **File metadata**: From original filename (if provided)
3. **Counter**: Formatted with zero padding
4. **User variables**: From provided variables object
5. **Error**: If none match, return error result

### Configurator State Management

```
useNamingRule Hook
├── State:
│   ├── filePattern: PatternSegment[]
│   ├── folderPattern: PatternSegment[]
│   ├── history: NamingRuleHistoryEntry[]
│   └── historyIndex: number
│
├── Actions:
│   ├── Pattern manipulation (add, remove, update, reorder, clear)
│   ├── Undo/Redo (Ctrl+Z, Ctrl+Y)
│   └── Schema import/export
│
└── Effects:
    ├── onChange callback on pattern change
    ├── Keyboard event listeners
    └── History recording
```

### Drag-and-Drop System

**Architecture**: Single top-level DndContext pattern

```
NamingRuleConfigurator (DndContext)
├── Sensors:
│   └── PointerSensor (8px activation distance)
│
├── Collision Detection: closestCenter
│
├── Event Handlers:
│   ├── onDragStart → setActiveVariable (for DragOverlay)
│   └── onDragEnd → handleDragEnd:
│       ├── Case 1: New variable drop (draggable-* ID)
│       │   ├── Detect drop target (file-pattern-drop / folder-pattern-drop)
│       │   └── Call addToFilePattern / addToFolderPattern
│       └── Case 2: Segment reordering (segment ID)
│           ├── Find indices in filePattern / folderPattern
│           └── Call reorderFilePattern / reorderFolderPattern
│
├── DragOverlay:
│   └── Shows activeVariable during drag
│
├── Children:
    ├── VariableList
    │   └── DraggableVariable (useDraggable)
    │       └── Data: { type: 'variable', variable: NamingVariable }
    │
    └── PatternBuilder (NO DndContext - CRITICAL)
        ├── SortableContext (for segment reordering)
        ├── useDroppable (for drop zone detection)
        └── PatternSegmentItem (useSortable)
```

**Critical Design Decision**: PatternBuilder does NOT have its own DndContext. It relies entirely on the parent NamingRuleConfigurator's DndContext. This is essential because:

1. Nested DndContext blocks drag events from parent
2. @dnd-kit prevents event bubbling between contexts
3. All drag logic must be in a single handleDragEnd handler

**Common Mistake**: Adding DndContext to child components causes drag-and-drop to break. Always use SortableContext and useDroppable/useSortable hooks in children, reserve DndContext for top-level component only.

### System Variable Evaluation

**Date Variables** (evaluated at generation time):
- Uses provided `date` option or `new Date()`
- Formatted via `formatDateToken()` with switch statement
- Supports 12+ date formats

**File Variables** (from original filename):
- `original_name`: Extracted via getNameWithoutExtension()
- `extension`: Extracted via getExtension() (includes dot)
- `ext`: Extension without dot

**Counter Variable**:
- Provided via `counterValue` option (default: 1)
- Formatted with `counterDigits` padding (default: 3)
- Example: 1 → "001", 42 → "042"

### Performance Characteristics

**Name Generation**:
- Time complexity: O(n) where n = number of segments
- Memory: O(n) for segment array and result string
- No I/O operations, pure computation
- Typical execution: <1ms for patterns with <50 segments

**Configurator UI**:
- Pattern updates: Re-renders affected components only
- History operations: O(1) for undo/redo
- Drag operations: Handled by @dnd-kit (optimized)
- Preview generation: Runs on every pattern change (debounce recommended for production)

---

**Version**: 1.0.0
