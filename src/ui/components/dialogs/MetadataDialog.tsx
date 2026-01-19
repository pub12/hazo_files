/**
 * MetadataDialog Component
 * Dialog showing file metadata including database file_data JSON
 * Uses FileInfoPanel for the content display.
 */

import type { FileSystemItem } from '../../../types';
import { XIcon, InfoIcon } from '../../icons/FileIcons';
import { FileInfoPanel } from '../FileInfoPanel';
import type { FileMetadata } from '../FileInfoPanel';

// Re-export FileMetadata type for backward compatibility
export type { FileMetadata } from '../FileInfoPanel';

export interface MetadataDialogProps {
  isOpen: boolean;
  item: FileSystemItem | null;
  metadata?: FileMetadata | null;
  isLoading?: boolean;
  onClose: () => void;
}

export function MetadataDialog({
  isOpen,
  item,
  metadata,
  isLoading = false,
  onClose,
}: MetadataDialogProps) {
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

        {/* Content - uses FileInfoPanel */}
        <div className="p-4 overflow-auto flex-1">
          <FileInfoPanel
            item={item}
            metadata={metadata}
            isLoading={isLoading}
            showCustomMetadata={true}
          />
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
