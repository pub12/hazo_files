/**
 * FileList Component
 * Displays a grid/list of files and folders
 */

import React, { useCallback } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
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
  draggedItem?: FileSystemItem | null;
  dropTargetPath?: string | null;
  className?: string;
}

interface FileItemCardProps {
  item: FileSystemItem;
  isSelected: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onContextMenu?: (event: React.MouseEvent) => void;
  viewMode: 'grid' | 'list';
  isBeingDragged?: boolean;
  isDropTarget?: boolean;
}

function FileItemCard({
  item,
  isSelected,
  onSelect,
  onOpen,
  onContextMenu,
  viewMode,
  isBeingDragged,
  isDropTarget,
}: FileItemCardProps) {
  const Icon = getFileIcon(
    item.isDirectory ? 'folder' : (item as FileItem).mimeType,
    item.isDirectory
  );

  // Draggable hook - all items can be dragged
  const {
    attributes: dragAttributes,
    listeners: dragListeners,
    setNodeRef: setDragRef,
    isDragging: isItemDragging,
  } = useDraggable({
    id: `file-item-${item.path}`,
    data: { item },
  });

  // Droppable hook - only folders can receive drops
  const {
    setNodeRef: setDropRef,
    isOver,
  } = useDroppable({
    id: `folder-drop-list-${item.path}`,
    disabled: !item.isDirectory,
  });

  // Combine refs for folders (both draggable and droppable)
  const combinedRef = useCallback(
    (node: HTMLDivElement | null) => {
      setDragRef(node);
      if (item.isDirectory) {
        setDropRef(node);
      }
    },
    [setDragRef, setDropRef, item.isDirectory]
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

  // Visual states
  const isThisItemBeingDragged = isItemDragging || isBeingDragged;
  const isValidDropTarget = item.isDirectory && isDropTarget;
  const isHovered = isOver && item.isDirectory;

  if (viewMode === 'grid') {
    return (
      <div
        ref={combinedRef}
        {...dragAttributes}
        {...dragListeners}
        className={`
          p-3 rounded-lg cursor-pointer transition-all
          hover:bg-gray-100
          ${isSelected ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-white'}
          ${isThisItemBeingDragged ? 'opacity-50' : ''}
          ${isValidDropTarget ? 'ring-2 ring-green-500 bg-green-50' : ''}
          ${isHovered ? 'bg-green-100' : ''}
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
      ref={combinedRef}
      {...dragAttributes}
      {...dragListeners}
      className={`
        flex items-center p-2 rounded cursor-pointer transition-all
        hover:bg-gray-100
        ${isSelected ? 'bg-blue-100' : ''}
        ${isThisItemBeingDragged ? 'opacity-50' : ''}
        ${isValidDropTarget ? 'ring-2 ring-green-500 bg-green-50' : ''}
        ${isHovered ? 'bg-green-100' : ''}
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
  draggedItem = null,
  dropTargetPath = null,
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
            isBeingDragged={draggedItem?.path === file.path}
            isDropTarget={dropTargetPath === file.path}
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
            isBeingDragged={draggedItem?.path === file.path}
            isDropTarget={dropTargetPath === file.path}
          />
        ))}
      </div>
    </div>
  );
}

export default FileList;
