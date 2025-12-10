/**
 * Path manipulation utilities
 */

import { InvalidPathError } from './errors';

/**
 * Normalize a path (handle separators, remove trailing slashes, resolve . and ..)
 */
export function normalizePath(inputPath: string): string {
  if (!inputPath) return '/';

  // Replace backslashes with forward slashes
  let normalized = inputPath.replace(/\\/g, '/');

  // Handle multiple consecutive slashes
  normalized = normalized.replace(/\/+/g, '/');

  // Handle . and ..
  const parts = normalized.split('/');
  const result: string[] = [];

  for (const part of parts) {
    if (part === '.' || part === '') continue;
    if (part === '..') {
      result.pop();
    } else {
      result.push(part);
    }
  }

  normalized = '/' + result.join('/');

  return normalized;
}

/**
 * Join path segments
 */
export function joinPath(...segments: string[]): string {
  const joined = segments
    .map(s => s.replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');
  return normalizePath('/' + joined);
}

/**
 * Get the parent directory of a path
 */
export function getParentPath(inputPath: string): string {
  const normalized = normalizePath(inputPath);
  if (normalized === '/') return '/';

  const lastSlash = normalized.lastIndexOf('/');
  if (lastSlash === 0) return '/';
  return normalized.slice(0, lastSlash) || '/';
}

/**
 * Get the base name (file/folder name) from a path
 */
export function getBaseName(inputPath: string): string {
  const normalized = normalizePath(inputPath);
  if (normalized === '/') return '';

  const lastSlash = normalized.lastIndexOf('/');
  return normalized.slice(lastSlash + 1);
}

/**
 * Get the directory name from a path (alias for getParentPath)
 */
export function getDirName(inputPath: string): string {
  return getParentPath(inputPath);
}

/**
 * Get path segments as array
 */
export function getPathSegments(inputPath: string): string[] {
  const normalized = normalizePath(inputPath);
  if (normalized === '/') return [];
  return normalized.slice(1).split('/');
}

/**
 * Check if a path is a child of another path
 */
export function isChildPath(parentPath: string, childPath: string): boolean {
  const normalizedParent = normalizePath(parentPath);
  const normalizedChild = normalizePath(childPath);

  if (normalizedParent === '/') {
    return normalizedChild !== '/';
  }

  return normalizedChild.startsWith(normalizedParent + '/');
}

/**
 * Get relative path from base to target
 */
export function getRelativePath(basePath: string, targetPath: string): string {
  const baseSegments = getPathSegments(basePath);
  const targetSegments = getPathSegments(targetPath);

  // Find common prefix
  let commonLength = 0;
  while (
    commonLength < baseSegments.length &&
    commonLength < targetSegments.length &&
    baseSegments[commonLength] === targetSegments[commonLength]
  ) {
    commonLength++;
  }

  // Build relative path
  const upCount = baseSegments.length - commonLength;
  const remaining = targetSegments.slice(commonLength);

  const parts: string[] = [];
  for (let i = 0; i < upCount; i++) {
    parts.push('..');
  }
  parts.push(...remaining);

  return parts.join('/') || '.';
}

/**
 * Validate a path for security issues
 */
export function validatePath(inputPath: string, basePath?: string): void {
  // Normalize is called for side-effect of checking path validity
  normalizePath(inputPath);

  // Check for null bytes
  if (inputPath.includes('\0')) {
    throw new InvalidPathError(inputPath, 'Path contains null bytes');
  }

  // Check for path traversal if basePath is provided
  if (basePath) {
    const normalizedBase = normalizePath(basePath);
    const fullPath = joinPath(normalizedBase, inputPath);

    if (!fullPath.startsWith(normalizedBase)) {
      throw new InvalidPathError(inputPath, 'Path traversal detected');
    }
  }
}

/**
 * Create a safe filename by removing/replacing invalid characters
 */
export function sanitizeFilename(filename: string): string {
  // Remove or replace invalid characters
  let sanitized = filename
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/^\.+/, '')
    .trim();

  // Ensure filename is not empty
  if (!sanitized) {
    sanitized = 'unnamed';
  }

  // Limit length
  if (sanitized.length > 255) {
    const ext = getExtension(sanitized);
    const name = sanitized.slice(0, 255 - ext.length);
    sanitized = name + ext;
  }

  return sanitized;
}

/**
 * Get file extension
 */
export function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1 || lastDot === 0) return '';
  return filename.slice(lastDot);
}

/**
 * Get filename without extension
 */
export function getNameWithoutExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1 || lastDot === 0) return filename;
  return filename.slice(0, lastDot);
}

/**
 * Check if filename has specific extension
 */
export function hasExtension(filename: string, extension: string): boolean {
  const ext = getExtension(filename).toLowerCase();
  const targetExt = extension.startsWith('.') ? extension.toLowerCase() : '.' + extension.toLowerCase();
  return ext === targetExt;
}

/**
 * Get breadcrumb segments for a path
 */
export function getBreadcrumbs(inputPath: string): Array<{ name: string; path: string }> {
  const segments = getPathSegments(inputPath);
  const breadcrumbs: Array<{ name: string; path: string }> = [
    { name: 'Root', path: '/' },
  ];

  let currentPath = '';
  for (const segment of segments) {
    currentPath += '/' + segment;
    breadcrumbs.push({
      name: segment,
      path: currentPath,
    });
  }

  return breadcrumbs;
}
