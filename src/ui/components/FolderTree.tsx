/**
 * FolderTree Component
 * Displays a hierarchical tree view of folders
 */

import React, { useCallback } from 'react';
import type { TreeNode } from '../../types';
import {
  FolderIcon,
  FolderOpenIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  LoaderIcon,
} from '../icons/FileIcons';

export interface FolderTreeProps {
  tree: TreeNode[];
  currentPath: string;
  onSelect: (path: string) => void;
  onExpand: (path: string) => void;
  onToggle: (path: string) => void;
  className?: string;
}

interface TreeNodeItemProps {
  node: TreeNode;
  level: number;
  currentPath: string;
  onSelect: (path: string) => void;
  onExpand: (path: string) => void;
  onToggle: (path: string) => void;
}

function TreeNodeItem({
  node,
  level,
  currentPath,
  onSelect,
  onExpand,
  onToggle,
}: TreeNodeItemProps) {
  const isSelected = currentPath === node.path;
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = node.isExpanded;
  const isLoading = node.isLoading;

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isExpanded) {
      onToggle(node.path);
    } else {
      onExpand(node.path);
    }
  }, [isExpanded, node.path, onExpand, onToggle]);

  const handleSelect = useCallback(() => {
    onSelect(node.path);
  }, [node.path, onSelect]);

  return (
    <div>
      <div
        className={`
          flex items-center py-1 px-2 cursor-pointer rounded
          hover:bg-gray-100 transition-colors
          ${isSelected ? 'bg-blue-100 text-blue-700' : 'text-gray-700'}
        `}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleSelect}
        onDoubleClick={handleToggle}
      >
        {/* Expand/Collapse button */}
        <button
          onClick={handleToggle}
          className="p-0.5 mr-1 hover:bg-gray-200 rounded flex-shrink-0"
        >
          {isLoading ? (
            <LoaderIcon size={14} />
          ) : hasChildren || !isExpanded ? (
            isExpanded ? (
              <ChevronDownIcon size={14} />
            ) : (
              <ChevronRightIcon size={14} />
            )
          ) : (
            <span className="w-3.5" />
          )}
        </button>

        {/* Folder icon */}
        {isExpanded ? (
          <FolderOpenIcon size={16} className="mr-2 text-yellow-500 flex-shrink-0" />
        ) : (
          <FolderIcon size={16} className="mr-2 text-yellow-500 flex-shrink-0" />
        )}

        {/* Folder name */}
        <span className="truncate text-sm">{node.name}</span>
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {node.children.map(child => (
            <TreeNodeItem
              key={child.id}
              node={child}
              level={level + 1}
              currentPath={currentPath}
              onSelect={onSelect}
              onExpand={onExpand}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderTree({
  tree,
  currentPath,
  onSelect,
  onExpand,
  onToggle,
  className = '',
}: FolderTreeProps) {
  // Add root node
  const rootNode: TreeNode = {
    id: 'root',
    name: 'Root',
    path: '/',
    children: tree,
    isExpanded: true,
  };

  return (
    <div className={`overflow-auto ${className}`}>
      <TreeNodeItem
        node={rootNode}
        level={0}
        currentPath={currentPath}
        onSelect={onSelect}
        onExpand={onExpand}
        onToggle={onToggle}
      />
    </div>
  );
}

export default FolderTree;
