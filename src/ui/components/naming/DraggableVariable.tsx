/**
 * DraggableVariable Component
 * A draggable chip representing a variable that can be added to patterns
 */

import { useDraggable } from '@dnd-kit/core';
import type { NamingVariable } from '../../../types/naming';

export interface DraggableVariableProps {
  /** The variable data */
  variable: NamingVariable;
  /** Click handler for alternative to drag */
  onClick?: (variable: NamingVariable) => void;
  /** Additional CSS class */
  className?: string;
  /** Whether the variable is disabled */
  disabled?: boolean;
}

/** Get background color based on category */
function getCategoryColor(category?: string): string {
  switch (category) {
    case 'date':
      return 'bg-emerald-100 hover:bg-emerald-200 border-emerald-300 text-emerald-800';
    case 'file':
      return 'bg-purple-100 hover:bg-purple-200 border-purple-300 text-purple-800';
    case 'counter':
      return 'bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-800';
    case 'user':
    default:
      return 'bg-blue-100 hover:bg-blue-200 border-blue-300 text-blue-800';
  }
}

export function DraggableVariable({
  variable,
  onClick,
  className = '',
  disabled = false,
}: DraggableVariableProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `draggable-${variable.variable_name}`,
    data: {
      type: 'variable',
      variable,
    },
    disabled,
  });

  const colorClass = getCategoryColor(variable.category);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => !disabled && onClick?.(variable)}
      className={`
        inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-sm font-medium
        cursor-grab active:cursor-grabbing select-none transition-all
        ${colorClass}
        ${isDragging ? 'opacity-50 scale-95 shadow-lg' : 'shadow-sm'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      title={`${variable.description}\nExample: ${variable.example_value}`}
    >
      <span className="text-xs opacity-60">{'{'}</span>
      <span>{variable.variable_name}</span>
      <span className="text-xs opacity-60">{'}'}</span>
    </div>
  );
}

export default DraggableVariable;
