'use client';

import React, { useState } from 'react';
import { NamingConventionManager } from 'hazo_files/ui';
import type { NamingVariable, ParsedNamingConvention } from 'hazo_files';
import { createNamingConventionAPI } from '@/lib/naming-conventions';

/**
 * Sample variables available to all conventions
 */
const AVAILABLE_VARIABLES: NamingVariable[] = [
  {
    variable_name: 'client_id',
    description: 'Client identifier',
    example_value: 'ACME',
    category: 'user',
  },
  {
    variable_name: 'project_name',
    description: 'Project name',
    example_value: 'WebApp',
    category: 'user',
  },
  {
    variable_name: 'department',
    description: 'Department code',
    example_value: 'SALES',
    category: 'user',
  },
  {
    variable_name: 'document_type',
    description: 'Type of document',
    example_value: 'Invoice',
    category: 'user',
  },
];

export default function NamingConventionsPage() {
  const [api] = useState(() => createNamingConventionAPI());
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleSave = (convention: ParsedNamingConvention) => {
    setNotification({
      type: 'success',
      message: `Saved "${convention.naming_title}"`,
    });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDelete = (id: string) => {
    setNotification({
      type: 'success',
      message: 'Convention deleted',
    });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleError = (error: string) => {
    setNotification({
      type: 'error',
      message: error,
    });
    setTimeout(() => setNotification(null), 5000);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Naming Conventions</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage file and folder naming conventions for your projects
          </p>
        </div>

        {/* Notification */}
        {notification && (
          <div
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              notification.type === 'success'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {notification.message}
          </div>
        )}
      </div>

      {/* Manager */}
      <div className="flex-1 min-h-0">
        <NamingConventionManager
          api={api}
          availableVariables={AVAILABLE_VARIABLES}
          onSave={handleSave}
          onDelete={handleDelete}
          onError={handleError}
          listWidth={300}
        />
      </div>
    </div>
  );
}
