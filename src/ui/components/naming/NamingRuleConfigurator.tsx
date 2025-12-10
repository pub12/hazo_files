/**
 * NamingRuleConfigurator Component
 * Main drop-in component for configuring file/folder naming rules
 *
 * Layout:
 * ┌─────────────────────────────────────────────────────────────┐
 * │  VariableList (Top Panel)                                   │
 * │  - Category tabs (User / Dates / File / Counter)            │
 * │  - Draggable variable chips                                 │
 * ├─────────────────────────────────────────────────────────────┤
 * │  PatternBuilder (Middle Panel)                              │
 * │  - File Pattern section                                     │
 * │  - Folder Pattern section                                   │
 * │  - Separator quick-add buttons                              │
 * ├─────────────────────────────────────────────────────────────┤
 * │  PatternPreview (Bottom Panel)                              │
 * │  - Live preview of generated names                          │
 * ├─────────────────────────────────────────────────────────────┤
 * │  Action Bar                                                 │
 * │  - Undo/Redo buttons                                        │
 * │  - Import/Export buttons                                    │
 * └─────────────────────────────────────────────────────────────┘
 */

import { useCallback, useRef, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import type { NamingVariable, NamingRuleConfiguratorProps } from '../../../types/naming';
import { useNamingRule } from '../../hooks/useNamingRule';
import { VariableList } from './VariableList';
import { PatternBuilder } from './PatternBuilder';
import { PatternPreview } from './PatternPreview';
import { DraggableVariable } from './DraggableVariable';
import { createVariableSegment, validateNamingRuleSchema } from '../../../common/naming-utils';

export function NamingRuleConfigurator({
  variables,
  initialSchema,
  onChange,
  onExport,
  onImport,
  className = '',
  customDateFormats,
  readOnly = false,
  sampleFileName = 'document.pdf',
}: NamingRuleConfiguratorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeVariable, setActiveVariable] = useState<NamingVariable | null>(null);

  // Configure DnD sensors with activation constraint to prevent accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Use the naming rule hook for state management
  const {
    filePattern,
    folderPattern,
    canUndo,
    canRedo,
    isDirty,
    addToFilePattern,
    removeFromFilePattern,
    updateFilePatternSegment,
    reorderFilePattern,
    clearFilePattern,
    addToFolderPattern,
    removeFromFolderPattern,
    updateFolderPatternSegment,
    reorderFolderPattern,
    clearFolderPattern,
    undo,
    redo,
    getSchema,
    loadSchema,
  } = useNamingRule({
    initialSchema,
    onChange,
  });

  // Handle variable click (add to most recently focused pattern, default to file)
  const handleVariableClick = useCallback(
    (variable: NamingVariable) => {
      addToFilePattern(createVariableSegment(variable.variable_name));
    },
    [addToFilePattern]
  );

  // Handle drag start - track which variable is being dragged
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    if (String(active.id).startsWith('draggable-')) {
      const data = active.data.current as { type: string; variable: NamingVariable } | undefined;
      if (data?.type === 'variable' && data.variable) {
        setActiveVariable(data.variable);
      }
    }
  }, []);

  // Handle drag end for top-level DndContext
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveVariable(null);

      if (!over) return;

      const activeId = String(active.id);
      const overId = String(over.id);

      // Case 1: Dragging a new variable from the variable list
      if (activeId.startsWith('draggable-')) {
        const data = active.data.current as { type: string; variable: NamingVariable } | undefined;
        if (data?.type === 'variable' && data.variable) {
          const segment = createVariableSegment(data.variable.variable_name);

          // Determine which pattern to add to based on drop target
          if (overId === 'file-pattern-drop') {
            addToFilePattern(segment);
          } else if (overId === 'folder-pattern-drop') {
            addToFolderPattern(segment);
          } else {
            // Check if dropped on a segment in file or folder pattern
            const fileIndex = filePattern.findIndex((seg) => seg.id === overId);
            const folderIndex = folderPattern.findIndex((seg) => seg.id === overId);

            if (fileIndex >= 0) {
              addToFilePattern(segment, fileIndex + 1);
            } else if (folderIndex >= 0) {
              addToFolderPattern(segment, folderIndex + 1);
            }
          }
        }
        return;
      }

      // Case 2: Reordering segments within a pattern
      if (activeId !== overId) {
        // Check if it's a segment in file pattern
        const activeFileIndex = filePattern.findIndex((seg) => seg.id === activeId);
        const overFileIndex = filePattern.findIndex((seg) => seg.id === overId);

        if (activeFileIndex >= 0 && overFileIndex >= 0) {
          reorderFilePattern(activeFileIndex, overFileIndex);
          return;
        }

        // Check if it's a segment in folder pattern
        const activeFolderIndex = folderPattern.findIndex((seg) => seg.id === activeId);
        const overFolderIndex = folderPattern.findIndex((seg) => seg.id === overId);

        if (activeFolderIndex >= 0 && overFolderIndex >= 0) {
          reorderFolderPattern(activeFolderIndex, overFolderIndex);
          return;
        }
      }
    },
    [filePattern, folderPattern, addToFilePattern, addToFolderPattern, reorderFilePattern, reorderFolderPattern]
  );

  // Handle export
  const handleExport = useCallback(() => {
    const schema = getSchema();
    schema.metadata = {
      ...schema.metadata,
      updatedAt: new Date().toISOString(),
    };

    if (onExport) {
      onExport(schema);
    } else {
      // Default export: download as JSON file
      const blob = new Blob([JSON.stringify(schema, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'naming-rule.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [getSchema, onExport]);

  // Handle import
  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const schema = JSON.parse(text) as unknown;

        if (validateNamingRuleSchema(schema)) {
          loadSchema(schema);
          onImport?.(schema);
        } else {
          console.error('Invalid naming rule schema');
          alert('Invalid naming rule schema. Please check the file format.');
        }
      } catch (err) {
        console.error('Failed to parse JSON:', err);
        alert('Failed to parse JSON file. Please ensure it is valid JSON.');
      }

      // Reset input
      e.target.value = '';
    },
    [loadSchema, onImport]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        className={`flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-full ${className}`}
      >
        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Top Panel: Variable List */}
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">
              Available Variables
            </h3>
            <VariableList
              userVariables={variables}
              customDateFormats={customDateFormats}
              onVariableClick={handleVariableClick}
              disabled={readOnly}
            />
          </div>

          {/* Middle Panel: Pattern Builders */}
          <div className="p-4 space-y-6">
            <PatternBuilder
              pattern={filePattern}
              label="File Name Pattern"
              droppableId="file-pattern-drop"
              onPatternChange={() => {}}
              onAddSegment={addToFilePattern}
              onRemoveSegment={removeFromFilePattern}
              onUpdateSegment={updateFilePatternSegment}
              onReorderSegments={reorderFilePattern}
              onClear={clearFilePattern}
              readOnly={readOnly}
              placeholder="Drop variables here or click to add..."
            />

            <PatternBuilder
              pattern={folderPattern}
              label="Folder Name Pattern"
              droppableId="folder-pattern-drop"
              onPatternChange={() => {}}
              onAddSegment={addToFolderPattern}
              onRemoveSegment={removeFromFolderPattern}
              onUpdateSegment={updateFolderPatternSegment}
              onReorderSegments={reorderFolderPattern}
              onClear={clearFolderPattern}
              readOnly={readOnly}
              placeholder="Drop variables here for folder structure..."
            />
          </div>

          {/* Bottom Panel: Preview */}
          <div className="p-4 border-t border-gray-200">
            <PatternPreview
              filePattern={filePattern}
              folderPattern={folderPattern}
              userVariables={variables}
              sampleFileName={sampleFileName}
            />
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center gap-2">
            {/* Undo/Redo */}
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo || readOnly}
              className={`
                p-2 rounded hover:bg-gray-200 transition-colors
                ${canUndo && !readOnly ? 'text-gray-600' : 'text-gray-300 cursor-not-allowed'}
              `}
              title="Undo (Ctrl+Z)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 7v6h6" />
                <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
              </svg>
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo || readOnly}
              className={`
                p-2 rounded hover:bg-gray-200 transition-colors
                ${canRedo && !readOnly ? 'text-gray-600' : 'text-gray-300 cursor-not-allowed'}
              `}
              title="Redo (Ctrl+Y)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 7v6h-6" />
                <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
              </svg>
            </button>

            {/* Dirty indicator */}
            {isDirty && (
              <span className="text-xs text-amber-600 ml-2">
                * Unsaved changes
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Import */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={handleImportClick}
              disabled={readOnly}
              className={`
                px-3 py-1.5 text-sm rounded border transition-colors
                ${
                  readOnly
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              Import
            </button>

            {/* Export */}
            <button
              type="button"
              onClick={handleExport}
              className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Drag overlay for visual feedback */}
      <DragOverlay>
        {activeVariable ? (
          <DraggableVariable
            variable={activeVariable}
            className="shadow-xl opacity-90"
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export default NamingRuleConfigurator;
