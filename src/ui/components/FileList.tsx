/**
 * FileList Component
 * Displays a grid/list of files and folders
 */

import React, { useCallback } from 'react';
import type { FileSystemItem, FileItem } from '../../types';
import { formatBytes } from '../../common/utils';
import { getFileIcon, LoaderIcon } from '../icons/FileIcons';

export interface FileListProps {
  files: FileSystemItem[];
  selectedItem: FileSystemItem | null;
  isLoading: boolean;
  onSelect: (item: FileSystemItem) => void;
  onOpen: (item: FileSystemItem) => void;
  onContextMenu?: (item: FileSystemItem, event: React.MouseEvent) => void;
  viewMode?: 'grid' | 'list';
  className?: string;
}

interface FileItemCardProps {
  item: FileSystemItem;
  isSelected: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onContextMenu?: (event: React.MouseEvent) => void;
  viewMode: 'grid' | 'list';
}

function FileItemCard({
  item,
  isSelected,
  onSelect,
  onOpen,
  onContextMenu,
  viewMode,
}: FileItemCardProps) {
  const Icon = getFileIcon(
    item.isDirectory ? 'folder' : (item as FileItem).mimeType,
    item.isDirectory
  );

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
  }, [onSelect]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onOpen();
  }, [onOpen]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onSelect();
    onContextMenu?.(e);
  }, [onSelect, onContextMenu]);

  if (viewMode === 'grid') {
    return (
      <div
        className={`
          p-3 rounded-lg cursor-pointer transition-all
          hover:bg-gray-100
          ${isSelected ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-white'}
        `}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        <div className="flex flex-col items-center text-center">
          <Icon
            size={40}
            className={item.isDirectory ? 'text-yellow-500' : 'text-gray-500'}
          />
          <span className="mt-2 text-sm truncate w-full" title={item.name}>
            {item.name}
          </span>
          {!item.isDirectory && (
            <span className="text-xs text-gray-400 mt-1">
              {formatBytes((item as FileItem).size)}
            </span>
          )}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div
      className={`
        flex items-center p-2 rounded cursor-pointer transition-all
        hover:bg-gray-100
        ${isSelected ? 'bg-blue-100' : ''}
      `}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
    >
      <Icon
        size={20}
        className={`flex-shrink-0 ${item.isDirectory ? 'text-yellow-500' : 'text-gray-500'}`}
      />
      <span className="ml-3 flex-1 truncate text-sm" title={item.name}>
        {item.name}
      </span>
      {!item.isDirectory && (
        <>
          <span className="text-xs text-gray-400 ml-4">
            {formatBytes((item as FileItem).size)}
          </span>
          <span className="text-xs text-gray-400 ml-4 w-32 truncate">
            {new Date(item.modifiedAt).toLocaleDateString()}
          </span>
        </>
      )}
    </div>
  );
}

export function FileList({
  files,
  selectedItem,
  isLoading,
  onSelect,
  onOpen,
  onContextMenu,
  viewMode = 'grid',
  className = '',
}: FileListProps) {
  const handleBackgroundClick = useCallback(() => {
    onSelect(null as unknown as FileSystemItem);
  }, [onSelect]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <LoaderIcon size={32} className="text-gray-400" />
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center h-full text-gray-400 ${className}`}
        onClick={handleBackgroundClick}
      >
        <svg
          className="w-16 h-16 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
        <p>This folder is empty</p>
      </div>
    );
  }

  if (viewMode === 'grid') {
    return (
      <div
        className={`grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2 p-2 ${className}`}
        onClick={handleBackgroundClick}
      >
        {files.map(file => (
          <FileItemCard
            key={file.id}
            item={file}
            isSelected={selectedItem?.id === file.id}
            onSelect={() => onSelect(file)}
            onOpen={() => onOpen(file)}
            onContextMenu={onContextMenu ? (e) => onContextMenu(file, e) : undefined}
            viewMode="grid"
          />
        ))}
      </div>
    );
  }

  // List view
  return (
    <div
      className={`flex flex-col ${className}`}
      onClick={handleBackgroundClick}
    >
      {/* Header */}
      <div className="flex items-center p-2 border-b text-xs text-gray-500 font-medium">
        <span className="flex-1 ml-8">Name</span>
        <span className="w-20 ml-4">Size</span>
        <span className="w-32 ml-4">Modified</span>
      </div>

      {/* Files */}
      <div className="flex-1 overflow-auto">
        {files.map(file => (
          <FileItemCard
            key={file.id}
            item={file}
            isSelected={selectedItem?.id === file.id}
            onSelect={() => onSelect(file)}
            onOpen={() => onOpen(file)}
            onContextMenu={onContextMenu ? (e) => onContextMenu(file, e) : undefined}
            viewMode="list"
          />
        ))}
      </div>
    </div>
  );
}

export default FileList;
