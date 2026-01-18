/**
 * DragPreview Component
 * Visual preview shown during drag-and-drop file operations
 */

import type { FileSystemItem, FileItem } from '../../types';
import { getFileIcon } from '../icons/FileIcons';

export interface DragPreviewProps {
  item: FileSystemItem;
  className?: string;
}

export function DragPreview({ item, className = '' }: DragPreviewProps) {
  const Icon = getFileIcon(
    item.isDirectory ? 'folder' : (item as FileItem).mimeType,
    item.isDirectory
  );

  return (
    <div
      className={`
        flex items-center gap-2 px-3 py-2
        bg-white border border-gray-200 rounded-lg
        shadow-lg opacity-90
        ${className}
      `}
    >
      <Icon
        size={20}
        className={item.isDirectory ? 'text-yellow-500' : 'text-gray-500'}
      />
      <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">
        {item.name}
      </span>
    </div>
  );
}

export default DragPreview;
