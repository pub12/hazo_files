/**
 * MetadataDialog Component
 * Dialog showing file metadata including database file_data JSON
 */

import type { FileSystemItem, FileItem } from '../../../types';
import { XIcon, InfoIcon, LoaderIcon } from '../../icons/FileIcons';
import { formatBytes } from '../../../common/utils';

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

export interface MetadataDialogProps {
  isOpen: boolean;
  item: FileSystemItem | null;
  metadata?: FileMetadata | null;
  isLoading?: boolean;
  onClose: () => void;
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

export function MetadataDialog({
  isOpen,
  item,
  metadata,
  isLoading = false,
  onClose,
}: MetadataDialogProps) {
  // Combine item data with fetched metadata
  const displayData = {
    name: item?.name || '-',
    path: item?.path || '-',
    type: item?.isDirectory ? 'Folder' : (item as FileItem)?.mimeType || 'Unknown',
    size: item?.isDirectory ? undefined : (item as FileItem)?.size,
    createdAt: item?.createdAt,
    modifiedAt: item?.modifiedAt,
    storageType: metadata?.storage_type,
    fileData: metadata?.file_data,
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <InfoIcon size={20} className="text-blue-500" />
            <h2 className="text-lg font-medium">File Metadata</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <XIcon size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-auto flex-1">
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
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t bg-gray-50 rounded-b-lg">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default MetadataDialog;
