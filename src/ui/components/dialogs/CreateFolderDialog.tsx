/**
 * CreateFolderDialog Component
 * Dialog for creating a new folder
 */

import React, { useState, useCallback, useEffect } from 'react';
import { XIcon, FolderIcon, LoaderIcon } from '../../icons/FileIcons';

export interface CreateFolderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
  currentPath: string;
}

export function CreateFolderDialog({
  isOpen,
  onClose,
  onSubmit,
  currentPath,
}: CreateFolderDialogProps) {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Please enter a folder name');
      return;
    }

    // Validate folder name
    if (/[<>:"/\\|?*]/.test(name)) {
      setError('Folder name contains invalid characters');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onSubmit(name.trim());
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [name, onSubmit, onClose]);

  if (!isOpen) return null;

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
            <FolderIcon size={20} className="text-yellow-500" />
            <h2 className="text-lg font-medium">Create New Folder</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <XIcon size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div className="p-4">
            <div className="text-sm text-gray-500 mb-4">
              Creating folder in: <span className="font-medium">{currentPath}</span>
            </div>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">Folder Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter folder name"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
                disabled={isLoading}
              />
            </label>

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
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={isLoading || !name.trim()}
            >
              {isLoading && <LoaderIcon size={16} />}
              Create Folder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateFolderDialog;
