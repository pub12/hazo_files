/**
 * Naming Convention Editor Component
 * Form for creating/editing naming conventions with embedded NamingRuleConfigurator
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  NamingConventionInput,
  NamingConventionType,
  ParsedNamingConvention,
} from '../../../types/naming-convention';
import type { NamingRuleSchema, NamingVariable } from '../../../types/naming';
import { createEmptyNamingRuleSchema, validateNamingRuleSchema } from '../../../common/naming-utils';
import { NamingRuleConfigurator } from '../naming';

/**
 * Simplified variable definition for passing variables via props.
 * Only requires the variable name and description.
 */
export interface VariableDefinition {
  /** Unique variable name (used in patterns as {variable_name}) */
  variable_name: string;
  /** Human-readable description of the variable */
  description: string;
  /** Optional example value for preview */
  example_value?: string;
}

export interface NamingConventionEditorProps {
  /** Convention to edit (null for create mode) */
  convention?: ParsedNamingConvention | null;
  /**
   * Available variables as a simple JSON array.
   * Each variable needs variable_name and description.
   * @example
   * [
   *   { variable_name: "client_id", description: "Client identifier" },
   *   { variable_name: "project_name", description: "Name of the project" }
   * ]
   */
  variableDefinitions?: VariableDefinition[];
  /** @deprecated Use variableDefinitions instead */
  availableVariables?: NamingVariable[];
  /** Callback when save is requested */
  onSave?: (input: NamingConventionInput) => void;
  /** Callback when cancel is clicked */
  onCancel?: () => void;
  /** Whether save is in progress */
  isSaving?: boolean;
  /** Additional CSS class name */
  className?: string;
  /** Read-only mode */
  readOnly?: boolean;
  /** Scope ID to use for new conventions */
  defaultScopeId?: string | null;
  /** Callback when schema is exported */
  onExport?: (schema: NamingRuleSchema) => void;
  /** Callback when schema is imported */
  onImport?: (schema: NamingRuleSchema) => void;
}

const CONVENTION_TYPES: { value: NamingConventionType; label: string; description: string }[] = [
  { value: 'file', label: 'File Naming', description: 'For naming files only' },
  { value: 'folder', label: 'Folder Naming', description: 'For naming folders only' },
];

/**
 * Naming Convention Editor Component
 *
 * Provides a form for creating or editing naming conventions with:
 * - Title input
 * - Type selector (file, folder, both)
 * - Embedded NamingRuleConfigurator for pattern building
 * - Variable management
 *
 * @example
 * ```tsx
 * <NamingConventionEditor
 *   convention={selectedConvention}
 *   availableVariables={projectVariables}
 *   onSave={(input) => handleSave(input)}
 *   onCancel={() => setEditing(false)}
 * />
 * ```
 */
