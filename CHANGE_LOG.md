# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.1] - 2026-02-09

### Fixed
- Extension validation mismatch in LocalStorageModule: config extensions with leading dots (e.g., `.pdf`) were not matching extracted extensions without dots (e.g., `pdf`), causing all uploads to fail when `allowed_extensions` was configured with dotted format
- Extensions are now normalized at initialization (trimmed, dot-stripped, lowercased), making validation dot-agnostic and case-insensitive

## [1.0.0] - 2025-12-09

### Added

#### Core Features
- Initial release of hazo_files package
- Unified FileManager service providing consistent API across storage providers
- Modular architecture for easy extension with custom storage providers
- Full TypeScript support with comprehensive type definitions

#### Storage Providers
- **LocalStorageModule**: Direct filesystem operations using Node.js `fs` module
  - Extension filtering via `allowedExtensions` configuration
  - File size limits via `maxFileSize` configuration
  - Progress tracking for upload/download operations
  - Recursive directory operations
- **GoogleDriveModule**: Google Drive integration with OAuth 2.0
  - Full Google Drive API v3 implementation
  - OAuth authentication with automatic token refresh
  - Token persistence via callback system
  - Configurable root folder support

#### File Operations
- Create and remove directories (with recursive option)
- Upload files from local path, Buffer, or ReadableStream
- Download files to local path or return as Buffer
- Move and rename files and folders
- Delete files
- List directory contents with filtering options
- Get file/folder metadata
- Check file/folder existence
- Generate folder tree structure

#### UI Components
- **FileBrowser**: Complete drop-in file browser component
  - Folder tree navigation with lazy loading
  - File list with grid and list view modes
  - Breadcrumb navigation
  - File preview for images, text, and PDFs
  - Action toolbar with upload, download, create, rename, delete
  - Drag-and-drop support (via API adapter)
- **Individual Components**: PathBreadcrumb, FolderTree, FileList, FilePreview, FileActions
- **Dialogs**: CreateFolderDialog, RenameDialog, DeleteConfirmDialog, UploadDialog
- **Hooks**: useFileBrowser, useFileOperations, useMultiFileOperations

#### Configuration System
- INI file configuration (`hazo_files_config.ini`)
- Environment variable support with automatic override
- Programmatic configuration via code
- Configuration validation and defaults
- Sample configuration generator

#### Common Utilities
- **Error Types**: 12 specific error classes for different failure scenarios
  - FileNotFoundError, DirectoryNotFoundError
  - FileExistsError, DirectoryExistsError
  - DirectoryNotEmptyError, PermissionDeniedError
  - InvalidPathError, FileTooLargeError
  - InvalidExtensionError, AuthenticationError
  - ConfigurationError, OperationError
- **Path Utilities**: Normalization, joining, validation, sanitization
- **MIME Type Detection**: 50+ file types with category classification
- **Helper Functions**: ID generation, byte formatting, item sorting/filtering

#### Developer Experience
- Comprehensive documentation
  - README with quick start and usage examples
  - Technical documentation (TECHDOC.md)
  - AI-optimized reference guide (CLAUDE.md)
  - Setup checklist (SETUP_CHECKLIST.md)
  - Module creation guide (docs/ADDING_MODULES.md)
- Complete TypeScript definitions
- Example Next.js test application
- Progress callbacks for upload/download operations
- OperationResult pattern for consistent error handling

### Design Decisions

#### Virtual Path System
**Decision**: Use Unix-style virtual paths (`/folder/file.pdf`) across all storage providers.

**Rationale**:
- Provides consistent API regardless of storage backend
- Prevents Windows/Unix path separator conflicts
- Simplifies path manipulation and validation
- Easier to implement access control and path restrictions

#### OperationResult Pattern
**Decision**: Return `{ success: boolean, data?: T, error?: string }` instead of throwing exceptions.

**Rationale**:
- Expected failures (file not found, permission denied) shouldn't be exceptions
- Easier error handling in async code
- Consistent pattern across all operations
- Better for API responses (JSON-serializable)
- Allows partial success in batch operations

#### Module System
**Decision**: BaseStorageModule abstract class with StorageModule interface.

**Rationale**:
- Enforces consistent interface across providers
- Provides common utilities (path normalization, result helpers)
- Reduces code duplication
- Makes adding new providers straightforward
- Separates provider-specific logic from common functionality

#### Separate UI Package Export
**Decision**: Export UI components separately (`hazo_files/ui`)

