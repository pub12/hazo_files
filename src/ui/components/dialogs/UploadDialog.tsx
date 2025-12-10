/**
 * UploadDialog Component
 * Dialog for uploading files with drag and drop support
 */

import React, { useState, useCallback, useRef } from 'react';
import { XIcon, UploadIcon, LoaderIcon, FileIcon } from '../../icons/FileIcons';
import { formatBytes } from '../../../common/utils';

export interface UploadDialogProps {
  isOpen: boolean;
  currentPath: string;
  onClose: () => void;
  onUpload: (files: FileList) => Promise<void>;
}

export function UploadDialog({
  isOpen,
  currentPath,
  onClose,
  onUpload,
}: UploadDialogProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (files) {
      setSelectedFiles(prev => [...prev, ...Array.from(files)]);
      setError(null);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpload = useCallback(async () => {
    if (selectedFiles.length === 0) {
      setError('Please select files to upload');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Convert to FileList-like object
      const dt = new DataTransfer();
      selectedFiles.forEach(file => dt.items.add(file));
      await onUpload(dt.files);
      setSelectedFiles([]);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFiles, onUpload, onClose]);

  const handleClose = useCallback(() => {
    setSelectedFiles([]);
    setError(null);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <UploadIcon size={20} className="text-blue-500" />
            <h2 className="text-lg font-medium">Upload Files</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <XIcon size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="text-sm text-gray-500 mb-4">
            Uploading to: <span className="font-medium">{currentPath}</span>
          </div>

          {/* Drop zone */}
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />
            <UploadIcon size={40} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">
              Drag and drop files here, or{' '}
              <span className="text-blue-500 cursor-pointer">browse</span>
            </p>
          </div>

          {/* Selected files */}
          {selectedFiles.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {selectedFiles.length} file(s) selected
                </span>
                <span className="text-sm text-gray-500">
                  Total: {formatBytes(totalSize)}
                </span>
              </div>
              <div className="max-h-40 overflow-auto space-y-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileIcon size={16} className="text-gray-400 flex-shrink-0" />
                      <span className="text-sm truncate">{file.name}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {formatBytes(file.size)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveFile(index)}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <XIcon size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t bg-gray-50 rounded-b-lg">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUpload}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={isLoading || selectedFiles.length === 0}
          >
            {isLoading && <LoaderIcon size={16} />}
            Upload {selectedFiles.length > 0 && `(${selectedFiles.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default UploadDialog;
