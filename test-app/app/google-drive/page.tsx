'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { FileBrowser } from 'hazo_files/ui';
import { createFileBrowserAPI } from '@/lib/hazo-files';
import { Cloud, Grid, List, LogIn, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  picture: string;
}

export default function GoogleDrivePage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const api = useMemo(() => createFileBrowserAPI('google_drive'), []);

  // Check authentication status and fetch profile
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setIsLoading(true);
    try {
      // Check auth status
      const statusResponse = await fetch('/api/auth/google/status');
      const statusData = await statusResponse.json();
      setIsAuthenticated(statusData.authenticated);

      // If authenticated, fetch profile
      if (statusData.authenticated) {
        const profileResponse = await fetch('/api/auth/google/profile');
        const profileData = await profileResponse.json();
        if (profileData.profile) {
          setUserProfile(profileData.profile);
        }
      }
    } catch {
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = () => {
    window.location.href = '/api/auth/google';
  };

  const handleDisconnect = async () => {
    try {
      await fetch('/api/auth/google/disconnect', { method: 'POST' });
      setIsAuthenticated(false);
      setUserProfile(null);
    } catch {
      setError('Failed to disconnect');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="text-center max-w-md">
          <Cloud className="h-16 w-16 text-green-600 mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-4">Connect to Google Drive</h1>
          <p className="text-muted-foreground mb-8">
            Authorize access to your Google Drive to browse and manage your cloud files.
            This is a one-time setup - you won't need to do this again.
          </p>
          <Button onClick={handleConnect} size="lg" className="gap-2">
            <LogIn className="h-5 w-5" />
            Connect Google Drive
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            We only request access to files created by this app.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Cloud className="h-6 w-6 text-green-600" />
          <h1 className="text-xl font-semibold">Google Drive</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* User Profile */}
          {userProfile && (
            <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-50 rounded-full">
              <img
                src={userProfile.picture}
                alt={userProfile.name}
                className="h-7 w-7 rounded-full"
                referrerPolicy="no-referrer"
              />
              <div className="hidden sm:block">
                <p className="text-sm font-medium leading-none">{userProfile.name}</p>
                <p className="text-xs text-muted-foreground">{userProfile.email}</p>
              </div>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleDisconnect}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Disconnect
          </Button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="m-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* File Browser */}
      <div className="flex-1 p-4">
        <FileBrowser
          api={api}
          initialPath="/"
          viewMode={viewMode}
          showPreview={true}
          showTree={true}
          treeWidth={250}
          previewHeight={250}
          onError={setError}
          className="h-full"
        />
      </div>
    </div>
  );
}
