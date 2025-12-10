/**
 * VariableList Component
 * Displays all available variables organized by category
 * Variables can be dragged or clicked to add to patterns
 */

import { useState } from 'react';
import type { NamingVariable, VariableCategory } from '../../../types/naming';
import { DraggableVariable } from './DraggableVariable';
import {
  SYSTEM_DATE_VARIABLES,
  SYSTEM_FILE_VARIABLES,
  SYSTEM_COUNTER_VARIABLES,
} from '../../../common/naming-utils';

export interface VariableListProps {
  /** User-defined variables */
  userVariables: NamingVariable[];
  /** Custom date formats (optional, uses defaults if not provided) */
  customDateFormats?: string[];
  /** Callback when a variable is clicked */
  onVariableClick?: (variable: NamingVariable) => void;
  /** Whether interactions are disabled */
  disabled?: boolean;
  /** Additional CSS class */
  className?: string;
}

interface CategoryTab {
  id: VariableCategory;
  label: string;
  count: number;
}

export function VariableList({
  userVariables,
  customDateFormats,
  onVariableClick,
  disabled = false,
  className = '',
}: VariableListProps) {
  const [activeCategory, setActiveCategory] = useState<VariableCategory>('user');

  // Prepare variables by category
  const userVars: NamingVariable[] = userVariables.map((v) => ({
    ...v,
    category: 'user' as const,
  }));

  // Filter date variables if custom formats provided
  const dateVars: NamingVariable[] = customDateFormats
    ? SYSTEM_DATE_VARIABLES.filter((v) =>
        customDateFormats.includes(v.variable_name)
      )
    : SYSTEM_DATE_VARIABLES;

  const fileVars: NamingVariable[] = SYSTEM_FILE_VARIABLES;
  const counterVars: NamingVariable[] = SYSTEM_COUNTER_VARIABLES;

  // Build category tabs
  const allTabs: CategoryTab[] = [
    { id: 'user' as const, label: 'User', count: userVars.length },
    { id: 'date' as const, label: 'Dates', count: dateVars.length },
    { id: 'file' as const, label: 'File', count: fileVars.length },
    { id: 'counter' as const, label: 'Counter', count: counterVars.length },
  ];
  const tabs = allTabs.filter((tab) => tab.count > 0);

  // Get variables for active category
  const getVariablesForCategory = (category: VariableCategory): NamingVariable[] => {
    switch (category) {
      case 'user':
        return userVars;
      case 'date':
        return dateVars;
      case 'file':
        return fileVars;
      case 'counter':
        return counterVars;
      default:
        return [];
    }
  };

  const activeVariables = getVariablesForCategory(activeCategory);

  // If active category has no variables, switch to first available
  if (activeVariables.length === 0 && tabs.length > 0) {
    const firstTab = tabs[0];
    if (firstTab.id !== activeCategory) {
      setActiveCategory(firstTab.id);
    }
  }

  return (
    <div className={`bg-gray-50 rounded-lg border border-gray-200 ${className}`}>
      {/* Category Tabs */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveCategory(tab.id)}
            className={`
              flex-1 px-3 py-2 text-sm font-medium transition-colors
              ${
                activeCategory === tab.id
                  ? 'bg-white border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }
            `}
          >
            {tab.label}
            <span className="ml-1 text-xs text-gray-400">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Variables Grid */}
      <div className="p-3">
        {activeVariables.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {activeVariables.map((variable) => (
              <DraggableVariable
                key={variable.variable_name}
                variable={variable}
                onClick={onVariableClick}
                disabled={disabled}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">
            No variables available in this category
          </p>
        )}

        {/* Help text */}
        <p className="text-xs text-gray-400 mt-3 text-center">
          Drag variables to the pattern below, or click to add
        </p>
      </div>
    </div>
  );
}

export default VariableList;
