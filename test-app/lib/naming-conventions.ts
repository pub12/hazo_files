/**
 * Naming Conventions API adapter for the test app
 * Creates a client-side API that calls server endpoints
 */

import type { NamingConventionAPI } from 'hazo_files/ui';
import type {
  NamingConventionInput,
  ParsedNamingConvention,
  ListNamingConventionsOptions,
} from 'hazo_files';

/**
 * Create a client-side API adapter for naming conventions
 */
export function createNamingConventionAPI(): NamingConventionAPI {
  const baseUrl = '/api/naming-conventions';

  return {
    async list(options?: ListNamingConventionsOptions): Promise<ParsedNamingConvention[]> {
      const params = new URLSearchParams();
      if (options?.scope_id !== undefined) {
        params.set('scope_id', options.scope_id === null ? '' : options.scope_id);
      }
      if (options?.naming_type) {
        params.set('naming_type', options.naming_type);
      }
      if (options?.includeGlobal !== undefined) {
        params.set('includeGlobal', String(options.includeGlobal));
      }

      const url = params.toString() ? `${baseUrl}?${params}` : baseUrl;
      const response = await fetch(url);
      const data = await response.json();
      return data.success ? data.data : [];
    },

    async getById(id: string): Promise<ParsedNamingConvention | null> {
      const response = await fetch(`${baseUrl}/${id}`);
      const data = await response.json();
      return data.success ? data.data : null;
    },

    async create(input: NamingConventionInput): Promise<ParsedNamingConvention | null> {
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = await response.json();
      return data.success ? data.data : null;
    },

    async update(id: string, input: NamingConventionInput): Promise<ParsedNamingConvention | null> {
      const response = await fetch(`${baseUrl}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = await response.json();
      return data.success ? data.data : null;
    },

    async delete(id: string): Promise<boolean> {
      const response = await fetch(`${baseUrl}/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      return data.success;
    },

    async duplicate(id: string, newTitle?: string): Promise<ParsedNamingConvention | null> {
      const response = await fetch(`${baseUrl}/${id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newTitle }),
      });
      const data = await response.json();
      return data.success ? data.data : null;
    },
  };
}
