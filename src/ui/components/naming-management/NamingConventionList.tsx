/**
 * Naming Convention List Component
 * Displays a list of naming conventions with CRUD actions, grouped by type
 */

import React, { useState, useMemo } from 'react';
import type { ParsedNamingConvention } from '../../../types/naming-convention';

export interface NamingConventionListProps {
  /** List of naming conventions to display */
  conventions: ParsedNamingConvention[];
  /** Currently selected convention ID */
  selectedId?: string | null;
  /** Callback when a convention is selected */
  onSelect?: (convention: ParsedNamingConvention) => void;
  /** Callback when create button is clicked */
  onCreate?: () => void;
  /** Callback when delete is requested */
  onDelete?: (id: string) => void;
  /** Callback when duplicate is requested */
  onDuplicate?: (id: string) => void;
  /** Whether the list is loading */
  isLoading?: boolean;
  /** Additional CSS class name */
  className?: string;
  /** Whether to show scope information */
  showScope?: boolean;
}

/**
 * Naming Convention List Component
 *
 * Displays a sidebar-style list of naming conventions with:
 * - Title and type badge
 * - Selection highlighting
 * - Create, delete, and duplicate actions
 *
 * @example
 * ```tsx
 * <NamingConventionList
 *   conventions={conventions}
 *   selectedId={selectedId}
 *   onSelect={(conv) => setSelectedId(conv.id)}
 *   onCreate={() => setShowCreateDialog(true)}
 *   onDelete={(id) => handleDelete(id)}
 * />
 * ```
 */
export function NamingConventionList({
  conventions,
  selectedId,
  onSelect,
  onCreate,
  onDelete,
  onDuplicate,
  isLoading = false,
  className = '',
  showScope = false,
}: NamingConventionListProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Group conventions by type
  const { fileConventions, folderConventions } = useMemo(() => {
    const files: ParsedNamingConvention[] = [];
    const folders: ParsedNamingConvention[] = [];

    conventions.forEach((conv) => {
      if (conv.naming_type === 'folder') {
        folders.push(conv);
      } else {
        // 'file' and 'both' go to files section
        files.push(conv);
      }
    });

    return { fileConventions: files, folderConventions: folders };
  }, [conventions]);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirmDeleteId === id) {
      onDelete?.(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
    }
  };

  const handleDuplicate = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDuplicate?.(id);
  };

  const renderConventionItem = (convention: ParsedNamingConvention) => (
    <li
      key={convention.id}
      onClick={() => onSelect?.(convention)}
      className={`relative p-3 cursor-pointer transition-colors ${
        selectedId === convention.id
          ? 'bg-blue-50 border-l-2 border-blue-500'
          : 'hover:bg-gray-50 border-l-2 border-transparent'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 truncate">
            {convention.naming_title}
          </p>
          {showScope && (
            <p className="text-xs text-gray-500 mt-0.5">
              {convention.scope_id ? `Scope: ${convention.scope_id.slice(0, 8)}...` : 'Global'}
            </p>
          )}
          {convention.variables.length > 0 && (
            <p className="mt-1 text-xs text-gray-500">
              {convention.variables.length} variable{convention.variables.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 ml-2">
          {onDuplicate && (
            <button
              onClick={(e) => handleDuplicate(e, convention.id)}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
              title="Duplicate"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => handleDelete(e, convention.id)}
              className={`p-1.5 rounded ${
                confirmDeleteId === convention.id
                  ? 'text-red-600 bg-red-50'
                  : 'text-gray-400 hover:text-red-600'
              }`}
              title={confirmDeleteId === convention.id ? 'Click again to confirm' : 'Delete'}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </li>
  );

  return (
    <div className={`flex flex-col h-full bg-white border-r border-gray-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Naming Conventions</h2>
        {onCreate && (
          <button
            onClick={onCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New
          </button>
        )}
      </div>

      {/* List with sections */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : conventions.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <p className="text-sm">No naming conventions yet.</p>
            {onCreate && (
              <button
                onClick={onCreate}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700"
              >
                Create your first one
              </button>
            )}
          </div>
        ) : (
          <div>
            {/* File Naming Section */}
            <div className="border-b border-gray-200">
              <div className="px-4 py-2 bg-gray-50">
                <div className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    File Naming
                  </span>
                  <span className="text-xs text-gray-400">({fileConventions.length})</span>
                </div>
              </div>
              {fileConventions.length > 0 ? (
                <ul className="divide-y divide-gray-100">
                  {fileConventions.map(renderConventionItem)}
                </ul>
              ) : (
                <p className="px-4 py-3 text-xs text-gray-400">No file naming conventions</p>
              )}
            </div>

            {/* Folder Naming Section */}
            <div>
              <div className="px-4 py-2 bg-gray-50">
                <div className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                    />
                  </svg>
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Folder Naming
                  </span>
                  <span className="text-xs text-gray-400">({folderConventions.length})</span>
                </div>
              </div>
              {folderConventions.length > 0 ? (
                <ul className="divide-y divide-gray-100">
                  {folderConventions.map(renderConventionItem)}
                </ul>
              ) : (
                <p className="px-4 py-3 text-xs text-gray-400">No folder naming conventions</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default NamingConventionList;
