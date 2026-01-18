/**
 * Hazo Files integration for the test app
 * Creates an API adapter for the FileBrowser component
 */

import type { FileBrowserAPI } from 'hazo_files/ui';

/**
 * Create a client-side API adapter that calls the server endpoints
 */
export function createFileBrowserAPI(provider: 'local' | 'google_drive' = 'local'): FileBrowserAPI {
  const baseUrl = '/api/files';

  return {
    async listDirectory(path: string) {
      const response = await fetch(`${baseUrl}?action=list&path=${encodeURIComponent(path)}&provider=${provider}`);
      return response.json();
    },

    async getFolderTree(path = '/', depth = 3) {
      const response = await fetch(`${baseUrl}?action=tree&path=${encodeURIComponent(path)}&depth=${depth}&provider=${provider}`);
      return response.json();
    },

    async createDirectory(path: string) {
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'createDirectory', path, provider }),
      });
      return response.json();
    },

    async removeDirectory(path: string, recursive = false) {
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'removeDirectory', path, recursive, provider }),
      });
      return response.json();
    },

    async uploadFile(file: File, remotePath: string) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', remotePath);
      formData.append('provider', provider);

      const response = await fetch(`${baseUrl}/upload`, {
        method: 'POST',
        body: formData,
      });
      return response.json();
    },

    async downloadFile(path: string) {
      const response = await fetch(`${baseUrl}/download?path=${encodeURIComponent(path)}&provider=${provider}`);
      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.error };
      }
      const blob = await response.blob();
      return { success: true, data: blob };
    },

    async deleteFile(path: string) {
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteFile', path, provider }),
      });
      return response.json();
    },

    async renameFile(path: string, newName: string) {
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'renameFile', path, newName, provider }),
      });
      return response.json();
    },

    async renameFolder(path: string, newName: string) {
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'renameFolder', path, newName, provider }),
      });
      return response.json();
    },

    async moveItem(sourcePath: string, destinationPath: string) {
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'moveItem', sourcePath, destinationPath, provider }),
      });
      return response.json();
    },

    async getPreviewUrl(path: string) {
      return `${baseUrl}/preview?path=${encodeURIComponent(path)}&provider=${provider}`;
    },

    async getFileContent(path: string) {
      const response = await fetch(`${baseUrl}/content?path=${encodeURIComponent(path)}&provider=${provider}`);
      const data = await response.json();
      if (data.success) {
        return data.data;
      }
      throw new Error(data.error);
    },

    async getFileMetadata(path: string) {
      const response = await fetch(`${baseUrl}/metadata?path=${encodeURIComponent(path)}&provider=${provider}`);
      return response.json();
    },
  };
}
