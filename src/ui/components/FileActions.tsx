/**
 * FileActions Component
 * Toolbar with action buttons for file operations
 */

import React, { useRef } from 'react';
import type { FileSystemItem } from '../../types';
import {
  UploadIcon,
  DownloadIcon,
  TrashIcon,
  PencilIcon,
  PlusIcon,
  RefreshIcon,
} from '../icons/FileIcons';

export interface FileActionsProps {
  selectedItem: FileSystemItem | null;
  onCreateFolder: () => void;
  onUpload: (files: FileList) => void;
  onDownload: () => void;
  onDelete: () => void;
  onRename: () => void;
  onRefresh: () => void;
  isLoading?: boolean;
  className?: string;
}

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
}

function ActionButton({ icon, label, onClick, disabled, variant = 'default' }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`
        flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors
        ${disabled
          ? 'text-gray-300 cursor-not-allowed'
          : variant === 'danger'
            ? 'text-red-600 hover:bg-red-50'
            : 'text-gray-700 hover:bg-gray-100'
        }
      `}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

export function FileActions({
  selectedItem,
  onCreateFolder,
  onUpload,
  onDownload,
  onDelete,
  onRename,
  onRefresh,
  isLoading,
  className = '',
}: FileActionsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files);
      e.target.value = ''; // Reset input
    }
  };

  const hasSelection = selectedItem !== null;
  const isFile = hasSelection && !selectedItem.isDirectory;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Create folder */}
      <ActionButton
        icon={<PlusIcon size={18} />}
        label="New Folder"
        onClick={onCreateFolder}
        disabled={isLoading}
      />

      {/* Upload */}
      <ActionButton
        icon={<UploadIcon size={18} />}
        label="Upload"
        onClick={handleUploadClick}
        disabled={isLoading}
      />

      {/* Separator */}
      <div className="w-px h-6 bg-gray-200 mx-1" />

      {/* Download (file only) */}
      <ActionButton
        icon={<DownloadIcon size={18} />}
        label="Download"
        onClick={onDownload}
        disabled={!isFile || isLoading}
      />

      {/* Rename */}
      <ActionButton
        icon={<PencilIcon size={18} />}
        label="Rename"
        onClick={onRename}
        disabled={!hasSelection || isLoading}
      />

      {/* Delete */}
      <ActionButton
        icon={<TrashIcon size={18} />}
        label="Delete"
        onClick={onDelete}
        disabled={!hasSelection || isLoading}
        variant="danger"
      />

      {/* Separator */}
      <div className="w-px h-6 bg-gray-200 mx-1" />

      {/* Refresh */}
      <ActionButton
        icon={<RefreshIcon size={18} className={isLoading ? 'animate-spin' : ''} />}
        label="Refresh"
        onClick={onRefresh}
        disabled={isLoading}
      />
    </div>
  );
}

export default FileActions;
