'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  RefreshCw,
  X,
  AlertCircle,
  HardDrive,
  Cloud,
  FileText,
  Folder,
  Calendar,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

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

interface ApiResponse {
  success: boolean;
  data?: FileMetadataRecord[];
  error?: string;
  count?: number;
}

export default function FileMetadataPage() {
  const [records, setRecords] = useState<FileMetadataRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<FileMetadataRecord | null>(null);
  const [filterStorage, setFilterStorage] = useState<string>('');

  // Fetch records
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filterStorage) {
        params.set('storage_type', filterStorage);
      }

      const response = await fetch(`/api/metadata?${params.toString()}`);
      const data: ApiResponse = await response.json();

      if (data.success) {
        setRecords(data.data || []);
      } else {
        setError(data.error || 'Failed to fetch records');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch records');
    } finally {
      setLoading(false);
    }
  }, [filterStorage]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Format date for display
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString();
    } catch {
      return dateStr;
    }
  };

  // Parse file_data JSON
  const parseFileData = (fileData: string) => {
    try {
      return JSON.parse(fileData);
    } catch {
      return {};
    }
  };

  // Get storage icon
  const StorageIcon = ({ type }: { type: string }) => {
    if (type === 'google_drive') {
      return <Cloud className="h-4 w-4 text-blue-500" />;
    }
    return <HardDrive className="h-4 w-4 text-gray-500" />;
  };

  // Get file type icon
  const FileTypeIcon = ({ type }: { type: string }) => {
    if (type === 'folder') {
      return <Folder className="h-4 w-4 text-yellow-500" />;
    }
    return <FileText className="h-4 w-4 text-gray-500" />;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Database className="h-6 w-6 text-indigo-600" />
          <div>
            <h1 className="text-xl font-semibold">File Metadata</h1>
            <p className="text-sm text-gray-500">
              View tracked files in the hazo_files database
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Storage filter */}
          <select
            value={filterStorage}
            onChange={(e) => setFilterStorage(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Storage Types</option>
            <option value="local">Local</option>
            <option value="google_drive">Google Drive</option>
          </select>
          <Button variant="outline" onClick={fetchRecords} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-2 text-gray-500">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Loading records...</span>
            </div>
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Database className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-lg font-medium">No records found</p>
            <p className="text-sm">
              {filterStorage
                ? `No files tracked for ${filterStorage} storage`
                : 'No files have been tracked yet'}
            </p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Storage</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Filename</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Path</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Created</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Modified</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {records.map((record) => (
                  <tr
                    key={record.id}
                    onClick={() => setSelectedRecord(record)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <StorageIcon type={record.storage_type} />
                        <span className="capitalize">
                          {record.storage_type === 'google_drive' ? 'Google Drive' : 'Local'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileTypeIcon type={record.file_type} />
                        <span className="capitalize">{record.file_type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">{record.filename}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate" title={record.file_path}>
                      {record.file_path}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(record.created_at)}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(record.changed_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && records.length > 0 && (
          <div className="mt-3 text-sm text-gray-500">
            Showing {records.length} record{records.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            {/* Dialog Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-3">
                <FileTypeIcon type={selectedRecord.file_type} />
                <h2 className="text-lg font-semibold">{selectedRecord.filename}</h2>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Dialog Content */}
            <div className="flex-1 overflow-auto p-6">
              <div className="space-y-4">
                {/* ID */}
                <div className="flex items-start gap-4">
                  <span className="w-32 text-sm font-medium text-gray-500">ID</span>
                  <code className="flex-1 text-sm bg-gray-100 px-2 py-1 rounded font-mono break-all">
                    {selectedRecord.id}
                  </code>
                </div>

                {/* Filename */}
                <div className="flex items-start gap-4">
                  <span className="w-32 text-sm font-medium text-gray-500">Filename</span>
                  <span className="flex-1 text-sm">{selectedRecord.filename}</span>
                </div>

                {/* File Type */}
                <div className="flex items-start gap-4">
                  <span className="w-32 text-sm font-medium text-gray-500">File Type</span>
                  <div className="flex items-center gap-2">
                    <FileTypeIcon type={selectedRecord.file_type} />
                    <span className="text-sm capitalize">{selectedRecord.file_type}</span>
                  </div>
                </div>

                {/* Storage Type */}
                <div className="flex items-start gap-4">
                  <span className="w-32 text-sm font-medium text-gray-500">Storage Type</span>
                  <div className="flex items-center gap-2">
                    <StorageIcon type={selectedRecord.storage_type} />
                    <span className="text-sm capitalize">
                      {selectedRecord.storage_type === 'google_drive' ? 'Google Drive' : 'Local'}
                    </span>
                  </div>
                </div>

                {/* File Path */}
                <div className="flex items-start gap-4">
                  <span className="w-32 text-sm font-medium text-gray-500">File Path</span>
                  <code className="flex-1 text-sm bg-gray-100 px-2 py-1 rounded font-mono break-all">
                    {selectedRecord.file_path}
                  </code>
                </div>

                {/* Created At */}
                <div className="flex items-start gap-4">
                  <span className="w-32 text-sm font-medium text-gray-500">Created At</span>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>{formatDate(selectedRecord.created_at)}</span>
                  </div>
                </div>

                {/* Changed At */}
                <div className="flex items-start gap-4">
                  <span className="w-32 text-sm font-medium text-gray-500">Modified At</span>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span>{formatDate(selectedRecord.changed_at)}</span>
                  </div>
                </div>

                {/* File Data */}
                <div className="flex items-start gap-4">
                  <span className="w-32 text-sm font-medium text-gray-500">File Data</span>
                  <pre className="flex-1 text-xs bg-gray-100 px-3 py-2 rounded font-mono overflow-x-auto">
                    {JSON.stringify(parseFileData(selectedRecord.file_data), null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            {/* Dialog Footer */}
            <div className="px-6 py-4 border-t bg-gray-50">
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setSelectedRecord(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
