'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { ParsedNamingConvention, NamingVariable } from 'hazo_files';
import { createNamingConventionAPI } from '@/lib/naming-conventions';

interface UploadResult {
  success: boolean;
  file?: {
    name: string;
    path: string;
    size: number;
    mimeType: string;
  };
  extraction?: {
    id: string;
    extracted_at: string;
    source?: string;
    data: Record<string, unknown>;
  };
  generatedPath?: string;
  generatedFolderPath?: string;
  originalFileName?: string;
  fileId?: string;
  error?: string;
}

interface FileMetadataRecord {
  id: string;
  filename: string;
  file_type: string;
  file_data: string;
  created_at: string;
  changed_at: string;
  file_path: string;
  storage_type: 'local' | 'google_drive';
}

interface PromptInfo {
  id: string;
  prompt_area: string;
  prompt_key: string;
  prompt_name: string;
}

/**
 * Demo page for Upload + Extract workflow
 * Shows how to upload files with optional naming convention and extraction
 */
export default function UploadExtractPage() {
  const [conventions, setConventions] = useState<ParsedNamingConvention[]>([]);
  const [selectedConventionId, setSelectedConventionId] = useState<string>('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [basePath, setBasePath] = useState('/uploads');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prompt selection state
  const [prompts, setPrompts] = useState<PromptInfo[]>([]);
  const [promptArea, setPromptArea] = useState<string>('');
  const [promptKey, setPromptKey] = useState<string>('');

  // File metadata state
  const [fileMetadata, setFileMetadata] = useState<FileMetadataRecord[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load conventions
  useEffect(() => {
    const loadConventions = async () => {
      try {
        const api = createNamingConventionAPI();
        const data = await api.list();
        setConventions(data);
      } catch (error) {
        console.error('Failed to load conventions:', error);
      }
    };
    loadConventions();
  }, []);

  // Load prompts
  useEffect(() => {
    const loadPrompts = async () => {
      try {
        const response = await fetch('/api/prompts');
        const data = await response.json();
        if (data.success && data.data) {
          setPrompts(data.data);
        }
      } catch (error) {
        console.error('Failed to load prompts:', error);
      }
    };
    loadPrompts();
  }, []);

  // Load file metadata
  const loadFileMetadata = async () => {
    setIsLoadingMetadata(true);
    try {
      const response = await fetch('/api/metadata?limit=50');
      const data = await response.json();
      if (data.success && data.data) {
        setFileMetadata(data.data);
      }
    } catch (error) {
      console.error('Failed to load file metadata:', error);
    } finally {
      setIsLoadingMetadata(false);
    }
  };

  useEffect(() => {
    loadFileMetadata();
  }, []);

  // Selection handlers
  const handleSelectFile = (id: string) => {
    setSelectedFiles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedFiles.size === fileMetadata.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(fileMetadata.map((f) => f.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedFiles.size === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedFiles.size} file record(s)? This only removes the database records, not the actual files.`
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const deletePromises = Array.from(selectedFiles).map((id) =>
        fetch(`/api/metadata?id=${id}`, { method: 'DELETE' })
      );
      await Promise.all(deletePromises);
      setSelectedFiles(new Set());
      await loadFileMetadata();
    } catch (error) {
      console.error('Failed to delete files:', error);
      alert('Failed to delete some records. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Get unique prompt areas and keys for selected area
  const uniqueAreas = [...new Set(prompts.map((p) => p.prompt_area))].sort();
  const keysForSelectedArea = prompts
    .filter((p) => p.prompt_area === promptArea)
    .map((p) => ({ key: p.prompt_key, name: p.prompt_name }))
    .sort((a, b) => a.key.localeCompare(b.key));

  // Get selected convention's variables
  const selectedConvention = conventions.find((c) => c.id === selectedConventionId);
  const conventionVariables: NamingVariable[] = selectedConvention?.variables || [];

  // Preview path when variables change
  useEffect(() => {
    if (!selectedFile || !selectedConventionId) {
      setPreviewPath(null);
      return;
    }

    const preview = async () => {
      try {
        const response = await fetch('/api/files?action=previewPath', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            originalFileName: selectedFile.name,
            namingConventionId: selectedConventionId,
            variables,
            basePath,
          }),
        });
        const data = await response.json();
        if (data.success && data.fullPath) {
          setPreviewPath(data.fullPath);
        }
      } catch {
        setPreviewPath(null);
      }
    };

    // Debounce
    const timeout = setTimeout(preview, 300);
    return () => clearTimeout(timeout);
  }, [selectedFile, selectedConventionId, variables, basePath]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
    }
  };

  const handleVariableChange = (name: string, value: string) => {
    setVariables((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('basePath', basePath);

      if (selectedConventionId) {
        formData.append('namingConventionId', selectedConventionId);
        formData.append('variables', JSON.stringify(variables));
      }

      // Enable extraction if prompt area and key are selected
      if (promptArea && promptKey) {
        formData.append('extract', 'true');
        formData.append('promptArea', promptArea);
        formData.append('promptKey', promptKey);
      } else {
        formData.append('extract', 'false');
      }
      formData.append('createFolders', 'true');

      const response = await fetch('/api/files/upload-extract', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setResult(data);
      // Refresh metadata list after successful upload
      if (data.success) {
        await loadFileMetadata();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      setResult({ success: false, error: message });
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setResult(null);
    setPreviewPath(null);
    setPromptArea('');
    setPromptKey('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Upload & Extract Demo</h1>
        <p className="text-gray-600 mt-2">
          Upload files with optional naming conventions and LLM extraction.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Settings</h2>

          {/* File Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select File
            </label>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {selectedFile && (
              <p className="mt-2 text-sm text-gray-500">
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {/* Base Path */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Base Path
            </label>
            <input
              type="text"
              value={basePath}
              onChange={(e) => setBasePath(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="/uploads"
            />
          </div>

          {/* Naming Convention */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Naming Convention
            </label>
            <select
              value={selectedConventionId}
              onChange={(e) => {
                setSelectedConventionId(e.target.value);
                setVariables({});
              }}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">None (use original filename)</option>
              {conventions.map((conv) => (
                <option key={conv.id} value={conv.id}>
                  {conv.naming_title} ({conv.naming_type})
                </option>
              ))}
            </select>
          </div>

          {/* LLM Extraction Prompt */}
          <div className="mb-4 p-3 bg-gray-50 rounded-md">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              LLM Extraction Prompt (Optional)
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Prompt Area */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Prompt Area</label>
                <select
                  value={promptArea}
                  onChange={(e) => {
                    setPromptArea(e.target.value);
                    setPromptKey(''); // Reset key when area changes
                  }}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Select area...</option>
                  {uniqueAreas.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </div>
              {/* Prompt Key */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Prompt Key</label>
                <select
                  value={promptKey}
                  onChange={(e) => setPromptKey(e.target.value)}
                  disabled={!promptArea}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <option value="">Select key...</option>
                  {keysForSelectedArea.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.key}{item.name ? ` - ${item.name}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {prompts.length === 0 && (
              <p className="text-xs text-gray-500 mt-2">
                No prompts available. Create prompts in the Prompts page.
              </p>
            )}
          </div>

          {/* Variables */}
          {conventionVariables.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Variables
              </label>
              <div className="space-y-2">
                {conventionVariables.map((variable) => (
                  <div key={variable.variable_name} className="flex items-center gap-2">
                    <label className="w-1/3 text-sm text-gray-600">
                      {`{${variable.variable_name}}`}
                    </label>
                    <input
                      type="text"
                      value={variables[variable.variable_name] || ''}
                      onChange={(e) =>
                        handleVariableChange(variable.variable_name, e.target.value)
                      }
                      placeholder={variable.example_value}
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview Path */}
          {previewPath && (
            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm font-medium text-gray-700">Preview Path:</p>
              <p className="text-sm font-mono text-blue-600 break-all">{previewPath}</p>
            </div>
          )}

          {/* Upload Button */}
          <div className="flex gap-2">
            <button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </button>
            {(selectedFile || result) && (
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Result */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Result</h2>

          {!result ? (
            <div className="text-center text-gray-500 py-12">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 mx-auto text-gray-400 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p>Upload a file to see the result</p>
            </div>
          ) : result.success ? (
            <div className="space-y-4">
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm font-medium text-green-800">Upload Successful!</p>
              </div>

              {result.fileId && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">File Record ID</h3>
                  <p className="font-mono text-sm bg-gray-50 p-2 rounded break-all text-indigo-600">
                    {result.fileId}
                  </p>
                </div>
              )}

              {result.file && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">File Info</h3>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Name:</dt>
                      <dd className="font-mono">{result.file.name}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Path:</dt>
                      <dd className="font-mono text-blue-600">{result.file.path}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Size:</dt>
                      <dd>{(result.file.size / 1024).toFixed(1)} KB</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Type:</dt>
                      <dd>{result.file.mimeType}</dd>
                    </div>
                  </dl>
                </div>
              )}

              {result.generatedPath && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Generated Path</h3>
                  <p className="font-mono text-sm bg-gray-50 p-2 rounded break-all">
                    {result.generatedPath}
                  </p>
                </div>
              )}

              {result.originalFileName && result.file?.name !== result.originalFileName && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Renamed From</h3>
                  <p className="text-sm text-gray-600">{result.originalFileName}</p>
                </div>
              )}

              {result.extraction && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Extraction Result</h3>
                  <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-48">
                    {JSON.stringify(result.extraction.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm font-medium text-red-800">Upload Failed</p>
              <p className="text-sm text-red-600 mt-1">{result.error}</p>
            </div>
          )}
        </div>
      </div>

      {/* File Metadata Section */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">File Metadata Records</h2>
          <div className="flex items-center gap-2">
            {selectedFiles.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Deleting...' : `Delete Selected (${selectedFiles.size})`}
              </button>
            )}
            <button
              onClick={loadFileMetadata}
              disabled={isLoadingMetadata}
              className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isLoadingMetadata ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {isLoadingMetadata && fileMetadata.length === 0 ? (
          <div className="text-center text-gray-500 py-8">Loading metadata...</div>
        ) : fileMetadata.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No file records found. Upload a file to see it here.
          </div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left">
                    <input
                      type="checkbox"
                      checked={selectedFiles.size === fileMetadata.length && fileMetadata.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">ID</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Filename</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Path</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Type</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {fileMetadata.map((record) => (
                  <tr
                    key={record.id}
                    className={`hover:bg-gray-50 ${selectedFiles.has(record.id) ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selectedFiles.has(record.id)}
                        onChange={() => handleSelectFile(record.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-500 max-w-[100px] truncate" title={record.id}>
                      {record.id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-2 font-medium">{record.filename}</td>
                    <td className="px-4 py-2 text-gray-500 max-w-[200px] truncate" title={record.file_path}>
                      {record.file_path}
                    </td>
                    <td className="px-4 py-2 text-gray-500">{record.file_type}</td>
                    <td className="px-4 py-2 text-gray-500">
                      {new Date(record.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-xs text-gray-500">
          Showing {fileMetadata.length} record(s). Delete removes database records only, not actual files.
        </p>
      </div>

      {/* Info Section */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-2">About This Demo</h2>
        <div className="text-sm text-blue-800 space-y-2">
          <p>
            This page demonstrates the Upload + Extract workflow from hazo_files:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Upload files to a specified base path</li>
            <li>Apply naming conventions to generate file and folder names</li>
            <li>Variables are substituted in the naming patterns</li>
            <li>Select a prompt area and key for LLM extraction</li>
          </ul>
          <p className="mt-3">
            <strong>Note:</strong> To enable LLM extraction, select both a prompt area and key.
            The hazo_llm_api must be configured with your API credentials for extraction to work.
          </p>
        </div>
      </div>
    </div>
  );
}
