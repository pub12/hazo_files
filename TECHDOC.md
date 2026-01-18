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
- **File Browser**: FileBrowser, FolderTree, FileList, FilePreview, PathBreadcrumb, DragPreview
- **Naming Configurator**: NamingRuleConfigurator, VariableList, PatternBuilder, PatternPreview
- **Dialogs**: Create/rename/delete/upload/metadata dialogs
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

## FileBrowser Drag-and-Drop System

### Architecture

**Design Pattern**: Single top-level DndContext in FileBrowser component

```
FileBrowser Component
├── DndContext (top-level)
│   ├── Sensors: PointerSensor (8px activation distance)
│   ├── Collision Detection: closestCenter
│   └── Event Handlers:
│       ├── onDragStart → Capture dragged item, show preview
│       ├── onDragOver → Track drop target, validate move
│       └── onDragEnd → Execute move operation
│
├── DragOverlay
│   └── DragPreview component (shows during drag)
│
├── FolderTree
│   └── TreeNode components
│       └── useDroppable hook
│           └── ID: folder-drop-tree-{path}
│
└── FileList
    └── File/Folder items
        ├── useDraggable hook
        │   └── ID: file-item-{path}
        └── useDroppable hook (folders only)
            └── ID: folder-drop-list-{path}
```

### ID Naming Convention

**Draggable IDs**:
- Format: `file-item-{path}`
- Example: `file-item-/documents/report.pdf`
- Applied to: All files and folders in FileList

**Droppable IDs**:
- Tree format: `folder-drop-tree-{path}`
  - Example: `folder-drop-tree-/documents`
  - Applied to: Folder nodes in FolderTree sidebar
- List format: `folder-drop-list-{path}`
  - Example: `folder-drop-list-/documents`
  - Applied to: Folders in FileList main view

**Rationale**: Prefix distinguishes between draggable items and drop targets, allowing both to coexist for folder items.

### Drag Operation Flow

```
User Action → Event Handler → Validation → API Call → UI Update

1. User clicks and drags file/folder
   ↓
2. handleDragStart fires
   - Captures FileSystemItem from active.data.current
   - Sets draggedItem state
   - Sets isDragging = true
   - DragOverlay shows DragPreview
   ↓
3. User drags over folders (handleDragOver)
   - Extracts path from over.id (strip prefix)
   - Validates with isValidDropTarget()
   - Sets dropTargetPath if valid
   - Invalid targets → dropTargetPath = null
   ↓
4. User releases (handleDragEnd)
   - Extracts target path from over.id
   - Re-validates with isValidDropTarget()
   - If valid → api.moveItem(sourcePath, targetPath)
   - Refresh directory list and folder tree
   - Reset: draggedItem, dropTargetPath, isDragging
```

### Drop Validation Rules

**Function**: `isValidDropTarget(item: FileSystemItem, targetPath: string): boolean`

**Rules**:
1. **Self-drop prevention**: `item.path !== targetPath`
   - Cannot drop item onto itself
2. **Parent check**: `getParentPath(item.path) !== targetPath`
   - Cannot drop into current parent (no-op move)
3. **Descendant check**: `!isChildPath(item.path, targetPath)`
   - Cannot drop folder into its own subdirectory
   - Prevents circular references and lost data

**Edge Cases**:
- File to folder: Always allowed (if not same parent)
- Folder to folder: Allowed unless descendant relationship
- Root folder: Can accept drops but cannot be dragged

### Visual Feedback System

**Dragging State**:
- **Dragged item**: `opacity-50` class applied
- **Other items**: Normal opacity
- **Drag preview**: Follows cursor with file/folder icon + name

**Drop Target Highlighting**:
- **Valid target**:
  - Border: `ring-2 ring-green-500`
  - Background: `bg-green-50`
- **Invalid target**: No highlighting
- **Applied to**: Folders in both tree and list that match `dropTargetPath`

**DragPreview Component**:
- Shows file/folder icon (via `getFileIcon`)
- Displays item name (truncated to 200px)
- White background with shadow
- 90% opacity for visual distinction

### State Management

**State Variables**:
```typescript
const [draggedItem, setDraggedItem] = useState<FileSystemItem | null>(null);
const [dropTargetPath, setDropTargetPath] = useState<string | null>(null);
const [isDragging, setIsDragging] = useState(false);
```

**State Transitions**:
- **Idle**: `draggedItem=null, dropTargetPath=null, isDragging=false`
- **Dragging**: `draggedItem=item, isDragging=true`
- **Over valid target**: `dropTargetPath=path`
- **Over invalid target**: `dropTargetPath=null`
- **Drop complete**: Reset all to null/false

### API Integration

**Required Method**:
```typescript
interface FileBrowserAPI {
  moveItem: (sourcePath: string, destinationPath: string)
    => Promise<OperationResult<FileSystemItem>>;
}
```

**Move Operation**:
- Input: Source item path, destination folder path
- Backend: Calls `FileManager.moveItem()`
- Result: Returns moved item with updated path
- Side effects: Updates both source and destination directories

**Post-Move Actions**:
1. Refresh current directory list (`loadDirectory(currentPath)`)
2. Refresh folder tree (`loadTree()`)
3. Clear selection if moved item was selected
4. Reset drag state

### Performance Considerations

**Drag Detection**:
- 8px activation distance prevents accidental drags
- No performance impact during normal clicking/selecting

**Collision Detection**:
- `closestCenter` algorithm (moderate performance)
- Alternative: `closestCorners` or `pointerWithin` for large lists

**Visual Updates**:
- CSS classes for highlighting (no re-renders)
- DragOverlay renders outside main tree (isolated updates)
- Drop target highlighting via prop comparison (fast)

**Optimization Opportunities**:
- Virtualize file list for 1000+ items
- Debounce handleDragOver for smoother performance
- Cache validation results during drag

### Error Handling

**Validation Errors**:
- Caught before API call (no network request)
- No error message shown to user (just no-op)

**API Errors**:
- Caught in try-catch in `handleDragEnd`
- Passed to `onError` callback
- Drag state still reset to prevent UI lockup

**Recovery**:
- All drag operations are non-destructive until drop
- Failed moves don't affect source or destination
- UI refreshes to show actual state

### Testing Considerations

**Unit Tests**:
- Test `isValidDropTarget()` with various scenarios
- Test ID extraction from droppable IDs
- Test path manipulation utilities

**Integration Tests**:
- Drag file to folder in tree
- Drag file to folder in list
- Attempt invalid drops (should be no-op)
- Verify API calls with correct paths

**Edge Cases**:
- Dragging folder into deeply nested descendant
- Dragging to root folder
- Dragging with network failure during move
- Rapid drag-and-drop operations

---

**Version**: 1.0.0