export function NamingConventionEditor({
  convention,
  variableDefinitions = [],
  availableVariables = [],
  onSave,
  onCancel,
  isSaving = false,
  className = '',
  readOnly = false,
  defaultScopeId = null,
  onExport,
  onImport,
}: NamingConventionEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [title, setTitle] = useState(convention?.naming_title || '');
  const [namingType, setNamingType] = useState<NamingConventionType>(convention?.naming_type || 'file');
  const [schema, setSchema] = useState<NamingRuleSchema>(
    convention?.schema || createEmptyNamingRuleSchema()
  );
  const [variables, setVariables] = useState<NamingVariable[]>(
    convention?.variables || []
  );

  // New variable form
  const [showAddVariable, setShowAddVariable] = useState(false);
  const [newVariableName, setNewVariableName] = useState('');
  const [newVariableDescription, setNewVariableDescription] = useState('');
  const [newVariableExample, setNewVariableExample] = useState('');

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>();

  // Reset form when convention changes
  useEffect(() => {
    if (convention) {
      setTitle(convention.naming_title);
      // Convert 'both' to 'file' since we no longer support 'both'
      setNamingType(convention.naming_type === 'both' ? 'file' : convention.naming_type);
      setSchema(convention.schema);
      setVariables(convention.variables);
    } else {
      setTitle('');
      setNamingType('file');
      setSchema(createEmptyNamingRuleSchema());
      setVariables([]);
    }
    setErrors({});
  }, [convention]);

  // Validate form
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (schema.filePattern.length === 0 && schema.folderPattern.length === 0) {
      newErrors.schema = 'At least one pattern (file or folder) is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [title, schema]);

  // Handle save
  const handleSave = () => {
    if (!validate()) return;

    const input: NamingConventionInput = {
      naming_title: title.trim(),
      naming_type: namingType,
      naming_value: schema,
      scope_id: convention?.scope_id ?? defaultScopeId,
      variables,
    };

    onSave?.(input);
  };

  // Handle schema change from NamingRuleConfigurator
  const handleSchemaChange = (newSchema: NamingRuleSchema) => {
    setSchema(newSchema);
    if (errors?.schema) {
      setErrors((prev) => ({ ...prev, schema: '' }));
    }
  };

  // Handle export
  const handleExport = useCallback(() => {
    const exportSchema = { ...schema };
    exportSchema.metadata = {
      ...exportSchema.metadata,
      updatedAt: new Date().toISOString(),
    };

    if (onExport) {
      onExport(exportSchema);
    } else {
      // Default export: download as JSON file
      const blob = new Blob([JSON.stringify(exportSchema, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title || 'naming-convention'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [schema, title, onExport]);

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
        const importedSchema = JSON.parse(text) as unknown;

        if (validateNamingRuleSchema(importedSchema)) {
          setSchema(importedSchema);
          onImport?.(importedSchema);
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
    [onImport]
  );

  // Add new variable
  const handleAddVariable = () => {
    if (!newVariableName.trim()) return;

    const newVariable: NamingVariable = {
      variable_name: newVariableName.trim().toLowerCase().replace(/\s+/g, '_'),
      description: newVariableDescription.trim() || newVariableName.trim(),
      example_value: newVariableExample.trim() || 'example',
      category: 'user',
    };

    // Check for duplicates
    if (variables.some((v) => v.variable_name === newVariable.variable_name)) {
      return;
    }

    setVariables([...variables, newVariable]);
    setNewVariableName('');
    setNewVariableDescription('');
    setNewVariableExample('');
    setShowAddVariable(false);
  };

  // Remove variable
  const handleRemoveVariable = (variableName: string) => {
    setVariables(variables.filter((v) => v.variable_name !== variableName));
  };

  // Convert variableDefinitions to NamingVariable format
  const definedVariables: NamingVariable[] = variableDefinitions.map((def) => ({
    variable_name: def.variable_name,
    description: def.description,
    example_value: def.example_value || def.variable_name,
    category: 'user' as const,
  }));

  // Combine user-defined, prop-defined, and legacy available variables
  const allVariables = [
    ...variables,
    ...definedVariables.filter(
      (dv) => !variables.some((v) => v.variable_name === dv.variable_name)
    ),
    ...availableVariables.filter(
      (av) => !variables.some((v) => v.variable_name === av.variable_name) &&
              !definedVariables.some((dv) => dv.variable_name === av.variable_name)
    ),
  ];

  const isEditing = !!convention;

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* Header with Import/Export */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          {isEditing ? 'Edit Convention' : 'Create Convention'}
        </h2>
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
            disabled={readOnly || isSaving}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            title="Import from JSON"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
          </button>
          {/* Export */}
          <button
            type="button"
            onClick={handleExport}
            disabled={isSaving}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md disabled:opacity-50"
            title="Export to JSON"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (errors?.title) setErrors((prev) => ({ ...prev, title: '' }));
            }}
            disabled={readOnly || isSaving}
            placeholder="e.g., Tax Documents, Client Reports"
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
              errors?.title ? 'border-red-300' : 'border-gray-300'
            } disabled:bg-gray-50 disabled:text-gray-500`}
          />
          {errors?.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
        </div>

        {/* Type - Radio Buttons */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
          <div className="flex items-center gap-6">
            {CONVENTION_TYPES.map((type) => (
              <label
                key={type.value}
                className={`flex items-center gap-2 cursor-pointer ${
                  readOnly || isSaving ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <input
                  type="radio"
                  name="naming-type"
                  value={type.value}
                  checked={namingType === type.value}
                  onChange={() => setNamingType(type.value)}
                  disabled={readOnly || isSaving}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-900">{type.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Custom Variables */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Custom Variables
            </label>
            {!readOnly && (
              <button
                onClick={() => setShowAddVariable(!showAddVariable)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {showAddVariable ? 'Cancel' : '+ Add Variable'}
              </button>
            )}
          </div>

          {/* Add variable form */}
          {showAddVariable && (
            <div className="mb-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
              <div className="grid grid-cols-3 gap-3">
                <input
                  type="text"
                  value={newVariableName}
                  onChange={(e) => setNewVariableName(e.target.value)}
                  placeholder="Variable name"
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={newVariableDescription}
                  onChange={(e) => setNewVariableDescription(e.target.value)}
                  placeholder="Description"
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newVariableExample}
                    onChange={(e) => setNewVariableExample(e.target.value)}
                    placeholder="Example value"
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleAddVariable}
                    disabled={!newVariableName.trim()}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Variable list */}
          {variables.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {variables.map((variable) => (
                <span
                  key={variable.variable_name}
                  className="inline-flex items-center gap-1 px-2 py-1 text-sm bg-gray-100 rounded"
                >
                  <span className="font-mono text-gray-700">{`{${variable.variable_name}}`}</span>
                  {!readOnly && (
                    <button
                      onClick={() => handleRemoveVariable(variable.variable_name)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No custom variables defined.</p>
          )}
        </div>

        {/* Pattern Builder */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Naming Patterns
          </label>
          {errors?.schema && <p className="mb-2 text-sm text-red-600">{errors.schema}</p>}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <NamingRuleConfigurator
              variables={allVariables}
              initialSchema={schema}
              onChange={handleSchemaChange}
              readOnly={readOnly || isSaving}
              className="min-h-[400px]"
            />
          </div>
        </div>
      </div>

      {/* Footer with Save/Cancel */}
      <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        {!readOnly && onSave && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
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
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Save
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default NamingConventionEditor;