**Rationale**:
- Core package has no React dependency
- Allows using file management without UI
- Reduces bundle size for server-only usage
- Clear separation of concerns
- Different peer dependencies (React only for UI)

#### Configuration Priority
**Decision**: Code > Environment Variables > INI File > Defaults

**Rationale**:
- Code config for programmatic control (tests, dynamic config)
- Environment variables for deployment (Docker, cloud platforms)
- INI file for local development and simple deployments
- Defaults prevent configuration errors from breaking initialization

### Security

- Path validation prevents directory traversal attacks
- Filename sanitization removes dangerous characters
- Extension whitelisting prevents unwanted file types
- File size limits prevent resource exhaustion
- OAuth 2.0 for Google Drive with automatic token refresh
- No client-side credential exposure

### Performance

- Local storage: Sub-10ms operations for most actions
- Google Drive: 200-1000ms operations (network-dependent)
- Stream-based transfers for memory efficiency
- Lazy loading for folder tree
- Progress tracking without blocking

### Dependencies

#### Runtime
- `googleapis` (^140.0.1): Google Drive API client
- `ini` (^4.1.3): INI file parsing

#### Development
- `typescript` (^5.3.3): TypeScript compiler
- `tsup` (^8.0.1): Build tool
- `vitest` (^1.1.0): Testing framework

#### Peer Dependencies
- `react` (^18.0.0): For UI components
- `react-dom` (^18.0.0): For UI components

### Known Limitations

- Google Drive path resolution requires multiple API calls (O(n) where n = path depth)
- No built-in caching for Google Drive path-to-ID mappings
- UI components do not implement virtual scrolling for large directories
- File preview loads entire file into memory
- No batch operation support for Google Drive
- Local storage requires shared filesystem for horizontal scaling

### Migration Notes

This is the initial release, no migration required.

### Contributors

- Pubs Abayasiri (Creator and maintainer)

---

## [Unreleased]

### Added

#### FileBrowser Drag-and-Drop File Moving (2026-01-19)

**Feature**: Native drag-and-drop functionality for moving files and folders within the FileBrowser component.

**User-Facing Features**:
- Drag files and folders from the file list (grid or list view)
- Drop onto folders in either the sidebar tree or main file list
- Visual feedback with opacity and colored borders during drag
- Real-time validation prevents invalid operations
- Shows dragged item preview (icon + name) following cursor

**Visual Feedback**:
- **Dragging**: Dragged item becomes semi-transparent (opacity-50)
- **Valid drop target**: Green ring border (`ring-2 ring-green-500`) and light green background (`bg-green-50`)
- **Invalid drop target**: No highlighting (drop is ignored)
- **Drag preview**: White card with shadow showing file/folder icon and name (max width 200px)

**Drop Validation** (automatic, no user action needed):
- Prevents dropping item onto itself
- Prevents dropping into current parent directory (no-op)
- Prevents dropping folder into its own descendant (circular reference prevention)
- All other moves are allowed

**Technical Implementation**:
- Uses `@dnd-kit/core` library (already a peer dependency for NamingRuleConfigurator)
- Single top-level DndContext in FileBrowser component
- PointerSensor with 8px activation distance prevents accidental drags
- `closestCenter` collision detection algorithm

**New Component** (`src/ui/components/DragPreview.tsx`):
- `DragPreview` - Visual preview component shown during drag
- Props: `item: FileSystemItem`, `className?: string`
- Displays file/folder icon and name with styling

**API Integration**:
- Requires `FileBrowserAPI.moveItem(sourcePath, destinationPath)` method
- Automatically refreshes directory list and folder tree after successful move
- Error handling via `onError` callback prop

**ID Patterns Used**:
- Draggable items: `file-item-{path}` (all files and folders in FileList)
- Drop targets in tree: `folder-drop-tree-{path}` (folders in FolderTree sidebar)
- Drop targets in list: `folder-drop-list-{path}` (folders in FileList)

**State Management**:
- `draggedItem`: Currently dragged FileSystemItem
- `dropTargetPath`: Path of valid drop target being hovered
- `isDragging`: Boolean flag for drag in progress

**Files Changed**:
- `src/ui/components/FileBrowser.tsx` - Added DndContext, drag handlers, state management
- `src/ui/components/DragPreview.tsx` - New component for drag preview
- `src/ui/components/FileList.tsx` - Added useDraggable and useDroppable hooks
- `src/ui/components/FolderTree.tsx` - Added useDroppable hook
- `src/ui/index.ts` - Export DragPreview component and DragPreviewProps type

