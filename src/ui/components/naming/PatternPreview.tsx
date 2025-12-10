/**
 * PatternPreview Component
 * Shows real-time preview of generated file/folder names
 */

import { useMemo } from 'react';
import type { PatternSegment, NamingVariable } from '../../../types/naming';
import { generatePreviewName } from '../../../common/naming-utils';

export interface PatternPreviewProps {
  /** File pattern segments */
  filePattern: PatternSegment[];
  /** Folder pattern segments */
  folderPattern: PatternSegment[];
  /** User variables with example values */
  userVariables: NamingVariable[];
  /** Sample file name for extension preservation preview */
  sampleFileName?: string;
  /** Date to use for preview (defaults to current date) */
  previewDate?: Date;
  /** Counter value for preview */
  counterValue?: number;
  /** Additional CSS class */
  className?: string;
}

export function PatternPreview({
  filePattern,
  folderPattern,
  userVariables,
  sampleFileName = 'document.pdf',
  previewDate,
  counterValue = 1,
  className = '',
}: PatternPreviewProps) {
  const date = previewDate || new Date();

  // Generate file name preview
  const filePreview = useMemo(() => {
    if (filePattern.length === 0) {
      return { name: '(no pattern defined)', isEmpty: true };
    }

    const baseName = generatePreviewName(filePattern, userVariables, {
      date,
      counterValue,
      originalFileName: sampleFileName,
    });

    // Add extension from sample file if not already present
    const ext = sampleFileName.includes('.')
      ? sampleFileName.substring(sampleFileName.lastIndexOf('.'))
      : '';

    // Check if the generated name already has an extension
    const hasExtension = baseName.includes('.');

    return {
      name: hasExtension ? baseName : baseName + ext,
      isEmpty: false,
    };
  }, [filePattern, userVariables, date, counterValue, sampleFileName]);

  // Generate folder name preview
  const folderPreview = useMemo(() => {
    if (folderPattern.length === 0) {
      return { name: '(no pattern defined)', isEmpty: true };
    }

    return {
      name: generatePreviewName(folderPattern, userVariables, {
        date,
        counterValue,
        originalFileName: sampleFileName,
      }),
      isEmpty: false,
    };
  }, [folderPattern, userVariables, date, counterValue, sampleFileName]);

  // Format date for display
  const dateDisplay = date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      className={`bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 p-4 ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700">Preview</h3>
        <span className="text-xs text-gray-400">{dateDisplay}</span>
      </div>

      <div className="space-y-3">
        {/* File Preview */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-16 text-xs text-gray-500 pt-0.5">
            File:
          </div>
          <div
            className={`
              flex-1 font-mono text-sm px-3 py-2 rounded bg-white border
              ${
                filePreview.isEmpty
                  ? 'text-gray-400 border-gray-200'
                  : 'text-gray-800 border-gray-300'
              }
            `}
          >
            <span className="flex items-center gap-2">
              {/* File icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-400"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14,2 14,8 20,8" />
              </svg>
              {filePreview.name}
            </span>
          </div>
        </div>

        {/* Folder Preview */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-16 text-xs text-gray-500 pt-0.5">
            Folder:
          </div>
          <div
            className={`
              flex-1 font-mono text-sm px-3 py-2 rounded bg-white border
              ${
                folderPreview.isEmpty
                  ? 'text-gray-400 border-gray-200'
                  : 'text-gray-800 border-gray-300'
              }
            `}
          >
            <span className="flex items-center gap-2">
              {/* Folder icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-yellow-500"
              >
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              {folderPreview.name}
            </span>
          </div>
        </div>

        {/* Full Path Preview */}
        {!filePreview.isEmpty && !folderPreview.isEmpty && (
          <div className="flex items-start gap-3 pt-2 border-t border-gray-200">
            <div className="flex-shrink-0 w-16 text-xs text-gray-500 pt-0.5">
              Full path:
            </div>
            <div className="flex-1 font-mono text-xs text-gray-600 px-3 py-2 rounded bg-gray-100 border border-gray-200 overflow-x-auto">
              /{folderPreview.name}/{filePreview.name}
            </div>
          </div>
        )}
      </div>

      {/* Example values note */}
      <p className="text-xs text-gray-400 mt-3 text-center">
        Preview uses example values from your variables
      </p>
    </div>
  );
}

export default PatternPreview;
