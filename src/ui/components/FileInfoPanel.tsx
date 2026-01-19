/**
 * FileInfoPanel Component
 * Standalone file information display panel that can be used independently
 * or embedded in dialogs, sidebars, or other containers.
 */

import type { FileSystemItem, FileItem } from '../../types';
import { LoaderIcon } from '../icons/FileIcons';
import { formatBytes } from '../../common/utils';

/**
 * Extended metadata including database record data
 */
export interface FileMetadata {
  id: string;
  name: string;
  path: string;
  size?: number;
  mimeType?: string;
  createdAt: Date;
  modifiedAt: Date;
  isDirectory: boolean;
  file_data?: Record<string, unknown>;
  storage_type?: string;
}

export interface FileInfoPanelProps {
  /** The file or folder item to display info for */
  item: FileSystemItem | null;
  /** Additional metadata from database or external source */
  metadata?: FileMetadata | null;
  /** Show loading state for custom metadata section */
  isLoading?: boolean;
  /** Whether to show the custom metadata JSON section (default: true) */
  showCustomMetadata?: boolean;
  /** Additional CSS classes for the container */
  className?: string;
}

function formatDate(date: Date | string | undefined): string {
  if (!date) return '-';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleString();
}

function formatJSON(data: Record<string, unknown> | undefined): string {
  if (!data || Object.keys(data).length === 0) {
    return 'No custom metadata';
  }
  return JSON.stringify(data, null, 2);
}

/**
 * FileInfoPanel displays file metadata in a structured format.
 * Can be used standalone in sidebars, custom dialogs, or inline panels.
 *
 * @example
 * // In a sidebar
 * <FileInfoPanel item={selectedFile} metadata={fileMetadata} />
 *
 * @example
 * // Without custom metadata section
 * <FileInfoPanel item={file} showCustomMetadata={false} />
 *
 * @example
 * // With custom styling
 * <FileInfoPanel item={file} className="p-4 bg-gray-50 rounded-lg" />
 */
export function FileInfoPanel({
  item,
  metadata,
  isLoading = false,
  showCustomMetadata = true,
  className = '',
}: FileInfoPanelProps) {
  if (!item) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        No item selected
      </div>
    );
  }

  // Combine item data with fetched metadata
  const displayData = {
    name: item.name || '-',
    path: item.path || '-',
    type: item.isDirectory ? 'Folder' : (item as FileItem)?.mimeType || 'Unknown',
    size: item.isDirectory ? undefined : (item as FileItem)?.size,
    createdAt: item.createdAt,
    modifiedAt: item.modifiedAt,
    storageType: metadata?.storage_type,
    fileData: metadata?.file_data,
  };

  return (
    <div className={className}>
      {/* Basic Info */}
      <dl className="space-y-3">
        <div className="flex">
          <dt className="w-24 text-sm font-medium text-gray-500">Name:</dt>
          <dd className="flex-1 text-sm text-gray-900 break-all">{displayData.name}</dd>
        </div>
        <div className="flex">
          <dt className="w-24 text-sm font-medium text-gray-500">Path:</dt>
          <dd className="flex-1 text-sm text-gray-900 break-all font-mono text-xs">{displayData.path}</dd>
        </div>
        <div className="flex">
          <dt className="w-24 text-sm font-medium text-gray-500">Type:</dt>
          <dd className="flex-1 text-sm text-gray-900">{displayData.type}</dd>
        </div>
        {displayData.size !== undefined && (
          <div className="flex">
            <dt className="w-24 text-sm font-medium text-gray-500">Size:</dt>
            <dd className="flex-1 text-sm text-gray-900">{formatBytes(displayData.size)}</dd>
          </div>
        )}
        <div className="flex">
          <dt className="w-24 text-sm font-medium text-gray-500">Created:</dt>
          <dd className="flex-1 text-sm text-gray-900">{formatDate(displayData.createdAt)}</dd>
        </div>
        <div className="flex">
          <dt className="w-24 text-sm font-medium text-gray-500">Modified:</dt>
          <dd className="flex-1 text-sm text-gray-900">{formatDate(displayData.modifiedAt)}</dd>
        </div>
        {displayData.storageType && (
          <div className="flex">
            <dt className="w-24 text-sm font-medium text-gray-500">Storage:</dt>
            <dd className="flex-1 text-sm text-gray-900 capitalize">{displayData.storageType.replace('_', ' ')}</dd>
          </div>
        )}
      </dl>

      {/* Custom Metadata Section */}
      {showCustomMetadata && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Custom Metadata</h3>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoaderIcon size={24} className="text-gray-400" />
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-3 border">
              <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap overflow-auto max-h-48">
                {formatJSON(displayData.fileData)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FileInfoPanel;
