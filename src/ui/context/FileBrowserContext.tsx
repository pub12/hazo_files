/**
 * FileBrowser Context
 * Provides state management for the file browser component
 */

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import type {
  FileSystemItem,
  TreeNode,
  FileBrowserState,
  OperationResult,
  FileItem,
  FolderItem,
} from '../../types';

// Action types
type FileBrowserAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CURRENT_PATH'; payload: string }
  | { type: 'SET_FILES'; payload: FileSystemItem[] }
  | { type: 'SET_TREE'; payload: TreeNode[] }
  | { type: 'SET_SELECTED_ITEM'; payload: FileSystemItem | null }
  | { type: 'UPDATE_TREE_NODE'; payload: { path: string; children: TreeNode[]; isExpanded: boolean } }
  | { type: 'TOGGLE_TREE_NODE'; payload: string }
  | { type: 'ADD_ITEM'; payload: FileSystemItem }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_ITEM'; payload: FileSystemItem }
  | { type: 'REFRESH' };

// Initial state
const initialState: FileBrowserState = {
  currentPath: '/',
  selectedItem: null,
  tree: [],
  files: [],
  isLoading: false,
  error: null,
};

// Reducer
function fileBrowserReducer(state: FileBrowserState, action: FileBrowserAction): FileBrowserState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };

    case 'SET_CURRENT_PATH':
      return { ...state, currentPath: action.payload };

    case 'SET_FILES':
      return { ...state, files: action.payload, isLoading: false };

    case 'SET_TREE':
      return { ...state, tree: action.payload };

    case 'SET_SELECTED_ITEM':
      return { ...state, selectedItem: action.payload };

    case 'UPDATE_TREE_NODE': {
      const updateNode = (nodes: TreeNode[], path: string, children: TreeNode[], isExpanded: boolean): TreeNode[] => {
        return nodes.map(node => {
          if (node.path === path) {
            return { ...node, children, isExpanded };
          }
          if (node.children.length > 0) {
            return { ...node, children: updateNode(node.children, path, children, isExpanded) };
          }
          return node;
        });
      };
      return {
        ...state,
        tree: updateNode(state.tree, action.payload.path, action.payload.children, action.payload.isExpanded),
      };
    }

    case 'TOGGLE_TREE_NODE': {
      const toggleNode = (nodes: TreeNode[], path: string): TreeNode[] => {
        return nodes.map(node => {
          if (node.path === path) {
            return { ...node, isExpanded: !node.isExpanded };
          }
          if (node.children.length > 0) {
            return { ...node, children: toggleNode(node.children, path) };
          }
          return node;
        });
      };
      return { ...state, tree: toggleNode(state.tree, action.payload) };
    }

    case 'ADD_ITEM':
      return {
        ...state,
        files: [...state.files, action.payload].sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        }),
      };

    case 'REMOVE_ITEM':
      return {
        ...state,
        files: state.files.filter(f => f.path !== action.payload),
        selectedItem: state.selectedItem?.path === action.payload ? null : state.selectedItem,
      };

    case 'UPDATE_ITEM':
      return {
        ...state,
        files: state.files.map(f => (f.path === action.payload.path ? action.payload : f)),
        selectedItem: state.selectedItem?.path === action.payload.path ? action.payload : state.selectedItem,
      };

    case 'REFRESH':
      return { ...state, isLoading: true };

    default:
      return state;
  }
}

// API interface for file operations
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
}

// Context value type
interface FileBrowserContextValue {
  state: FileBrowserState;
  dispatch: React.Dispatch<FileBrowserAction>;
  api: FileBrowserAPI | null;

  // Actions
  navigateTo: (path: string) => Promise<void>;
  refresh: () => Promise<void>;
  selectItem: (item: FileSystemItem | null) => void;
  toggleTreeNode: (path: string) => void;
  expandTreeNode: (path: string) => Promise<void>;

  // Operations
  createFolder: (name: string) => Promise<OperationResult<FolderItem>>;
  deleteSelected: () => Promise<OperationResult>;
  renameSelected: (newName: string) => Promise<OperationResult<FileSystemItem>>;
  uploadFiles: (files: FileList) => Promise<OperationResult<FileItem>[]>;
  downloadSelected: () => Promise<void>;
  moveSelected: (destinationPath: string) => Promise<OperationResult<FileSystemItem>>;
}

const FileBrowserContext = createContext<FileBrowserContextValue | null>(null);

export interface FileBrowserProviderProps {
  children: ReactNode;
  api: FileBrowserAPI;
  initialPath?: string;
}

