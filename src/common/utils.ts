/**
 * Common utility functions
 */

import type { OperationResult, FileItem, FolderItem, FileSystemItem } from '../types';

/**
 * Create a successful operation result
 */
export function successResult<T>(data?: T): OperationResult<T> {
  return {
    success: true,
    data,
  };
}

/**
 * Create a failed operation result
 */
export function errorResult<T = void>(error: string): OperationResult<T> {
  return {
    success: false,
    error,
  };
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Check if item is a file
 */
export function isFile(item: FileSystemItem): item is FileItem {
  return !item.isDirectory;
}

/**
 * Check if item is a folder
 */
export function isFolder(item: FileSystemItem): item is FolderItem {
  return item.isDirectory;
}

/**
 * Sort file system items (folders first, then alphabetically)
 */
export function sortItems(items: FileSystemItem[]): FileSystemItem[] {
  return [...items].sort((a, b) => {
    // Folders first
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    // Then alphabetically
    return a.name.localeCompare(b.name);
  });
}

/**
 * Filter items by search term
 */
export function filterItems(items: FileSystemItem[], searchTerm: string): FileSystemItem[] {
  const term = searchTerm.toLowerCase();
  return items.filter(item => item.name.toLowerCase().includes(term));
}

/**
 * Create a delay (useful for rate limiting)
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry an operation with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        await delay(initialDelay * Math.pow(2, attempt));
      }
    }
  }

  throw lastError;
}

/**
 * Check if running in browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Check if running in Node.js environment
 */
export function isNode(): boolean {
  return typeof process !== 'undefined' && process.versions?.node !== undefined;
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Create a FileItem object
 */
export function createFileItem(params: {
  id: string;
  name: string;
  path: string;
  size: number;
  mimeType: string;
  createdAt?: Date;
  modifiedAt?: Date;
  parentId?: string;
  metadata?: Record<string, unknown>;
}): FileItem {
  return {
    id: params.id,
    name: params.name,
    path: params.path,
    size: params.size,
    mimeType: params.mimeType,
    createdAt: params.createdAt || new Date(),
    modifiedAt: params.modifiedAt || new Date(),
    isDirectory: false,
    parentId: params.parentId,
    metadata: params.metadata,
  };
}

/**
 * Create a FolderItem object
 */
export function createFolderItem(params: {
  id: string;
  name: string;
  path: string;
  createdAt?: Date;
  modifiedAt?: Date;
  parentId?: string;
  children?: (FileItem | FolderItem)[];
  metadata?: Record<string, unknown>;
}): FolderItem {
  return {
    id: params.id,
    name: params.name,
    path: params.path,
    createdAt: params.createdAt || new Date(),
    modifiedAt: params.modifiedAt || new Date(),
    isDirectory: true,
    parentId: params.parentId,
    children: params.children,
    metadata: params.metadata,
  };
}
