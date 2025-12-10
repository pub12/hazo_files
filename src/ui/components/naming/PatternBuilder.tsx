/**
 * PatternBuilder Component
 * Drop zone for building file/folder naming patterns
 * Supports drag-and-drop reordering and variable dropping
 *
 * NOTE: This component relies on a parent DndContext for drag-and-drop.
 * Do NOT wrap content in a nested DndContext here.
 */

import { useCallback } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { PatternSegment } from '../../../types/naming';
import { PatternSegmentItem } from './PatternSegmentItem';
import { SeparatorPicker } from './SeparatorPicker';
import { createLiteralSegment } from '../../../common/naming-utils';

export interface PatternBuilderProps {
  /** Current pattern segments */
  pattern: PatternSegment[];
  /** Label for the pattern (e.g., "File Pattern", "Folder Pattern") */
  label: string;
  /** Unique ID for the droppable zone */
  droppableId: string;
  /** Callback when pattern changes */
  onPatternChange: (pattern: PatternSegment[]) => void;
  /** Callback to add a segment */
  onAddSegment: (segment: PatternSegment, index?: number) => void;
  /** Callback to remove a segment */
  onRemoveSegment: (id: string) => void;
  /** Callback to update a segment */
  onUpdateSegment: (id: string, value: string) => void;
  /** Callback to reorder segments */
  onReorderSegments: (fromIndex: number, toIndex: number) => void;
  /** Callback to clear all segments */
  onClear: () => void;
  /** Whether editing is disabled */
  readOnly?: boolean;
  /** Placeholder text when empty */
  placeholder?: string;
  /** Additional CSS class */
  className?: string;
}

/** Drop zone component */
function DroppableZone({
  id,
  children,
  isEmpty,
  placeholder,
}: {
  id: string;
  children: React.ReactNode;
  isEmpty: boolean;
  placeholder: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`
        min-h-[48px] p-2 rounded-lg border-2 border-dashed transition-colors
        ${
          isOver
            ? 'border-blue-400 bg-blue-50'
            : isEmpty
            ? 'border-gray-300 bg-gray-50'
            : 'border-gray-200 bg-white'
        }
      `}
    >
      {isEmpty ? (
        <div className="flex items-center justify-center h-8 text-gray-400 text-sm">
          {placeholder}
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5 items-center">{children}</div>
      )}
    </div>
  );
}

export function PatternBuilder({
  pattern,
  label,
  droppableId,
  onAddSegment,
  onRemoveSegment,
  onUpdateSegment,
  onClear,
  readOnly = false,
  placeholder = 'Drop variables here or type text...',
  className = '',
}: PatternBuilderProps) {
  // Handle adding separator
  const handleAddSeparator = useCallback(
    (separator: string) => {
      onAddSegment(createLiteralSegment(separator));
    },
    [onAddSegment]
  );

  // Handle adding text
  const handleAddText = useCallback(() => {
    onAddSegment(createLiteralSegment('text'));
  }, [onAddSegment]);

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {!readOnly && pattern.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-red-500 hover:text-red-700 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Pattern Drop Zone - uses parent DndContext */}
      <SortableContext
        items={pattern.map((seg) => seg.id)}
        strategy={horizontalListSortingStrategy}
      >
        <DroppableZone
          id={droppableId}
          isEmpty={pattern.length === 0}
          placeholder={placeholder}
        >
          {pattern.map((segment) => (
            <PatternSegmentItem
              key={segment.id}
              segment={segment}
              onUpdate={onUpdateSegment}
              onDelete={onRemoveSegment}
              readOnly={readOnly}
            />
          ))}
        </DroppableZone>
      </SortableContext>

      {/* Quick Actions */}
      {!readOnly && (
        <div className="flex items-center justify-between">
          <SeparatorPicker onSelect={handleAddSeparator} disabled={readOnly} />
          <button
            type="button"
            onClick={handleAddText}
            className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
          >
            + Add text
          </button>
        </div>
      )}
    </div>
  );
}

export default PatternBuilder;
