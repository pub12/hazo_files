/**
 * DeleteConfirmDialog Component
 * Confirmation dialog for deleting files or folders
 */

import { useState, useCallback } from 'react';
import type { FileSystemItem } from '../../../types';
import { XIcon, TrashIcon, LoaderIcon } from '../../icons/FileIcons';

export interface DeleteConfirmDialogProps {
  isOpen: boolean;
  item: FileSystemItem | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteConfirmDialog({
  isOpen,
  item,
  onClose,
  onConfirm,
}: DeleteConfirmDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [onConfirm, onClose]);

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <TrashIcon size={20} className="text-red-500" />
            <h2 className="text-lg font-medium">
              Delete {item.isDirectory ? 'Folder' : 'File'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <XIcon size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-gray-700">
            Are you sure you want to delete{' '}
            <span className="font-medium">{item.name}</span>?
          </p>

          {item.isDirectory && (
            <p className="mt-2 text-sm text-amber-600 bg-amber-50 p-3 rounded">
              Warning: This folder and all its contents will be permanently deleted.
            </p>
          )}

          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t bg-gray-50 rounded-b-lg">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={isLoading}
          >
            {isLoading && <LoaderIcon size={16} />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirmDialog;
