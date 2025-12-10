/**
 * FilePreview Component
 * Displays a preview of the selected file
 */

import { useEffect, useState } from 'react';
import type { FileSystemItem, FileItem } from '../../types';
import { formatBytes } from '../../common/utils';
import { isImage, isVideo, isAudio, isText, isPreviewable } from '../../common/mime-types';
import { getFileIcon, LoaderIcon } from '../icons/FileIcons';

export interface FilePreviewProps {
  item: FileSystemItem | null;
  getPreviewUrl?: (path: string) => Promise<string>;
  getFileContent?: (path: string) => Promise<string>;
  className?: string;
}

export function FilePreview({
  item,
  getPreviewUrl,
  getFileContent,
  className = '',
}: FilePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPreviewUrl(null);
    setTextContent(null);
    setError(null);

    if (!item || item.isDirectory) {
      return;
    }

    const fileItem = item as FileItem;
    const mimeType = fileItem.mimeType;

    // Load preview based on file type
    const loadPreview = async () => {
      setIsLoading(true);
      try {
        if ((isImage(mimeType) || isVideo(mimeType) || isAudio(mimeType)) && getPreviewUrl) {
          const url = await getPreviewUrl(item.path);
          setPreviewUrl(url);
        } else if (isText(mimeType) && getFileContent) {
          const content = await getFileContent(item.path);
          setTextContent(content);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    if (isPreviewable(mimeType) && (getPreviewUrl || getFileContent)) {
      loadPreview();
    }
  }, [item, getPreviewUrl, getFileContent]);

  // No item selected
  if (!item) {
    return (
      <div className={`flex items-center justify-center h-full text-gray-400 ${className}`}>
        <p>Select a file to preview</p>
      </div>
    );
  }

  // Folder selected
  if (item.isDirectory) {
    const Icon = getFileIcon('folder', true);
    return (
      <div className={`flex flex-col items-center justify-center h-full p-4 ${className}`}>
        <Icon size={64} className="text-yellow-500 mb-4" />
        <h3 className="text-lg font-medium">{item.name}</h3>
        <p className="text-sm text-gray-500 mt-2">Folder</p>
        <div className="mt-4 text-xs text-gray-400 space-y-1">
          <p>Created: {new Date(item.createdAt).toLocaleString()}</p>
          <p>Modified: {new Date(item.modifiedAt).toLocaleString()}</p>
        </div>
      </div>
    );
  }

  const fileItem = item as FileItem;
  const mimeType = fileItem.mimeType;
  const Icon = getFileIcon(mimeType, false);

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <LoaderIcon size={32} className="text-gray-400" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center h-full p-4 text-red-500 ${className}`}>
        <p>Error loading preview</p>
        <p className="text-sm mt-2">{error}</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Preview area */}
      <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-50">
        {/* Image preview */}
        {isImage(mimeType) && previewUrl && (
          <img
            src={previewUrl}
            alt={item.name}
            className="max-w-full max-h-full object-contain"
          />
        )}

        {/* Video preview */}
        {isVideo(mimeType) && previewUrl && (
          <video
            src={previewUrl}
            controls
            className="max-w-full max-h-full"
          >
            Your browser does not support video playback.
          </video>
        )}

        {/* Audio preview */}
        {isAudio(mimeType) && previewUrl && (
          <div className="flex flex-col items-center">
            <Icon size={64} className="text-gray-400 mb-4" />
            <audio src={previewUrl} controls className="w-full max-w-md">
              Your browser does not support audio playback.
            </audio>
          </div>
        )}

        {/* Text preview */}
        {isText(mimeType) && textContent !== null && (
          <pre className="w-full h-full overflow-auto text-sm bg-white p-4 rounded border font-mono whitespace-pre-wrap">
            {textContent}
          </pre>
        )}

        {/* No preview available */}
        {!previewUrl && textContent === null && (
          <div className="flex flex-col items-center text-gray-400">
            <Icon size={64} className="mb-4" />
            <p>No preview available</p>
          </div>
        )}
      </div>

      {/* File info */}
      <div className="border-t bg-white p-4">
        <h3 className="font-medium truncate" title={item.name}>
          {item.name}
        </h3>
        <div className="mt-2 text-sm text-gray-500 grid grid-cols-2 gap-2">
          <div>
            <span className="text-gray-400">Size:</span>{' '}
            {formatBytes(fileItem.size)}
          </div>
          <div>
            <span className="text-gray-400">Type:</span>{' '}
            {mimeType}
          </div>
          <div>
            <span className="text-gray-400">Created:</span>{' '}
            {new Date(item.createdAt).toLocaleDateString()}
          </div>
          <div>
            <span className="text-gray-400">Modified:</span>{' '}
            {new Date(item.modifiedAt).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FilePreview;
