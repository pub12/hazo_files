/**
 * Naming Convention Manager Component
 * Main component combining list and editor for managing naming conventions
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  NamingConventionInput,
  ParsedNamingConvention,
  ListNamingConventionsOptions,
} from '../../../types/naming-convention';
import type { NamingVariable } from '../../../types/naming';
import { NamingConventionList } from './NamingConventionList';
import { NamingConventionEditor } from './NamingConventionEditor';

/**
 * API interface for naming convention operations
 */
export interface NamingConventionAPI {
  /** List all conventions */
  list: (options?: ListNamingConventionsOptions) => Promise<ParsedNamingConvention[]>;
  /** Get a single convention by ID */
  getById?: (id: string) => Promise<ParsedNamingConvention | null>;
  /** Create a new convention */
  create: (input: NamingConventionInput) => Promise<ParsedNamingConvention | null>;
  /** Update an existing convention */
  update: (id: string, input: NamingConventionInput) => Promise<ParsedNamingConvention | null>;
  /** Delete a convention */
  delete: (id: string) => Promise<boolean>;
  /** Duplicate a convention */
  duplicate?: (id: string, newTitle?: string) => Promise<ParsedNamingConvention | null>;
}

export interface NamingConventionManagerProps {
  /** API for CRUD operations */
  api: NamingConventionAPI;
  /** Available user-defined variables for all conventions */
  availableVariables?: NamingVariable[];
  /** Filter options for listing conventions */
  listOptions?: ListNamingConventionsOptions;
  /** Default scope ID for new conventions */
  defaultScopeId?: string | null;
  /** Callback when a convention is saved */
  onSave?: (convention: ParsedNamingConvention) => void;
  /** Callback when a convention is deleted */
  onDelete?: (id: string) => void;
  /** Callback when error occurs */
  onError?: (error: string) => void;
  /** Additional CSS class name */
  className?: string;
  /** Width of the list panel */
  listWidth?: number | string;
  /** Whether to show scope information */
  showScope?: boolean;
  /** Initial selected convention ID */
  initialSelectedId?: string | null;
}

/**
 * Naming Convention Manager Component
 *
 * A complete management interface with:
 * - Sidebar list of conventions
 * - Editor panel for create/edit
 * - CRUD operations
 *
 * @example
 * ```tsx
 * const api: NamingConventionAPI = {
 *   list: async () => {
 *     const res = await fetch('/api/naming-conventions');
 *     return res.json();
 *   },
 *   create: async (input) => {
 *     const res = await fetch('/api/naming-conventions', {
 *       method: 'POST',
 *       body: JSON.stringify(input)
 *     });
 *     return res.json();
 *   },
 *   update: async (id, input) => {
 *     const res = await fetch(`/api/naming-conventions/${id}`, {
 *       method: 'PUT',
 *       body: JSON.stringify(input)
 *     });
 *     return res.json();
 *   },
 *   delete: async (id) => {
 *     const res = await fetch(`/api/naming-conventions/${id}`, {
 *       method: 'DELETE'
 *     });
 *     return res.ok;
 *   }
 * };
 *
 * <NamingConventionManager
 *   api={api}
 *   availableVariables={projectVariables}
 *   onSave={(conv) => console.log('Saved:', conv)}
 * />
 * ```
 */
export function NamingConventionManager({
  api,
  availableVariables = [],
  listOptions,
  defaultScopeId = null,
  onSave,
  onDelete,
  onError,
  className = '',
  listWidth = 280,
  showScope = false,
  initialSelectedId = null,
}: NamingConventionManagerProps) {
  // State
  const [conventions, setConventions] = useState<ParsedNamingConvention[]>([]);
  const [selectedConvention, setSelectedConvention] = useState<ParsedNamingConvention | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Load conventions
  const loadConventions = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.list(listOptions);
      setConventions(data);

      // Select initial or previously selected
      if (initialSelectedId && !selectedConvention) {
        const initial = data.find((c) => c.id === initialSelectedId);
        if (initial) setSelectedConvention(initial);
      } else if (selectedConvention) {
        const updated = data.find((c) => c.id === selectedConvention.id);
        if (updated) {
          setSelectedConvention(updated);
        } else {
          setSelectedConvention(null);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load conventions';
      onError?.(message);
    } finally {
      setIsLoading(false);
    }
  }, [api, listOptions, initialSelectedId, selectedConvention, onError]);

  // Initial load
  useEffect(() => {
    loadConventions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle select
  const handleSelect = (convention: ParsedNamingConvention) => {
    setSelectedConvention(convention);
    setIsCreating(false);
  };

  // Handle create
  const handleCreate = () => {
    setSelectedConvention(null);
    setIsCreating(true);
  };

  // Handle save
  const handleSave = async (input: NamingConventionInput) => {
    try {
      setIsSaving(true);
      let result: ParsedNamingConvention | null;

      if (selectedConvention && !isCreating) {
        // Update existing
        result = await api.update(selectedConvention.id, input);
      } else {
        // Create new
        result = await api.create(input);
      }

      if (result) {
        await loadConventions();
        setSelectedConvention(result);
        setIsCreating(false);
        onSave?.(result);
      } else {
        onError?.('Failed to save convention');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save convention';
      onError?.(message);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      const success = await api.delete(id);
      if (success) {
        if (selectedConvention?.id === id) {
          setSelectedConvention(null);
        }
        await loadConventions();
        onDelete?.(id);
      } else {
        onError?.('Failed to delete convention');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete convention';
      onError?.(message);
    }
  };

  // Handle duplicate
  const handleDuplicate = async (id: string) => {
    if (!api.duplicate) return;

    try {
      const result = await api.duplicate(id);
      if (result) {
        await loadConventions();
        setSelectedConvention(result);
        setIsCreating(false);
      } else {
        onError?.('Failed to duplicate convention');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to duplicate convention';
      onError?.(message);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (isCreating) {
      setIsCreating(false);
      setSelectedConvention(conventions[0] || null);
    }
  };

  const listStyle = typeof listWidth === 'number' ? { width: `${listWidth}px` } : { width: listWidth };

  return (
    <div className={`flex h-full bg-gray-50 ${className}`}>
      {/* List Panel */}
      <div style={listStyle} className="flex-shrink-0">
        <NamingConventionList
          conventions={conventions}
          selectedId={isCreating ? null : selectedConvention?.id}
          onSelect={handleSelect}
          onCreate={handleCreate}
          onDelete={handleDelete}
          onDuplicate={api.duplicate ? handleDuplicate : undefined}
          isLoading={isLoading}
          showScope={showScope}
        />
      </div>

      {/* Editor Panel */}
      <div className="flex-1 min-w-0">
        {isCreating || selectedConvention ? (
          <NamingConventionEditor
            convention={isCreating ? null : selectedConvention}
            availableVariables={availableVariables}
            onSave={handleSave}
            onCancel={handleCancel}
            isSaving={isSaving}
            defaultScopeId={defaultScopeId}
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-white">
            <div className="text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-12 h-12 mx-auto text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="mt-4 text-gray-500">
                {conventions.length === 0
                  ? 'No naming conventions yet'
                  : 'Select a convention to edit'}
              </p>
              <button
                onClick={handleCreate}
                className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Create new convention
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default NamingConventionManager;