**Dependencies**:
- No new dependencies (uses existing `@dnd-kit/core` peer dependency)

**Design Decisions**:

**Single DndContext Pattern**:
- **Decision**: Use single top-level DndContext in FileBrowser, not in child components
- **Rationale**: Nested DndContext blocks drag events from parent handlers (same pattern as NamingRuleConfigurator). Child components use only useDroppable/useDraggable hooks.

**ID Prefix Convention**:
- **Decision**: Use prefixed IDs (`file-item-`, `folder-drop-tree-`, `folder-drop-list-`)
- **Rationale**: Allows distinguishing between draggable items and drop targets. Necessary because folders are both draggable and droppable.

**Validation Before API Call**:
- **Decision**: Validate drop targets twice: during drag (for visual feedback) and before API call
- **Rationale**: Prevents unnecessary API calls for invalid drops, provides immediate visual feedback

**Performance Optimization**:
- 8px activation distance prevents accidental drags during normal clicking
- CSS-based visual feedback (no re-renders)
- DragOverlay renders outside main component tree (isolated updates)

**Use Cases**:
- Reorganizing files into folders
- Moving files between project folders
- Quick file organization without copy/paste
- Dragging from file list to sidebar tree for easy navigation

#### Naming Rules Configuration System (2025-12-09)

**Feature**: Comprehensive naming rules system for generating consistent file and folder names.

**Core Types** (`src/types/naming.ts`):
- `NamingVariable` - Define custom and system variables with descriptions and examples
- `PatternSegment` - Building blocks for naming patterns (variable or literal)
- `NamingRuleSchema` - Complete schema with file and folder patterns, metadata
- `GeneratedNameResult` - Result object from name generation
- `NameGenerationOptions` - Options for controlling generation behavior

**Utility Functions** (`src/common/naming-utils.ts`):
- `hazo_files_generate_file_name()` - Generate file names from schemas
- `hazo_files_generate_folder_name()` - Generate folder paths from schemas
- `validateNamingRuleSchema()` - Validate schema structure
- `parsePatternString()` - Parse "{var}text" strings to segments
- `patternToString()` - Convert segments back to strings
- `formatDateToken()` - Format dates to various tokens (YYYY, MM, DD, etc.)
- `formatCounter()` - Format counter with zero padding
- `createVariableSegment()`, `createLiteralSegment()` - Segment builders

**System Variables**:
- **Date variables**: YYYY, YY, MM, M, DD, D, MMM, MMMM, YYYY-MM-DD, YYYY-MMM-DD, DD-MM-YYYY, MM-DD-YYYY
- **File metadata**: original_name, extension, ext
- **Counter**: counter (auto-incrementing with padding)
- Exported as constants: `SYSTEM_DATE_VARIABLES`, `SYSTEM_FILE_VARIABLES`, `SYSTEM_COUNTER_VARIABLES`, `ALL_SYSTEM_VARIABLES`

**UI Components** (`src/ui/components/naming/`):
- `NamingRuleConfigurator` - Main drop-in component for visual pattern building
- `VariableList` - Category tabs (User/Date/File/Counter) with draggable variables
- `PatternBuilder` - Drag-and-drop zones for file and folder patterns
- `PatternPreview` - Live preview of generated names with example values
- `PatternSegmentItem` - Individual segments in patterns (editable/removable)
- `DraggableVariable` - Draggable variable chips
- `SeparatorPicker` - Quick-add common separators (-, _, space, /)

**Hooks** (`src/ui/hooks/useNamingRule.ts`):
- `useNamingRule` - State management for naming patterns with:
  - Undo/redo support (max 50 history entries)
  - Keyboard shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z)
  - Pattern manipulation functions (add, remove, update, reorder, clear)
  - Schema import/export
  - isDirty tracking

**Configuration** (`hazo_files_config.ini`):
- New `[naming]` section
- `date_formats` setting for customizing available date format tokens

**Dependencies**:
- Added peer dependencies: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (for drag-and-drop UI)

**Design Decisions**:

**Variable-based Pattern System**:
- **Decision**: Use segment-based patterns instead of regex or string templates
- **Rationale**:
  - Type-safe with full IDE support
  - Easier to manipulate programmatically
  - Works well with React drag-and-drop
  - Clear separation between variables and literals
  - Enables visual editing without string parsing complexity

