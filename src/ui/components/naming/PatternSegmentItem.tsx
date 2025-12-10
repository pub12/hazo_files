/**
 * PatternSegmentItem Component
 * Represents a single segment (variable or literal) in a pattern
 * Can be edited, deleted, and reordered via drag-and-drop
 */

import { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { PatternSegment } from '../../../types/naming';

export interface PatternSegmentItemProps {
  /** The segment data */
  segment: PatternSegment;
  /** Callback when segment is updated */
  onUpdate?: (id: string, value: string) => void;
  /** Callback when segment is deleted */
  onDelete?: (id: string) => void;
  /** Whether editing is disabled */
  readOnly?: boolean;
  /** Additional CSS class */
  className?: string;
}

/** Get styling based on segment type */
function getSegmentStyle(type: 'variable' | 'literal'): string {
  if (type === 'variable') {
    return 'bg-blue-100 border-blue-300 text-blue-800';
  }
  return 'bg-gray-100 border-gray-300 text-gray-700';
}

export function PatternSegmentItem({
  segment,
  onUpdate,
  onDelete,
  readOnly = false,
  className = '',
}: PatternSegmentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(segment.value);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: segment.id,
    disabled: readOnly,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Handle edit submission
  const handleSubmit = () => {
    if (segment.type === 'literal' && editValue !== segment.value) {
      onUpdate?.(segment.id, editValue);
    }
    setIsEditing(false);
  };

  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      setEditValue(segment.value);
      setIsEditing(false);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (!isEditing) {
        e.preventDefault();
        onDelete?.(segment.id);
      }
    }
  };

  const segmentStyle = getSegmentStyle(segment.type);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        inline-flex items-center gap-1 rounded border text-sm
        ${segmentStyle}
        ${isDragging ? 'opacity-50 shadow-lg z-50' : 'shadow-sm'}
        ${readOnly ? '' : 'cursor-grab active:cursor-grabbing'}
        ${className}
      `}
      {...attributes}
      {...listeners}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {segment.type === 'variable' ? (
        // Variable segment - not editable, just display
        <div className="flex items-center px-2 py-1">
          <span className="text-xs opacity-60">{'{'}</span>
          <span className="font-medium">{segment.value}</span>
          <span className="text-xs opacity-60">{'}'}</span>
        </div>
      ) : isEditing && !readOnly ? (
        // Literal segment in edit mode
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSubmit}
          onKeyDown={handleKeyDown}
          className="px-2 py-1 bg-transparent border-none outline-none min-w-[40px] text-sm"
          style={{ width: `${Math.max(40, editValue.length * 8)}px` }}
        />
      ) : (
        // Literal segment in display mode
        <div
          className="px-2 py-1 cursor-text"
          onDoubleClick={() => !readOnly && setIsEditing(true)}
        >
          {segment.value || <span className="opacity-50 italic">empty</span>}
        </div>
      )}

      {/* Delete button */}
      {!readOnly && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(segment.id);
          }}
          className="p-1 hover:bg-black/10 rounded transition-colors mr-1"
          title="Remove segment"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default PatternSegmentItem;
