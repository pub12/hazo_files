/**
 * FileBrowser Component
 * Main drop-in file browser component with full functionality
 *
 * Layout:
 * ┌─────────────────────────────────────────┐
 * │ Row 1: PathBreadcrumb + Actions         │
 * ├──────────────┬──────────────────────────┤
 * │ Row 2 Col 1  │ Row 2 Col 2              │
 * │ FolderTree   │ FileList                 │
 * │              │                          │
 * ├──────────────┴──────────────────────────┤
 * │ Row 3: FilePreview (selected file)      │
 * └─────────────────────────────────────────┘
 */

import { useState, useCallback, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import type { FileSystemItem, FileItem, FolderItem, TreeNode, OperationResult } from '../../types';
import { getParentPath, isChildPath, joinPath, getBaseName } from '../../common/path-utils';
import { PathBreadcrumb } from './PathBreadcrumb';
import { FolderTree } from './FolderTree';
import { FileList } from './FileList';
import { FilePreview } from './FilePreview';
import { FileActions } from './FileActions';
import { ContextMenu, type ContextMenuItem } from './ContextMenu';
import { DragPreview } from './DragPreview';
import {
  CreateFolderDialog,
  RenameDialog,
  DeleteConfirmDialog,
  UploadDialog,
  MetadataDialog,
  type FileMetadata,
} from './dialogs';
import {
  InfoIcon,
  PencilIcon,
  DownloadIcon,
  TrashIcon,
} from '../icons/FileIcons';

export interface FileBrowserAPI {
  listDirectory: (path: string) => Promise<OperationResult<FileSystemItem[]>>;
  getFolderTree: (path?: string, depth?: number) => Promise<OperationResult<TreeNode[]>>;
  createDirectory: (path: string) => Promise<OperationResult<FolderItem>>;
  removeDirectory: (path: string, recursive?: boolean) => Promise<OperationResult>;
  uploadFile: (file: File, remotePath: string) => Promise<OperationResult<FileItem>>;
  downloadFile: (path: string) => Promise<OperationResult<Blob>>;
  deleteFile: (path: string) => Promise<OperationResult>;
  renameFile: (path: string, newName: string) => Promise<OperationResult<FileItem>>;
  renameFolder: (path: string, newName: string) => Promise<OperationResult<FolderItem>>;
  moveItem: (sourcePath: string, destinationPath: string) => Promise<OperationResult<FileSystemItem>>;
  getPreviewUrl?: (path: string) => Promise<string>;
  getFileContent?: (path: string) => Promise<string>;
  getFileMetadata?: (path: string) => Promise<OperationResult<FileMetadata>>;
}

export interface FileBrowserProps {
  api: FileBrowserAPI;
  initialPath?: string;
  showPreview?: boolean;
  showTree?: boolean;
  viewMode?: 'grid' | 'list';
  className?: string;
  treeWidth?: number;
  previewHeight?: number;
  onError?: (error: string) => void;
  onNavigate?: (path: string) => void;
  onSelect?: (item: FileSystemItem | null) => void;
}

export function FileBrowser({
  api,
  initialPath = '/',
  showPreview = true,
  showTree = true,
  viewMode = 'grid',
  className = '',
  treeWidth = 250,
  previewHeight = 300,
  onError,
  onNavigate,
  onSelect,
}: FileBrowserProps) {
  // State
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [files, setFiles] = useState<FileSystemItem[]>([]);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [selectedItem, setSelectedItem] = useState<FileSystemItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Dialog states
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [metadataOpen, setMetadataOpen] = useState(false);

  // Context menu state
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [contextMenuItem, setContextMenuItem] = useState<FileSystemItem | null>(null);

  // Metadata state
  const [fileMetadata, setFileMetadata] = useState<FileMetadata | null>(null);
  const [isMetadataLoading, setIsMetadataLoading] = useState(false);

  // Drag-and-drop state
  const [draggedItem, setDraggedItem] = useState<FileSystemItem | null>(null);
  const [dropTargetPath, setDropTargetPath] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Configure DnD sensors with activation constraint to prevent accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Load directory contents
  const loadDirectory = useCallback(async (path: string) => {
    setIsLoading(true);
    try {
      const result = await api.listDirectory(path);
      if (result.success && result.data) {
        setFiles(result.data);
        setCurrentPath(path);
        setSelectedItem(null);
        onNavigate?.(path);
      } else {
        onError?.(result.error || 'Failed to load directory');
      }
    } finally {
      setIsLoading(false);
    }
  }, [api, onError, onNavigate]);

  // Load folder tree
  const loadTree = useCallback(async () => {
    const result = await api.getFolderTree('/', 3);
    if (result.success && result.data) {
      setTree(result.data);
    }
  }, [api]);

  // Initial load
  useEffect(() => {
    loadDirectory(initialPath);
    if (showTree) {
      loadTree();
    }
  }, [initialPath, loadDirectory, loadTree, showTree]);

  // Navigation handlers
  const handleNavigate = useCallback((path: string) => {
    loadDirectory(path);
  }, [loadDirectory]);

  const handleRefresh = useCallback(async () => {
    await loadDirectory(currentPath);
    if (showTree) {
      await loadTree();
    }
  }, [currentPath, loadDirectory, loadTree, showTree]);

  // Validate if a drop target is valid for the dragged item
  const isValidDropTarget = useCallback((item: FileSystemItem, targetPath: string): boolean => {
    // Cannot drop on itself
    if (item.path === targetPath) return false;

    // Cannot drop into current parent (no-op)
    if (getParentPath(item.path) === targetPath) return false;

    // Cannot drop a folder into its own descendant
    if (item.isDirectory && isChildPath(item.path, targetPath)) return false;

    return true;
  }, []);

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current as { item: FileSystemItem } | undefined;
    if (data?.item) {
      setDraggedItem(data.item);
      setIsDragging(true);
    }
  }, []);

  // Handle drag over - track current drop target
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    if (!over || !draggedItem) {
      setDropTargetPath(null);
      return;
    }

    const overId = String(over.id);

    // Extract path from droppable ID (format: folder-drop-tree-{path} or folder-drop-list-{path})
    let targetPath: string | null = null;
    if (overId.startsWith('folder-drop-tree-')) {
      targetPath = overId.replace('folder-drop-tree-', '');
    } else if (overId.startsWith('folder-drop-list-')) {
      targetPath = overId.replace('folder-drop-list-', '');
    }

    if (targetPath && isValidDropTarget(draggedItem, targetPath)) {
      setDropTargetPath(targetPath);
    } else {
      setDropTargetPath(null);
    }
  }, [draggedItem, isValidDropTarget]);

  // Handle drag end - perform the move operation
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { over } = event;
    const item = draggedItem;

    // Reset drag state
    setDraggedItem(null);
    setDropTargetPath(null);
    setIsDragging(false);

    if (!over || !item) return;

    const overId = String(over.id);

    // Extract target path from droppable ID
    let targetPath: string | null = null;
    if (overId.startsWith('folder-drop-tree-')) {
      targetPath = overId.replace('folder-drop-tree-', '');
    } else if (overId.startsWith('folder-drop-list-')) {
      targetPath = overId.replace('folder-drop-list-', '');
    }

    if (!targetPath || !isValidDropTarget(item, targetPath)) return;

    // Calculate destination path
    const itemName = getBaseName(item.path);
    const destinationPath = joinPath(targetPath, itemName);

    // Perform move operation
    const result = await api.moveItem(item.path, destinationPath);
    if (result.success) {
      // Refresh current directory and tree
      await loadDirectory(currentPath);
      if (showTree) {
        await loadTree();
      }
    } else {
      onError?.(result.error || 'Failed to move item');
    }
  }, [draggedItem, isValidDropTarget, api, currentPath, showTree, loadDirectory, loadTree, onError]);

  // Selection handlers
  const handleSelect = useCallback((item: FileSystemItem | null) => {
    setSelectedItem(item);
    onSelect?.(item);
  }, [onSelect]);

  const handleOpen = useCallback((item: FileSystemItem) => {
    if (item.isDirectory) {
      loadDirectory(item.path);
    } else {
      // Trigger download for files
      handleDownload();
    }
  }, [loadDirectory]);

  // Tree handlers
  const handleTreeToggle = useCallback((path: string) => {
    setTree(prev => toggleTreeNode(prev, path));
  }, []);

  const handleTreeExpand = useCallback(async (path: string) => {
    const result = await api.listDirectory(path);
    if (result.success && result.data) {
      const folders = result.data.filter(item => item.isDirectory);
      const children: TreeNode[] = folders.map(folder => ({
        id: folder.id,
        name: folder.name,
        path: folder.path,
        children: [],
      }));
      setTree(prev => updateTreeNode(prev, path, children, true));
    }
  }, [api]);

  // Operation handlers
  const handleCreateFolder = useCallback(async (name: string) => {
    const newPath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
    const result = await api.createDirectory(newPath);
    if (result.success && result.data) {
      setFiles(prev => sortItems([...prev, result.data!]));
      await loadTree();
    } else {
      throw new Error(result.error || 'Failed to create folder');
    }
  }, [api, currentPath, loadTree]);

  const handleUpload = useCallback(async (fileList: FileList) => {
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const remotePath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
      const result = await api.uploadFile(file, remotePath);
      if (result.success && result.data) {
        setFiles(prev => sortItems([...prev, result.data!]));
      } else {
        onError?.(result.error || `Failed to upload ${file.name}`);
      }
    }
  }, [api, currentPath, onError]);

  const handleDownload = useCallback(async () => {
    if (!selectedItem || selectedItem.isDirectory) return;

    const result = await api.downloadFile(selectedItem.path);
    if (result.success && result.data) {
      const blob = result.data;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedItem.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      onError?.(result.error || 'Failed to download file');
    }
  }, [api, selectedItem, onError]);

  const handleDelete = useCallback(async () => {
    if (!selectedItem) return;

    let result: OperationResult;
    if (selectedItem.isDirectory) {
      result = await api.removeDirectory(selectedItem.path, true);
    } else {
      result = await api.deleteFile(selectedItem.path);
    }

    if (result.success) {
      setFiles(prev => prev.filter(f => f.path !== selectedItem.path));
      setSelectedItem(null);
      if (selectedItem.isDirectory) {
        await loadTree();
      }
    } else {
      throw new Error(result.error || 'Failed to delete');
    }
  }, [api, selectedItem, loadTree]);

  const handleRename = useCallback(async (newName: string) => {
    if (!selectedItem) return;

    let result: OperationResult<FileSystemItem>;
    if (selectedItem.isDirectory) {
      result = await api.renameFolder(selectedItem.path, newName);
    } else {
      result = await api.renameFile(selectedItem.path, newName);
    }

    if (result.success && result.data) {
      setFiles(prev => sortItems(prev.filter(f => f.path !== selectedItem.path).concat(result.data!)));
      setSelectedItem(result.data);
      if (selectedItem.isDirectory) {
        await loadTree();
      }
    } else {
      throw new Error(result.error || 'Failed to rename');
    }
  }, [api, selectedItem, loadTree]);

  // Context menu handler
  const handleContextMenu = useCallback((item: FileSystemItem, event: React.MouseEvent) => {
    setContextMenuItem(item);
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenuPosition(null);
    setContextMenuItem(null);
  }, []);

  // Metadata dialog handlers
  const handleViewMetadata = useCallback(async () => {
    if (!contextMenuItem) return;

    setSelectedItem(contextMenuItem);
    setMetadataOpen(true);
    setFileMetadata(null);

    // Fetch metadata if API method is available
    if (api.getFileMetadata) {
      setIsMetadataLoading(true);
      try {
        const result = await api.getFileMetadata(contextMenuItem.path);
        if (result.success && result.data) {
          setFileMetadata(result.data);
        }
      } catch (err) {
        // Silently handle error - basic metadata will still be shown
      } finally {
        setIsMetadataLoading(false);
      }
    }
  }, [api, contextMenuItem]);

  // Build context menu items
  const contextMenuItems: ContextMenuItem[] = contextMenuItem ? [
    {
      id: 'metadata',
      label: 'View Metadata',
      icon: InfoIcon,
      onClick: handleViewMetadata,
    },
    {
      id: 'divider1',
      label: '',
      divider: true,
      onClick: () => {},
    },
    {
      id: 'rename',
      label: 'Rename',
      icon: PencilIcon,
      onClick: () => {
        setSelectedItem(contextMenuItem);
        setRenameOpen(true);
      },
    },
    {
      id: 'download',
      label: 'Download',
      icon: DownloadIcon,
      onClick: async () => {
        if (contextMenuItem.isDirectory) return;
        const result = await api.downloadFile(contextMenuItem.path);
        if (result.success && result.data) {
          const blob = result.data;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = contextMenuItem.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } else {
          onError?.(result.error || 'Failed to download file');
        }
      },
      disabled: contextMenuItem.isDirectory,
    },
    {
      id: 'divider2',
      label: '',
      divider: true,
      onClick: () => {},
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: TrashIcon,
      danger: true,
      onClick: () => {
        setSelectedItem(contextMenuItem);
        setDeleteOpen(true);
      },
    },
  ] : [];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className={`flex flex-col h-full bg-white border rounded-lg overflow-hidden ${className}`}>
        {/* Row 1: Header - Breadcrumb and Actions */}
        <div className="flex items-center justify-between p-3 border-b bg-gray-50">
          <PathBreadcrumb
            currentPath={currentPath}
            onNavigate={handleNavigate}
          />
          <FileActions
            selectedItem={selectedItem}
            onCreateFolder={() => setCreateFolderOpen(true)}
            onUpload={(files) => handleUpload(files)}
            onDownload={handleDownload}
            onDelete={() => setDeleteOpen(true)}
            onRename={() => setRenameOpen(true)}
            onRefresh={handleRefresh}
            isLoading={isLoading}
          />
        </div>

        {/* Row 2: Main content - Tree and File List */}
        <div className="flex flex-1 min-h-0">
          {/* Column 1: Folder Tree */}
          {showTree && (
            <div
              className="border-r overflow-auto"
              style={{ width: treeWidth, minWidth: treeWidth }}
            >
              <FolderTree
                tree={tree}
                currentPath={currentPath}
                onSelect={handleNavigate}
                onExpand={handleTreeExpand}
                onToggle={handleTreeToggle}
                isDragging={isDragging}
                dropTargetPath={dropTargetPath}
                className="p-2"
              />
            </div>
          )}

          {/* Column 2: File List */}
          <div className="flex-1 min-w-0 overflow-auto">
            <FileList
              files={files}
              selectedItem={selectedItem}
              isLoading={isLoading}
              onSelect={handleSelect}
              onOpen={handleOpen}
              onContextMenu={handleContextMenu}
              viewMode={viewMode}
              draggedItem={draggedItem}
              dropTargetPath={dropTargetPath}
              className="h-full"
            />
          </div>
        </div>

      {/* Row 3: Preview */}
      {showPreview && (
        <div
          className="border-t"
          style={{ height: previewHeight, minHeight: previewHeight }}
        >
          <FilePreview
            item={selectedItem}
            getPreviewUrl={api.getPreviewUrl}
            getFileContent={api.getFileContent}
            className="h-full"
          />
        </div>
      )}

      {/* Dialogs */}
      <CreateFolderDialog
        isOpen={createFolderOpen}
        currentPath={currentPath}
        onClose={() => setCreateFolderOpen(false)}
        onSubmit={handleCreateFolder}
      />

      <RenameDialog
        isOpen={renameOpen}
        item={selectedItem}
        onClose={() => setRenameOpen(false)}
        onSubmit={handleRename}
      />

      <DeleteConfirmDialog
        isOpen={deleteOpen}
        item={selectedItem}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
      />

      <UploadDialog
        isOpen={uploadOpen}
        currentPath={currentPath}
        onClose={() => setUploadOpen(false)}
        onUpload={handleUpload}
      />

      <MetadataDialog
        isOpen={metadataOpen}
        item={selectedItem}
        metadata={fileMetadata}
        isLoading={isMetadataLoading}
        onClose={() => {
          setMetadataOpen(false);
          setFileMetadata(null);
        }}
      />

      {/* Context Menu */}
      <ContextMenu
        items={contextMenuItems}
        position={contextMenuPosition}
        onClose={closeContextMenu}
      />
      </div>

      {/* Drag overlay for visual feedback */}
      <DragOverlay>
        {draggedItem ? (
          <DragPreview item={draggedItem} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// Helper functions
function toggleTreeNode(nodes: TreeNode[], path: string): TreeNode[] {
  return nodes.map(node => {
    if (node.path === path) {
      return { ...node, isExpanded: !node.isExpanded };
    }
    if (node.children.length > 0) {
      return { ...node, children: toggleTreeNode(node.children, path) };
    }
    return node;
  });
}

function updateTreeNode(
  nodes: TreeNode[],
  path: string,
  children: TreeNode[],
  isExpanded: boolean
): TreeNode[] {
  return nodes.map(node => {
    if (node.path === path) {
      return { ...node, children, isExpanded };
    }
    if (node.children.length > 0) {
      return { ...node, children: updateTreeNode(node.children, path, children, isExpanded) };
    }
    return node;
  });
}

function sortItems(items: FileSystemItem[]): FileSystemItem[] {
  return [...items].sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });
}

export default FileBrowser;
