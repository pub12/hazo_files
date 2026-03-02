'use client';

import React, { useState, useRef, useEffect } from 'react';

interface PromptInfo {
  id: string;
  prompt_area: string;
  prompt_key: string;
  prompt_name: string;
}

interface FileMetadataRecord {
  id: string;
  filename: string;
  file_type: string;
  file_path: string;
  content_tag?: string | null;
  created_at: string;
  changed_at: string;
}

interface UploadResult {
  success: boolean;
  file?: { name: string; path: string; size: number; mimeType: string };
  contentTag?: string;
  generatedPath?: string;
  originalFileName?: string;
  fileId?: string;
  error?: string;
}

interface TagResult {
  success: boolean;
  data?: string;
  error?: string;
}

export default function ContentTagPage() {
  // Upload with tagging state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [basePath, setBasePath] = useState('/uploads');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Content tag config state (shared)
  const [prompts, setPrompts] = useState<PromptInfo[]>([]);
  const [promptArea, setPromptArea] = useState('');
  const [promptKey, setPromptKey] = useState('');
  const [returnFieldname, setReturnFieldname] = useState('content_tag');

  // Manual tagging state
  const [fileRecords, setFileRecords] = useState<FileMetadataRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState('');
  const [isTagging, setIsTagging] = useState(false);
  const [tagResult, setTagResult] = useState<TagResult | null>(null);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);

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

  // Load file records
  const loadFileRecords = async () => {
    setIsLoadingRecords(true);
    try {
      const response = await fetch('/api/metadata?limit=50');
      const data = await response.json();
      if (data.success && data.data) {
        // Filter to only file records (not folders)
        setFileRecords(data.data.filter((r: FileMetadataRecord) => r.file_type !== 'folder'));
      }
    } catch (error) {
      console.error('Failed to load file records:', error);
    } finally {
      setIsLoadingRecords(false);
    }
  };

  useEffect(() => {
    loadFileRecords();
  }, []);

  const uniqueAreas = [...new Set(prompts.map((p) => p.prompt_area))].sort();
  const keysForSelectedArea = prompts
    .filter((p) => p.prompt_area === promptArea)
    .map((p) => ({ key: p.prompt_key, name: p.prompt_name }))
    .sort((a, b) => a.key.localeCompare(b.key));

  const isConfigValid = promptArea && promptKey && returnFieldname;

  // Upload with content tagging
  const handleUploadWithTag = async () => {
    if (!selectedFile || !isConfigValid) return;

    setIsUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('basePath', basePath);
      formData.append('createFolders', 'true');
      formData.append('extract', 'false');

      // Content tag config
      formData.append('contentTagEnabled', 'true');
      formData.append('contentTagPromptArea', promptArea);
      formData.append('contentTagPromptKey', promptKey);
      formData.append('contentTagReturnFieldname', returnFieldname);

      const response = await fetch('/api/files/upload-extract', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setUploadResult(data);

      if (data.success) {
        await loadFileRecords();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      setUploadResult({ success: false, error: message });
    } finally {
      setIsUploading(false);
    }
  };

  // Manual tagging
  const handleManualTag = async () => {
    if (!selectedRecordId || !isConfigValid) return;

    setIsTagging(true);
    setTagResult(null);

    try {
      const response = await fetch('/api/files/content-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: selectedRecordId,
          promptArea,
          promptKey,
          returnFieldname,
        }),
      });

      const data = await response.json();
      setTagResult(data);

      if (data.success) {
        await loadFileRecords();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Tagging failed';
      setTagResult({ success: false, error: message });
    } finally {
      setIsTagging(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setUploadResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Content Tagging Demo</h1>
        <p className="text-gray-600 mt-2">
          Classify document content using LLM-based content tagging. Tags are written to the{' '}
          <code className="text-sm bg-gray-100 px-1 rounded">content_tag</code> column.
        </p>
      </div>

      {/* Shared Config */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Content Tag Configuration</h2>
        <p className="text-sm text-gray-500 mb-4">
          Configure the LLM prompt and field name used for both upload-time and manual tagging.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Prompt Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prompt Area</label>
            <select
              value={promptArea}
              onChange={(e) => { setPromptArea(e.target.value); setPromptKey(''); }}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">Select area...</option>
              {uniqueAreas.map((area) => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
          </div>

          {/* Prompt Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prompt Key</label>
            <select
              value={promptKey}
              onChange={(e) => setPromptKey(e.target.value)}
              disabled={!promptArea}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
            >
              <option value="">Select key...</option>
              {keysForSelectedArea.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.key}{item.name ? ` - ${item.name}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Return Fieldname */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Return Field Name</label>
            <input
              type="text"
              value={returnFieldname}
              onChange={(e) => setReturnFieldname(e.target.value)}
              placeholder="content_tag"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              JSON field in the LLM response to extract as the tag
            </p>
          </div>
        </div>

        {prompts.length === 0 && (
          <p className="text-sm text-amber-600 mt-3">
            No prompts available. Create prompts in the Prompts page first.
          </p>
        )}

        {!isConfigValid && prompts.length > 0 && (
          <p className="text-sm text-gray-500 mt-3">
            Select a prompt area, key, and return field name to enable tagging.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload with Content Tagging */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload with Content Tag</h2>
          <p className="text-sm text-gray-500 mb-4">
            Upload a file and automatically tag its content using the LLM.
          </p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select File</label>
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => { setSelectedFile(e.target.files?.[0] || null); setUploadResult(null); }}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {selectedFile && (
              <p className="mt-1 text-sm text-gray-500">
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Base Path</label>
            <input
              type="text"
              value={basePath}
              onChange={(e) => setBasePath(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleUploadWithTag}
              disabled={!selectedFile || !isConfigValid || isUploading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Uploading & Tagging...' : 'Upload & Tag'}
            </button>
            {(selectedFile || uploadResult) && (
              <button onClick={handleReset} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">
                Reset
              </button>
            )}
          </div>

          {uploadResult && (
            <div className="mt-4">
              {uploadResult.success ? (
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm font-medium text-green-800">Upload & Tag Successful</p>
                  </div>
                  {uploadResult.contentTag && (
                    <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-md">
                      <p className="text-sm font-medium text-indigo-800 mb-1">Content Tag:</p>
                      <p className="text-lg font-semibold text-indigo-900">{uploadResult.contentTag}</p>
                    </div>
                  )}
                  {!uploadResult.contentTag && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                      <p className="text-sm text-amber-700">
                        No content tag was returned. The LLM response may not contain the field &quot;{returnFieldname}&quot;.
                      </p>
                    </div>
                  )}
                  {uploadResult.file && (
                    <dl className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Path:</dt>
                        <dd className="font-mono text-blue-600">{uploadResult.file.path}</dd>
                      </div>
                      {uploadResult.fileId && (
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Record ID:</dt>
                          <dd className="font-mono text-xs">{uploadResult.fileId}</dd>
                        </div>
                      )}
                    </dl>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm font-medium text-red-800">Upload Failed</p>
                  <p className="text-sm text-red-600 mt-1">{uploadResult.error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Manual Tagging */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Manual Content Tag</h2>
          <p className="text-sm text-gray-500 mb-4">
            Tag an existing file record by selecting it from the database.
          </p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select File Record
            </label>
            <select
              value={selectedRecordId}
              onChange={(e) => { setSelectedRecordId(e.target.value); setTagResult(null); }}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">Select a file...</option>
              {fileRecords.map((record) => (
                <option key={record.id} value={record.id}>
                  {record.filename} ({record.file_path})
                  {record.content_tag ? ` [tagged: ${record.content_tag}]` : ''}
                </option>
              ))}
            </select>
            <div className="flex justify-between mt-1">
              <p className="text-xs text-gray-400">
                {fileRecords.length} file record(s) available
              </p>
              <button
                onClick={loadFileRecords}
                disabled={isLoadingRecords}
                className="text-xs text-blue-600 hover:underline"
              >
                {isLoadingRecords ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>

          <button
            onClick={handleManualTag}
            disabled={!selectedRecordId || !isConfigValid || isTagging}
            className="w-full px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isTagging ? 'Tagging...' : 'Tag Selected File'}
          </button>

          {tagResult && (
            <div className="mt-4">
              {tagResult.success ? (
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm font-medium text-green-800">Tagging Successful</p>
                  </div>
                  <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-md">
                    <p className="text-sm font-medium text-indigo-800 mb-1">Content Tag:</p>
                    <p className="text-lg font-semibold text-indigo-900">{tagResult.data}</p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm font-medium text-red-800">Tagging Failed</p>
                  <p className="text-sm text-red-600 mt-1">{tagResult.error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* File Records with Tags */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">File Records with Content Tags</h2>
          <button
            onClick={loadFileRecords}
            disabled={isLoadingRecords}
            className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            {isLoadingRecords ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {fileRecords.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No file records found. Upload a file to see it here.
          </div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Filename</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Path</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Type</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Content Tag</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">ID</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {fileRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{record.filename}</td>
                    <td className="px-4 py-2 text-gray-500 max-w-[200px] truncate" title={record.file_path}>
                      {record.file_path}
                    </td>
                    <td className="px-4 py-2 text-gray-500">{record.file_type}</td>
                    <td className="px-4 py-2">
                      {record.content_tag ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          {record.content_tag}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">untagged</span>
                      )}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-400 max-w-[100px] truncate" title={record.id}>
                      {record.id.slice(0, 8)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-2">About Content Tagging</h2>
        <div className="text-sm text-blue-800 space-y-2">
          <p>This page demonstrates the <code className="bg-blue-100 px-1 rounded">content_tag</code> feature:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Upload with Tag:</strong> Uploads a file and calls the LLM at upload time to classify the document content</li>
            <li><strong>Manual Tag:</strong> Tags an existing file by its database record ID using <code className="bg-blue-100 px-1 rounded">tagFileContent()</code></li>
            <li>The LLM is called with the configured prompt, and the value of the specified return field is written to <code className="bg-blue-100 px-1 rounded">content_tag</code></li>
          </ul>
          <p className="mt-3">
            <strong>Note:</strong> Content tagging requires hazo_llm_api to be configured with API credentials
            and at least one prompt in the database.
          </p>
        </div>
      </div>
    </div>
  );
}
