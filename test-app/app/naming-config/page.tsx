'use client';

import React, { useState, useCallback } from 'react';
import { NamingRuleConfigurator } from 'hazo_files/ui';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Define types inline to avoid importing from hazo_files (which includes server-side code)
interface NamingVariable {
  variable_name: string;
  description: string;
  example_value: string;
  category?: 'user' | 'date' | 'file' | 'counter';
}

interface PatternSegment {
  id: string;
  type: 'variable' | 'literal';
  value: string;
}

interface NamingRuleSchema {
  version: number;
  filePattern: PatternSegment[];
  folderPattern: PatternSegment[];
  metadata?: {
    name?: string;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
  };
}

// Sample user variables for demonstration
const SAMPLE_USER_VARIABLES: NamingVariable[] = [
  {
    variable_name: 'project_name',
    description: 'Name of the project',
    example_value: 'MyProject',
    category: 'user',
  },
  {
    variable_name: 'client_name',
    description: 'Name of the client',
    example_value: 'AcmeCorp',
    category: 'user',
  },
  {
    variable_name: 'version',
    description: 'Version number',
    example_value: 'v1.0',
    category: 'user',
  },
  {
    variable_name: 'author',
    description: 'Author name',
    example_value: 'JohnDoe',
    category: 'user',
  },
  {
    variable_name: 'department',
    description: 'Department name',
    example_value: 'Engineering',
    category: 'user',
  },
];

export default function NamingConfigPage() {
  const [lastExportedSchema, setLastExportedSchema] = useState<NamingRuleSchema | null>(null);
  const [schemaJson, setSchemaJson] = useState<string>('');

  // Handle export
  const handleExport = useCallback((schema: NamingRuleSchema) => {
    setLastExportedSchema(schema);
    setSchemaJson(JSON.stringify(schema, null, 2));

    // Download the file
    const blob = new Blob([JSON.stringify(schema, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `naming-rule-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // Handle import
  const handleImport = useCallback((schema: NamingRuleSchema) => {
    setLastExportedSchema(schema);
    setSchemaJson(JSON.stringify(schema, null, 2));
  }, []);

  // Handle schema change
  const handleChange = useCallback((schema: NamingRuleSchema) => {
    setSchemaJson(JSON.stringify(schema, null, 2));
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-indigo-600" />
          <div>
            <h1 className="text-xl font-semibold">Naming Rule Configurator</h1>
            <p className="text-sm text-gray-500">
              Create and configure file/folder naming patterns
            </p>
          </div>
        </div>
      </div>

      {/* Main content - two column layout */}
      <div className="flex-1 flex gap-4 p-4 min-h-0 overflow-hidden">
        {/* Left: Configurator */}
        <div className="flex-1 min-w-0 overflow-auto">
          <NamingRuleConfigurator
            variables={SAMPLE_USER_VARIABLES}
            onExport={handleExport}
            onImport={handleImport}
            onChange={handleChange}
            sampleFileName="report.pdf"
            className="h-full"
          />
        </div>

        {/* Right: Schema preview */}
        <div className="w-96 flex-shrink-0 flex flex-col bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-3 border-b border-gray-200 bg-white">
            <h3 className="text-sm font-medium text-gray-700">
              Schema Preview (JSON)
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              This is the output format used by hazo_files_generate_file_name and
              hazo_files_generate_folder_name
            </p>
          </div>
          <div className="flex-1 overflow-auto p-3">
            <pre className="text-xs font-mono text-gray-600 whitespace-pre-wrap break-all">
              {schemaJson || '{\n  "version": 1,\n  "filePattern": [],\n  "folderPattern": []\n}'}
            </pre>
          </div>
          {schemaJson && (
            <div className="p-3 border-t border-gray-200 bg-white">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigator.clipboard.writeText(schemaJson)}
                className="w-full"
              >
                Copy JSON to Clipboard
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="p-4 border-t bg-gray-50">
        <div className="max-w-4xl">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            How to use:
          </h3>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>
              1. <strong>Drag variables</strong> from the top panel to the
              pattern areas, or click them to add
            </li>
            <li>
              2. <strong>Add separators</strong> using the quick-add buttons
              (-, _, /, space, .)
            </li>
            <li>
              3. <strong>Reorder segments</strong> by dragging them within the
              pattern
            </li>
            <li>
              4. <strong>Edit text</strong> by double-clicking on literal
              segments
            </li>
            <li>
              5. <strong>Export</strong> your configuration as JSON to use with
              hazo_files_generate_file_name
            </li>
            <li>
              6. <strong>Import</strong> a previously saved configuration to
              continue editing
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
