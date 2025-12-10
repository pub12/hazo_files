/**
 * MIME type utilities
 */

import { getExtension } from './path-utils';

const MIME_TYPES: Record<string, string> = {
  // Text
  '.txt': 'text/plain',
  '.html': 'text/html',
  '.htm': 'text/html',
  '.css': 'text/css',
  '.csv': 'text/csv',
  '.xml': 'text/xml',
  '.json': 'application/json',
  '.js': 'application/javascript',
  '.ts': 'application/typescript',
  '.jsx': 'text/jsx',
  '.tsx': 'text/tsx',
  '.md': 'text/markdown',
  '.yaml': 'text/yaml',
  '.yml': 'text/yaml',

  // Images
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',

  // Documents
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

  // Archives
  '.zip': 'application/zip',
  '.rar': 'application/x-rar-compressed',
  '.7z': 'application/x-7z-compressed',
  '.tar': 'application/x-tar',
  '.gz': 'application/gzip',

  // Audio
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.flac': 'audio/flac',

  // Video
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.avi': 'video/x-msvideo',
  '.mov': 'video/quicktime',
  '.wmv': 'video/x-ms-wmv',
  '.mkv': 'video/x-matroska',

  // Fonts
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',

  // Other
  '.exe': 'application/x-msdownload',
  '.dmg': 'application/x-apple-diskimage',
  '.bin': 'application/octet-stream',
};

const EXTENSION_BY_MIME: Record<string, string> = Object.entries(MIME_TYPES).reduce(
  (acc, [ext, mime]) => {
    if (!acc[mime]) {
      acc[mime] = ext;
    }
    return acc;
  },
  {} as Record<string, string>
);

/**
 * Get MIME type from file extension
 */
export function getMimeType(filename: string): string {
  const ext = getExtension(filename).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

/**
 * Get extension from MIME type
 */
export function getExtensionFromMime(mimeType: string): string {
  return EXTENSION_BY_MIME[mimeType] || '';
}

/**
 * Check if file is an image
 */
export function isImage(filenameOrMime: string): boolean {
  const mime = filenameOrMime.includes('/') ? filenameOrMime : getMimeType(filenameOrMime);
  return mime.startsWith('image/');
}

/**
 * Check if file is a video
 */
export function isVideo(filenameOrMime: string): boolean {
  const mime = filenameOrMime.includes('/') ? filenameOrMime : getMimeType(filenameOrMime);
  return mime.startsWith('video/');
}

/**
 * Check if file is audio
 */
export function isAudio(filenameOrMime: string): boolean {
  const mime = filenameOrMime.includes('/') ? filenameOrMime : getMimeType(filenameOrMime);
  return mime.startsWith('audio/');
}

/**
 * Check if file is a text file
 */
export function isText(filenameOrMime: string): boolean {
  const mime = filenameOrMime.includes('/') ? filenameOrMime : getMimeType(filenameOrMime);
  return mime.startsWith('text/') || mime === 'application/json' || mime === 'application/javascript';
}

/**
 * Check if file is a document (PDF, Word, Excel, etc.)
 */
export function isDocument(filenameOrMime: string): boolean {
  const mime = filenameOrMime.includes('/') ? filenameOrMime : getMimeType(filenameOrMime);
  return (
    mime === 'application/pdf' ||
    mime.includes('document') ||
    mime.includes('spreadsheet') ||
    mime.includes('presentation')
  );
}

/**
 * Check if file can be previewed in browser
 */
export function isPreviewable(filenameOrMime: string): boolean {
  return isImage(filenameOrMime) || isText(filenameOrMime) || isVideo(filenameOrMime) || isAudio(filenameOrMime);
}

/**
 * Get file type category
 */
export function getFileCategory(filenameOrMime: string): 'image' | 'video' | 'audio' | 'document' | 'text' | 'other' {
  if (isImage(filenameOrMime)) return 'image';
  if (isVideo(filenameOrMime)) return 'video';
  if (isAudio(filenameOrMime)) return 'audio';
  if (isDocument(filenameOrMime)) return 'document';
  if (isText(filenameOrMime)) return 'text';
  return 'other';
}