**System vs User Variables**:
- **Decision**: Separate system variables (dates, file metadata) from user variables
- **Rationale**:
  - System variables work automatically without configuration
  - User variables are application-specific
  - Category-based UI organization improves UX
  - Clear distinction prevents naming conflicts

**Undo/Redo System**:
- **Decision**: Implement history with keyboard shortcuts in the hook
- **Rationale**:
  - Essential for pattern building workflow
  - Users expect standard shortcuts (Ctrl+Z)
  - Separates history logic from UI components
  - 50-entry limit prevents memory issues

**Prefix Convention**:
- **Decision**: Use `hazo_files_` prefix for main generation functions
- **Rationale**:
  - Prevents naming conflicts with user code
  - Makes functions easily discoverable
  - Consistent with package naming
  - Clear these are primary API functions

**Use Cases**:
- Document management systems requiring consistent naming
- Automated file organization workflows
- Multi-tenant applications with client-specific naming
- Date-based archival systems
- Sequential numbering for versioned documents

### Fixed

#### NamingRuleConfigurator Drag-and-Drop Issues (2025-12-10)

**Fixed drag-and-drop for variables into patterns**:
- **Problem**: Variables from VariableList could not be dragged into PatternBuilder drop zones
- **Root Cause**: PatternBuilder had a nested DndContext that blocked drag events from the parent NamingRuleConfigurator
- **Solution**: Removed nested DndContext from PatternBuilder. Now uses single parent DndContext in NamingRuleConfigurator with SortableContext and useDroppable only in PatternBuilder
- **Impact**: Variables can now be dragged from the variable list into file and folder pattern areas
- **Files Changed**: `src/ui/components/naming/PatternBuilder.tsx`, `src/ui/components/naming/NamingRuleConfigurator.tsx`

**Why Nested DndContext Fails**: @dnd-kit prevents nested DndContext to avoid event bubbling conflicts. Child contexts block drag events from reaching parent handlers. Always use a single top-level DndContext with droppable/sortable children.

**Fixed segment reordering within patterns**:
- **Problem**: Segments could not be reordered by dragging within the same pattern
- **Root Cause**: handleDragEnd in NamingRuleConfigurator didn't handle the reordering case, only handled new variable drops
- **Solution**: Added Case 2 logic to handleDragEnd that detects when dragging between segments in the same pattern and calls reorderFilePattern or reorderFolderPattern with the correct indices
- **Impact**: Users can now reorder segments by dragging them to new positions within file or folder patterns
- **Files Changed**: `src/ui/components/naming/NamingRuleConfigurator.tsx`

**Improved drag activation sensitivity**:
- **Change**: Added PointerSensor with 8px activation distance
- **Rationale**: Prevents accidental drags when clicking on variables or segments
- **Impact**: More intentional drag interactions, better UX
- **Files Changed**: `src/ui/components/naming/NamingRuleConfigurator.tsx`

**Added visual drag feedback**:
- **Change**: Implemented DragOverlay showing the dragged variable during drag operation
- **Rationale**: Provides clear visual feedback of what is being dragged
- **Impact**: Users can see the variable chip following their cursor during drag
- **Files Changed**: `src/ui/components/naming/NamingRuleConfigurator.tsx`

**Made NamingRuleConfigurator content scrollable**:
- **Problem**: With many variables or long patterns, content overflowed the container with no way to scroll
- **Solution**: Wrapped Available Variables, Pattern Builders, and Preview sections in a scrollable container with `flex-1 overflow-y-auto min-h-0`, keeping Action Bar fixed at bottom
- **Impact**: Component now works well in fixed-height containers, all content is accessible via scroll
- **Files Changed**: `src/ui/components/naming/NamingRuleConfigurator.tsx`

### Planned Features

- Amazon S3 storage module
- Dropbox storage module
- OneDrive storage module
- WebDAV support
- Path caching for Google Drive (performance optimization)
- Batch operations for Google Drive
- Virtual scrolling for large file lists
- File versioning support
- Sharing and permissions system
- Advanced search and filtering
- Thumbnail generation
- File compression/decompression
- Trash/recycle bin functionality

---

**Note**: This changelog follows the principles of [Keep a Changelog](https://keepachangelog.com). Each version should be documented with Added, Changed, Deprecated, Removed, Fixed, and Security sections as applicable.

[1.0.0]: https://github.com/pub12/hazo_files/releases/tag/v1.0.0
[Unreleased]: https://github.com/pub12/hazo_files/compare/v1.0.0...HEAD
