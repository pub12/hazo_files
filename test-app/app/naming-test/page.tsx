'use client';

import React, { useState, useCallback } from 'react';
import { FlaskConical, Play, Copy, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Define types inline to avoid importing from hazo_files (which includes server-side code)
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

interface GeneratedNameResult {
  success: boolean;
  name?: string;
  error?: string;
}

// Default schema for testing
const DEFAULT_SCHEMA: NamingRuleSchema = {
  version: 1,
  filePattern: [
    { id: 'seg_1', type: 'variable', value: 'project_name' },
    { id: 'seg_2', type: 'literal', value: '_' },
    { id: 'seg_3', type: 'variable', value: 'YYYY' },
    { id: 'seg_4', type: 'literal', value: '-' },
    { id: 'seg_5', type: 'variable', value: 'MM' },
    { id: 'seg_6', type: 'literal', value: '-' },
    { id: 'seg_7', type: 'variable', value: 'DD' },
  ],
  folderPattern: [
    { id: 'seg_8', type: 'variable', value: 'YYYY' },
    { id: 'seg_9', type: 'literal', value: '/' },
    { id: 'seg_10', type: 'variable', value: 'MMM' },
    { id: 'seg_11', type: 'literal', value: '/' },
    { id: 'seg_12', type: 'variable', value: 'project_name' },
  ],
  metadata: {
    name: 'Default Test Schema',
    description: 'A sample schema for testing',
  },
};

// Default variables for testing
const DEFAULT_VARIABLES: Record<string, string> = {
  project_name: 'MyProject',
  client_name: 'AcmeCorp',
  version: 'v1.0',
  author: 'JohnDoe',
  department: 'Engineering',
};

// Validate schema structure (client-side lightweight validation)
function isValidSchema(schema: unknown): schema is NamingRuleSchema {
  if (!schema || typeof schema !== 'object') return false;
  const s = schema as Record<string, unknown>;
  return (
    typeof s.version === 'number' &&
    Array.isArray(s.filePattern) &&
    Array.isArray(s.folderPattern)
  );
}

export default function NamingTestPage() {
  const [schemaInput, setSchemaInput] = useState(
    JSON.stringify(DEFAULT_SCHEMA, null, 2)
  );
  const [variablesInput, setVariablesInput] = useState(
    JSON.stringify(DEFAULT_VARIABLES, null, 2)
  );
  const [originalFileName, setOriginalFileName] = useState('report.pdf');
  const [customDate, setCustomDate] = useState('');

  const [fileResult, setFileResult] = useState<GeneratedNameResult | null>(null);
  const [folderResult, setFolderResult] = useState<GeneratedNameResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Generate names via API
  const handleGenerate = useCallback(async () => {
    setError(null);
    setFileResult(null);
    setFolderResult(null);
    setIsLoading(true);

    try {
      // Parse schema
      let schema: unknown;
      try {
        schema = JSON.parse(schemaInput);
      } catch {
        setError('Invalid JSON in schema input');
        setIsLoading(false);
        return;
      }

      if (!isValidSchema(schema)) {
        setError('Invalid naming rule schema. Please check the format.');
        setIsLoading(false);
        return;
      }

      // Parse variables
      let variables: Record<string, string>;
      try {
        variables = JSON.parse(variablesInput);
      } catch {
        setError('Invalid JSON in variables input');
        setIsLoading(false);
        return;
      }

      if (typeof variables !== 'object' || variables === null) {
        setError('Variables must be a JSON object.');
        setIsLoading(false);
        return;
      }

      // Build options
      const options: { date?: string } = {};
      if (customDate) {
        options.date = customDate;
      }

      // Call API
      const response = await fetch('/api/naming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_both',
          schema,
          variables,
          originalFileName: originalFileName || undefined,
          options,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to generate names');
      } else {
        setFileResult(data.file);
        setFolderResult(data.folder);
      }
    } catch (err) {
      setError(
        `Error: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    } finally {
      setIsLoading(false);
    }
  }, [schemaInput, variablesInput, originalFileName, customDate]);

  // Reset to defaults
  const handleReset = useCallback(() => {
    setSchemaInput(JSON.stringify(DEFAULT_SCHEMA, null, 2));
    setVariablesInput(JSON.stringify(DEFAULT_VARIABLES, null, 2));
    setOriginalFileName('report.pdf');
    setCustomDate('');
    setFileResult(null);
    setFolderResult(null);
    setError(null);
  }, []);

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <FlaskConical className="h-6 w-6 text-purple-600" />
          <div>
            <h1 className="text-xl font-semibold">Naming Function Tester</h1>
            <p className="text-sm text-gray-500">
              Test hazo_files_generate_file_name and hazo_files_generate_folder_name
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={handleReset}>
          Reset to Defaults
        </Button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex gap-4 p-4 min-h-0 overflow-hidden">
        {/* Left column: Inputs */}
        <div className="flex-1 flex flex-col gap-4 overflow-auto">
          {/* Schema Input */}
          <div className="flex flex-col flex-1 min-h-[200px]">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                Naming Rule Schema (JSON)
              </label>
              <button
                onClick={() => copyToClipboard(schemaInput)}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Copy className="h-3 w-3" />
                Copy
              </button>
            </div>
            <textarea
              value={schemaInput}
              onChange={(e) => setSchemaInput(e.target.value)}
              className="flex-1 p-3 font-mono text-xs border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Paste your naming rule schema JSON here..."
            />
          </div>

          {/* Variables Input */}
          <div className="flex flex-col flex-1 min-h-[150px]">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                Variable Values (JSON)
              </label>
              <button
                onClick={() => copyToClipboard(variablesInput)}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Copy className="h-3 w-3" />
                Copy
              </button>
            </div>
            <textarea
              value={variablesInput}
              onChange={(e) => setVariablesInput(e.target.value)}
              className="flex-1 p-3 font-mono text-xs border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder='{"project_name": "MyProject", ...}'
            />
          </div>

          {/* Options Row */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Original File Name (for extension preservation)
              </label>
              <input
                type="text"
                value={originalFileName}
                onChange={(e) => setOriginalFileName(e.target.value)}
                className="w-full p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., document.pdf"
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Custom Date (optional)
              </label>
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Right column: Results */}
        <div className="w-96 flex-shrink-0 flex flex-col gap-4">
          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            className="w-full bg-purple-600 hover:bg-purple-700"
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating...
              </span>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Generate Names
              </>
            )}
          </Button>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Results */}
          <div className="flex-1 flex flex-col gap-4 overflow-auto">
            {/* File Name Result */}
            <div className="bg-white border rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 border-b">
                <h3 className="text-sm font-medium text-gray-700">
                  hazo_files_generate_file_name()
                </h3>
              </div>
              <div className="p-3">
                {fileResult ? (
                  fileResult.success ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <code className="text-sm bg-green-50 px-2 py-1 rounded text-green-800 flex-1 overflow-x-auto">
                        {fileResult.name}
                      </code>
                      <button
                        onClick={() => copyToClipboard(fileResult.name || '')}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm">{fileResult.error}</span>
                    </div>
                  )
                ) : (
                  <span className="text-sm text-gray-400">
                    Click "Generate Names" to see result
                  </span>
                )}
              </div>
            </div>

            {/* Folder Name Result */}
            <div className="bg-white border rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 border-b">
                <h3 className="text-sm font-medium text-gray-700">
                  hazo_files_generate_folder_name()
                </h3>
              </div>
              <div className="p-3">
                {folderResult ? (
                  folderResult.success ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <code className="text-sm bg-green-50 px-2 py-1 rounded text-green-800 flex-1 overflow-x-auto">
                        {folderResult.name}
                      </code>
                      <button
                        onClick={() => copyToClipboard(folderResult.name || '')}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm">{folderResult.error}</span>
                    </div>
                  )
                ) : (
                  <span className="text-sm text-gray-400">
                    Click "Generate Names" to see result
                  </span>
                )}
              </div>
            </div>

            {/* Full Path Preview */}
            {fileResult?.success && folderResult?.success && (
              <div className="bg-white border rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 border-b">
                  <h3 className="text-sm font-medium text-gray-700">
                    Full Path Preview
                  </h3>
                </div>
                <div className="p-3">
                  <code className="text-sm bg-blue-50 px-2 py-1 rounded text-blue-800 block overflow-x-auto">
                    /{folderResult.name}/{fileResult.name}
                  </code>
                </div>
              </div>
            )}

            {/* API Reference */}
            <div className="bg-gray-50 border rounded-lg p-3">
              <h4 className="text-xs font-medium text-gray-600 mb-2">
                API Reference
              </h4>
              <pre className="text-xs font-mono text-gray-500 whitespace-pre-wrap">
{`// Generate file name
hazo_files_generate_file_name(
  schema: NamingRuleSchema,
  variables: Record<string, string>,
  originalFileName?: string,
  options?: { date?: Date }
)

// Generate folder name
hazo_files_generate_folder_name(
  schema: NamingRuleSchema,
  variables: Record<string, string>,
  options?: { date?: Date }
)`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
