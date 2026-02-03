/**
 * Naming Convention Service
 * Handles database operations for managing naming conventions
 * Uses hazo_connect for database interactions
 */

import type {
  NamingConventionRecord,
  NamingConventionInput,
  NamingConventionUpdate,
  ParsedNamingConvention,
  ListNamingConventionsOptions,
  NamingConventionType,
} from '../types/naming-convention';
import type { NamingRuleSchema, NamingVariable } from '../types/naming';
import type { CrudServiceLike, MetadataLogger } from './file-metadata-service';

/**
 * Options for NamingConventionService
 */
export interface NamingConventionServiceOptions {
  /** Table name (default: 'hazo_files_naming') */
  tableName?: string;
  /** Logger for diagnostics */
  logger?: MetadataLogger;
  /** Log errors to console (default: true) */
  logErrors?: boolean;
}

/**
 * Naming Convention Service
 * Provides CRUD operations for naming conventions stored in the database
 *
 * @example
 * ```typescript
 * import { createHazoConnect, createCrudService } from 'hazo_connect/server';
 * import {
 *   NamingConventionService,
 *   HAZO_FILES_NAMING_TABLE_SCHEMA
 * } from 'hazo_files';
 *
 * // Create CRUD service
 * const crud = createCrudService(adapter, HAZO_FILES_NAMING_TABLE_SCHEMA.tableName);
 *
 * // Create naming service
 * const namingService = new NamingConventionService(crud);
 *
 * // Create a naming convention
 * const convention = await namingService.create({
 *   naming_title: 'Tax Documents',
 *   naming_type: 'both',
 *   naming_value: {
 *     version: 1,
 *     filePattern: [...],
 *     folderPattern: [...]
 *   },
 *   variables: [
 *     { variable_name: 'client_id', description: 'Client ID', example_value: 'ACME' }
 *   ]
 * });
 * ```
 */
export class NamingConventionService {
  private crud: CrudServiceLike<NamingConventionRecord>;
  private logger?: MetadataLogger;
  private logErrors: boolean;

  constructor(
    crudService: CrudServiceLike<NamingConventionRecord>,
    options: NamingConventionServiceOptions = {}
  ) {
    this.crud = crudService;
    this.logger = options.logger;
    this.logErrors = options.logErrors !== false;
  }

  /**
   * Generate ISO timestamp
   */
  private now(): string {
    return new Date().toISOString();
  }