export function FileBrowserProvider({ children, api, initialPath = '/' }: FileBrowserProviderProps) {
  const [state, dispatch] = useReducer(fileBrowserReducer, {
    ...initialState,
    currentPath: initialPath,
  });

  // Navigation
  const navigateTo = useCallback(async (path: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_CURRENT_PATH', payload: path });
    dispatch({ type: 'SET_SELECTED_ITEM', payload: null });

    const result = await api.listDirectory(path);
    if (result.success && result.data) {
      dispatch({ type: 'SET_FILES', payload: result.data });
    } else {
      dispatch({ type: 'SET_ERROR', payload: result.error || 'Failed to load directory' });
    }
  }, [api]);

  // Refresh current directory
  const refresh = useCallback(async () => {
    await navigateTo(state.currentPath);

    // Also refresh tree
    const treeResult = await api.getFolderTree('/', 2);
    if (treeResult.success && treeResult.data) {
      dispatch({ type: 'SET_TREE', payload: treeResult.data });
    }
  }, [api, navigateTo, state.currentPath]);

  // Select item
  const selectItem = useCallback((item: FileSystemItem | null) => {
    dispatch({ type: 'SET_SELECTED_ITEM', payload: item });
  }, []);

  // Toggle tree node expansion
  const toggleTreeNode = useCallback((path: string) => {
    dispatch({ type: 'TOGGLE_TREE_NODE', payload: path });
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
      dispatch({ type: 'UPDATE_TREE_NODE', payload: { path, children, isExpanded: true } });
    }
  }, [api]);

  // Create folder
  const createFolder = useCallback(async (name: string): Promise<OperationResult<FolderItem>> => {
    const newPath = state.currentPath === '/' ? `/${name}` : `${state.currentPath}/${name}`;
    const result = await api.createDirectory(newPath);
    if (result.success && result.data) {
      dispatch({ type: 'ADD_ITEM', payload: result.data });
    }
    return result;
  }, [api, state.currentPath]);

  // Delete selected item
  const deleteSelected = useCallback(async (): Promise<OperationResult> => {
    if (!state.selectedItem) {
      return { success: false, error: 'No item selected' };
    }

    let result: OperationResult;
    if (state.selectedItem.isDirectory) {
      result = await api.removeDirectory(state.selectedItem.path, true);
    } else {
      result = await api.deleteFile(state.selectedItem.path);
    }

    if (result.success) {
      dispatch({ type: 'REMOVE_ITEM', payload: state.selectedItem.path });
    }
    return result;
  }, [api, state.selectedItem]);

  // Rename selected item
  const renameSelected = useCallback(async (newName: string): Promise<OperationResult<FileSystemItem>> => {
    if (!state.selectedItem) {
      return { success: false, error: 'No item selected' };
    }

    let result: OperationResult<FileSystemItem>;
    if (state.selectedItem.isDirectory) {
      result = await api.renameFolder(state.selectedItem.path, newName);
    } else {
      result = await api.renameFile(state.selectedItem.path, newName);
    }

    if (result.success && result.data) {
      dispatch({ type: 'REMOVE_ITEM', payload: state.selectedItem.path });
      dispatch({ type: 'ADD_ITEM', payload: result.data });
      dispatch({ type: 'SET_SELECTED_ITEM', payload: result.data });
    }
    return result;
  }, [api, state.selectedItem]);

  // Upload files
  const uploadFiles = useCallback(async (files: FileList): Promise<OperationResult<FileItem>[]> => {
    const results: OperationResult<FileItem>[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const remotePath = state.currentPath === '/' ? `/${file.name}` : `${state.currentPath}/${file.name}`;
      const result = await api.uploadFile(file, remotePath);
      results.push(result);

      if (result.success && result.data) {
        dispatch({ type: 'ADD_ITEM', payload: result.data });
      }
    }

    return results;
  }, [api, state.currentPath]);

  // Download selected item
  const downloadSelected = useCallback(async () => {
    if (!state.selectedItem || state.selectedItem.isDirectory) {
      return;
    }

    const result = await api.downloadFile(state.selectedItem.path);
    if (result.success && result.data) {
      // Trigger browser download
      const blob = result.data as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = state.selectedItem.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [api, state.selectedItem]);

  // Move selected item
  const moveSelected = useCallback(async (destinationPath: string): Promise<OperationResult<FileSystemItem>> => {
    if (!state.selectedItem) {
      return { success: false, error: 'No item selected' };
    }

    const result = await api.moveItem(state.selectedItem.path, destinationPath);
    if (result.success) {
      dispatch({ type: 'REMOVE_ITEM', payload: state.selectedItem.path });
    }
    return result;
  }, [api, state.selectedItem]);

  const value: FileBrowserContextValue = {
    state,
    dispatch,
    api,
    navigateTo,
    refresh,
    selectItem,
    toggleTreeNode,
    expandTreeNode,
    createFolder,
    deleteSelected,
    renameSelected,
    uploadFiles,
    downloadSelected,
    moveSelected,
  };

  return (
    <FileBrowserContext.Provider value={value}>
      {children}
    </FileBrowserContext.Provider>
  );
}

export function useFileBrowserContext(): FileBrowserContextValue {
  const context = useContext(FileBrowserContext);
  if (!context) {
    throw new Error('useFileBrowserContext must be used within a FileBrowserProvider');
  }
  return context;
}

export default FileBrowserContext;
