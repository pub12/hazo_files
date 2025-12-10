/**
 * useFileBrowser Hook
 * Provides a convenient hook for using the file browser functionality
 */

import { useCallback, useEffect, useState } from 'react';
import type {
  FileSystemItem,
  TreeNode,
  FileBrowserState,
  OperationResult,
  FileItem,
  FolderItem,
} from '../../types';
import type { FileBrowserAPI } from '../context/FileBrowserContext';

export interface UseFileBrowserOptions {
  api: FileBrowserAPI;
  initialPath?: string;
  autoLoad?: boolean;
}

export interface UseFileBrowserReturn {
  // State
  currentPath: string;
  files: FileSystemItem[];
  tree: TreeNode[];
  selectedItem: FileSystemItem | null;
  isLoading: boolean;
  error: string | null;

  // Navigation
  navigateTo: (path: string) => Promise<void>;
  navigateUp: () => Promise<void>;
  refresh: () => Promise<void>;

  // Selection
  selectItem: (item: FileSystemItem | null) => void;

  // Tree
  toggleTreeNode: (path: string) => void;
  expandTreeNode: (path: string) => Promise<void>;
  loadTree: (depth?: number) => Promise<void>;

  // Operations
  createFolder: (name: string) => Promise<OperationResult<FolderItem>>;
  deleteItem: (path: string) => Promise<OperationResult>;
  deleteSelected: () => Promise<OperationResult>;
  renameItem: (path: string, newName: string, isDirectory: boolean) => Promise<OperationResult<FileSystemItem>>;
  renameSelected: (newName: string) => Promise<OperationResult<FileSystemItem>>;
  uploadFiles: (files: FileList) => Promise<OperationResult<FileItem>[]>;
  downloadFile: (path: string) => Promise<void>;
  downloadSelected: () => Promise<void>;
  moveItem: (sourcePath: string, destinationPath: string) => Promise<OperationResult<FileSystemItem>>;
}

