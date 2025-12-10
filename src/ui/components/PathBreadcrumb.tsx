/**
 * PathBreadcrumb Component
 * Displays the current path as a breadcrumb navigation
 */

import React from 'react';
import { getBreadcrumbs } from '../../common/path-utils';
import { HomeIcon, ChevronRightIcon } from '../icons/FileIcons';

export interface PathBreadcrumbProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  className?: string;
}

export function PathBreadcrumb({ currentPath, onNavigate, className = '' }: PathBreadcrumbProps) {
  const breadcrumbs = getBreadcrumbs(currentPath);

  return (
    <nav className={`flex items-center space-x-1 text-sm ${className}`}>
      {breadcrumbs.map((crumb, index) => (
        <React.Fragment key={crumb.path}>
          {index > 0 && (
            <ChevronRightIcon size={16} className="text-gray-400 flex-shrink-0" />
          )}
          <button
            onClick={() => onNavigate(crumb.path)}
            className={`
              flex items-center px-2 py-1 rounded hover:bg-gray-100 transition-colors
              ${index === breadcrumbs.length - 1 ? 'font-medium text-gray-900' : 'text-gray-600'}
            `}
          >
            {index === 0 ? (
              <HomeIcon size={16} className="mr-1" />
            ) : null}
            <span className="truncate max-w-[150px]">{crumb.name}</span>
          </button>
        </React.Fragment>
      ))}
    </nav>
  );
}

export default PathBreadcrumb;