  /**
   * Log an error if logging is enabled
   */
  private logError(operation: string, error: unknown): void {
    if (this.logErrors) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger?.error?.(`NamingConventionService.${operation} failed`, { error: message });
      if (!this.logger) {
        console.error(`[NamingConventionService] ${operation} failed:`, message);
      }
    }
  }

  /**
   * Parse a database record into a typed naming convention
   */
  parseRecord(record: NamingConventionRecord): ParsedNamingConvention {
    let schema: NamingRuleSchema;
    let variables: NamingVariable[];

    try {
      schema = JSON.parse(record.naming_value);
    } catch {
      schema = { version: 1, filePattern: [], folderPattern: [] };
    }

    try {
      variables = JSON.parse(record.variables || '[]');
    } catch {
      variables = [];
    }

    return {
      id: record.id,
      scope_id: record.scope_id,
      naming_title: record.naming_title,
      naming_type: record.naming_type as NamingConventionType,
      schema,
      created_at: record.created_at,
      changed_at: record.changed_at,
      variables,
    };
  }

  /**
   * Create a new naming convention
   */
  async create(input: NamingConventionInput): Promise<NamingConventionRecord | null> {
    try {
      const timestamp = this.now();
      const record: Omit<NamingConventionRecord, 'id'> = {
        scope_id: input.scope_id ?? null,
        naming_title: input.naming_title,
        naming_type: input.naming_type,
        naming_value: JSON.stringify(input.naming_value),
        created_at: timestamp,
        changed_at: timestamp,
        variables: JSON.stringify(input.variables || []),
      };

      const results = await this.crud.insert(record as Partial<NamingConventionRecord>);
      this.logger?.debug?.('Created naming convention', { title: input.naming_title });
      return results[0] || null;
    } catch (error) {
      this.logError('create', error);
      return null;
    }
  }

  /**
   * Get a naming convention by ID
   */
  async getById(id: string): Promise<NamingConventionRecord | null> {
    try {
      const results = await this.crud.findBy({ id });
      return results[0] || null;
    } catch (error) {
      this.logError('getById', error);
      return null;
    }
  }

  /**
   * Get a parsed naming convention by ID
   */
  async getByIdParsed(id: string): Promise<ParsedNamingConvention | null> {
    const record = await this.getById(id);
    if (!record) return null;
    return this.parseRecord(record);
  }

  /**
   * Get all naming conventions for a scope
   * If scopeId is null, returns only global conventions
   * If includeGlobal is true, also includes global conventions
   */
  async getByScope(
    scopeId?: string | null,
    includeGlobal = true
  ): Promise<NamingConventionRecord[]> {
    try {
      const all = await this.crud.list();

      if (scopeId === undefined) {
        // Return all conventions
        return all;
      }

      if (scopeId === null) {
        // Return only global conventions
        return all.filter((r) => r.scope_id === null);
      }

      // Return scope-specific conventions
      return all.filter((r) => {
        if (r.scope_id === scopeId) return true;
        if (includeGlobal && r.scope_id === null) return true;
        return false;
      });
    } catch (error) {
      this.logError('getByScope', error);
      return [];
    }
  }

  /**
   * Update a naming convention
   */
  async update(
    id: string,
    input: NamingConventionUpdate
  ): Promise<NamingConventionRecord | null> {
    try {
      const patch: Partial<NamingConventionRecord> = {
        changed_at: this.now(),
      };

      if (input.naming_title !== undefined) {
        patch.naming_title = input.naming_title;
      }
      if (input.naming_type !== undefined) {
        patch.naming_type = input.naming_type;
      }
      if (input.naming_value !== undefined) {
        patch.naming_value = JSON.stringify(input.naming_value);
      }
      if (input.scope_id !== undefined) {
        patch.scope_id = input.scope_id;
      }
      if (input.variables !== undefined) {
        patch.variables = JSON.stringify(input.variables);
      }

      const results = await this.crud.updateById(id, patch);
      this.logger?.debug?.('Updated naming convention', { id });
      return results[0] || null;
    } catch (error) {
      this.logError('update', error);
      return null;
    }
  }

  /**
   * Delete a naming convention
   */
  async delete(id: string): Promise<boolean> {
    try {
      await this.crud.deleteById(id);
      this.logger?.debug?.('Deleted naming convention', { id });
      return true;
    } catch (error) {
      this.logError('delete', error);
      return false;
    }
  }

  /**
   * List all naming conventions
   */
  async list(options?: ListNamingConventionsOptions): Promise<NamingConventionRecord[]> {
    try {
      const all = await this.crud.list();

      if (!options) {
        return all;
      }

      return all.filter((r) => {
        // Filter by type
        if (options.naming_type && r.naming_type !== options.naming_type) {
          return false;
        }

        // Filter by scope
        if (options.scope_id !== undefined) {
          if (options.scope_id === null) {
            // Only global
            return r.scope_id === null;
          }
          // Scope-specific, optionally including global
          if (r.scope_id === options.scope_id) return true;
          if (options.includeGlobal && r.scope_id === null) return true;
          return false;
        }

        return true;
      });
    } catch (error) {
      this.logError('list', error);
      return [];
    }
  }

  /**
   * List all naming conventions as parsed objects
   */
  async listParsed(options?: ListNamingConventionsOptions): Promise<ParsedNamingConvention[]> {
    const records = await this.list(options);
    return records.map((r) => this.parseRecord(r));
  }

  /**
   * Get the schema from a record
   */
  parseSchema(record: NamingConventionRecord): NamingRuleSchema {
    try {
      return JSON.parse(record.naming_value);
    } catch {
      return { version: 1, filePattern: [], folderPattern: [] };
    }
  }

  /**
   * Get the variables from a record
   */
  parseVariables(record: NamingConventionRecord): NamingVariable[] {
    try {
      return JSON.parse(record.variables || '[]');
    } catch {
      return [];
    }
  }

  /**
   * Check if a naming convention with the given title exists in the scope
   */
  async existsWithTitle(
    naming_title: string,
    scope_id?: string | null
  ): Promise<boolean> {
    try {
      const all = await this.crud.list();
      return all.some(
        (r) =>
          r.naming_title === naming_title &&
          (scope_id === undefined || r.scope_id === scope_id)
      );
    } catch (error) {
      this.logError('existsWithTitle', error);
      return false;
    }
  }

  /**
   * Duplicate an existing naming convention
   */
  async duplicate(
    id: string,
    newTitle?: string
  ): Promise<NamingConventionRecord | null> {
    try {
      const original = await this.getById(id);
      if (!original) {
        return null;
      }

      const timestamp = this.now();
      const record: Omit<NamingConventionRecord, 'id'> = {
        scope_id: original.scope_id,
        naming_title: newTitle || `${original.naming_title} (Copy)`,
        naming_type: original.naming_type,
        naming_value: original.naming_value,
        created_at: timestamp,
        changed_at: timestamp,
        variables: original.variables,
      };

      const results = await this.crud.insert(record as Partial<NamingConventionRecord>);
      this.logger?.debug?.('Duplicated naming convention', { originalId: id });
      return results[0] || null;
    } catch (error) {
      this.logError('duplicate', error);
      return null;
    }
  }
}

/**
 * Create a NamingConventionService instance
 */
export function createNamingConventionService(
  crudService: CrudServiceLike<NamingConventionRecord>,
  options?: NamingConventionServiceOptions
): NamingConventionService {
  return new NamingConventionService(crudService, options);
}