export function useFileBrowser(options: UseFileBrowserOptions): UseFileBrowserReturn {
  const { api, initialPath = '/', autoLoad = true } = options;

  const [state, setState] = useState<FileBrowserState>({
    currentPath: initialPath,
    files: [],
    tree: [],
    selectedItem: null,
    isLoading: false,
    error: null,
  });

  // Load directory contents
  const loadDirectory = useCallback(async (path: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    const result = await api.listDirectory(path);
    if (result.success && result.data) {
      setState(prev => ({
        ...prev,
        files: result.data!,
        currentPath: path,
        isLoading: false,
      }));
    } else {
      setState(prev => ({
        ...prev,
        error: result.error || 'Failed to load directory',
        isLoading: false,
      }));
    }
  }, [api]);

  // Load folder tree
  const loadTree = useCallback(async (depth = 2) => {
    const result = await api.getFolderTree('/', depth);
    if (result.success && result.data) {
      setState(prev => ({ ...prev, tree: result.data! }));
    }
  }, [api]);

  // Navigate to path
  const navigateTo = useCallback(async (path: string) => {
    setState(prev => ({ ...prev, selectedItem: null }));
    await loadDirectory(path);
  }, [loadDirectory]);

  // Navigate to parent
  const navigateUp = useCallback(async () => {
    if (state.currentPath === '/') return;

    const parentPath = state.currentPath.split('/').slice(0, -1).join('/') || '/';
    await navigateTo(parentPath);
  }, [state.currentPath, navigateTo]);

  // Refresh current directory
  const refresh = useCallback(async () => {
    await loadDirectory(state.currentPath);
    await loadTree();
  }, [loadDirectory, loadTree, state.currentPath]);

  // Select item
  const selectItem = useCallback((item: FileSystemItem | null) => {
    setState(prev => ({ ...prev, selectedItem: item }));
  }, []);

  // Toggle tree node
  const toggleTreeNode = useCallback((path: string) => {
    setState(prev => ({
      ...prev,
      tree: toggleNode(prev.tree, path),
    }));
  }, []);

  // Expand tree node and load children
  const expandTreeNode = useCallback(async (path: string) => {
    const result = await api.listDirectory(path);
    if (result.success && result.data) {
      const folders = result.data.filter(item => item.isDirectory);
      const children: TreeNode[] = folders.map(folder => ({
        id: folder.id,
        name: folder.name,
        path: folder.path,
        children: [],
      }));

      setState(prev => ({
        ...prev,
        tree: updateTreeNode(prev.tree, path, children, true),
      }));
    }
  }, [api]);

  // Create folder
  const createFolder = useCallback(async (name: string): Promise<OperationResult<FolderItem>> => {
    const newPath = state.currentPath === '/' ? `/${name}` : `${state.currentPath}/${name}`;
    const result = await api.createDirectory(newPath);
    if (result.success && result.data) {
      setState(prev => ({
        ...prev,
        files: sortItems([...prev.files, result.data!]),
      }));
    }
    return result;
  }, [api, state.currentPath]);

  // Delete item
  const deleteItem = useCallback(async (path: string): Promise<OperationResult> => {
    const item = state.files.find(f => f.path === path);
    if (!item) {
      return { success: false, error: 'Item not found' };
    }

    let result: OperationResult;
    if (item.isDirectory) {
      result = await api.removeDirectory(path, true);
    } else {
      result = await api.deleteFile(path);
    }

    if (result.success) {
      setState(prev => ({
        ...prev,
        files: prev.files.filter(f => f.path !== path),
        selectedItem: prev.selectedItem?.path === path ? null : prev.selectedItem,
      }));
    }
    return result;
  }, [api, state.files]);

  // Delete selected
  const deleteSelected = useCallback(async (): Promise<OperationResult> => {
    if (!state.selectedItem) {
      return { success: false, error: 'No item selected' };
    }
    return deleteItem(state.selectedItem.path);
  }, [deleteItem, state.selectedItem]);

  // Rename item
  const renameItem = useCallback(async (
    path: string,
    newName: string,
    isDirectory: boolean
  ): Promise<OperationResult<FileSystemItem>> => {
    let result: OperationResult<FileSystemItem>;
    if (isDirectory) {
      result = await api.renameFolder(path, newName);
    } else {
      result = await api.renameFile(path, newName);
    }

    if (result.success && result.data) {
      setState(prev => ({
        ...prev,
        files: sortItems(prev.files.filter(f => f.path !== path).concat(result.data!)),
        selectedItem: prev.selectedItem?.path === path ? result.data! : prev.selectedItem,
      }));
    }
    return result;
  }, [api]);

  // Rename selected
  const renameSelected = useCallback(async (newName: string): Promise<OperationResult<FileSystemItem>> => {
    if (!state.selectedItem) {
      return { success: false, error: 'No item selected' };
    }
    return renameItem(state.selectedItem.path, newName, state.selectedItem.isDirectory);
  }, [renameItem, state.selectedItem]);

  // Upload files
  const uploadFiles = useCallback(async (files: FileList): Promise<OperationResult<FileItem>[]> => {
    const results: OperationResult<FileItem>[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const remotePath = state.currentPath === '/' ? `/${file.name}` : `${state.currentPath}/${file.name}`;
      const result = await api.uploadFile(file, remotePath);
      results.push(result);

      if (result.success && result.data) {
        setState(prev => ({
          ...prev,
          files: sortItems([...prev.files, result.data!]),
        }));
      }
    }

    return results;
  }, [api, state.currentPath]);

  // Download file
  const downloadFile = useCallback(async (path: string) => {
    const item = state.files.find(f => f.path === path);
    if (!item || item.isDirectory) return;

    const result = await api.downloadFile(path);
    if (result.success && result.data) {
      const blob = result.data as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [api, state.files]);

  // Download selected
  const downloadSelected = useCallback(async () => {
    if (!state.selectedItem || state.selectedItem.isDirectory) return;
    await downloadFile(state.selectedItem.path);
  }, [downloadFile, state.selectedItem]);

  // Move item
  const moveItem = useCallback(async (
    sourcePath: string,
    destinationPath: string
  ): Promise<OperationResult<FileSystemItem>> => {
    const result = await api.moveItem(sourcePath, destinationPath);
    if (result.success) {
      setState(prev => ({
        ...prev,
        files: prev.files.filter(f => f.path !== sourcePath),
        selectedItem: prev.selectedItem?.path === sourcePath ? null : prev.selectedItem,
      }));
    }
    return result;
  }, [api]);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      loadDirectory(initialPath);
      loadTree();
    }
  }, [autoLoad, initialPath, loadDirectory, loadTree]);

  return {
    // State
    currentPath: state.currentPath,
    files: state.files,
    tree: state.tree,
    selectedItem: state.selectedItem,
    isLoading: state.isLoading,
    error: state.error,

    // Navigation
    navigateTo,
    navigateUp,
    refresh,

    // Selection
    selectItem,

    // Tree
    toggleTreeNode,
    expandTreeNode,
    loadTree,

    // Operations
    createFolder,
    deleteItem,
    deleteSelected,
    renameItem,
    renameSelected,
    uploadFiles,
    downloadFile,
    downloadSelected,
    moveItem,
  };
}

// Helper functions
function toggleNode(nodes: TreeNode[], path: string): TreeNode[] {
  return nodes.map(node => {
    if (node.path === path) {
      return { ...node, isExpanded: !node.isExpanded };
    }
    if (node.children.length > 0) {
      return { ...node, children: toggleNode(node.children, path) };
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

export default useFileBrowser;
