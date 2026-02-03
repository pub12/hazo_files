/**
 * Naming convention types for hazo_files
 *
 * Types for managing naming conventions that define how files and folders
 * should be named. Naming conventions can be scoped to organizational units
 * via scope_id (linking to hazo_scopes from hazo_auth).
 */

import type { NamingRuleSchema, NamingVariable } from './naming';

/**
 * Type of naming convention
 * - 'file': Primarily for file naming
 * - 'folder': Primarily for folder naming
 * - 'both': Used for both file and folder naming
 */
export type NamingConventionType = 'file' | 'folder' | 'both';

/**
 * Record stored in the hazo_files_naming database table
 * Extends Record<string, unknown> for compatibility with hazo_connect CrudService
 */
export interface NamingConventionRecord extends Record<string, unknown> {
  /** Unique identifier (UUID) */
  id: string;
  /** Scope ID linking to hazo_scopes - organizational unit (null for global) */
  scope_id: string | null;
  /** Display name for the naming convention */
  naming_title: string;
  /** Primary type: 'file', 'folder', or 'both' */
  naming_type: NamingConventionType;
  /** JSON string: NamingRuleSchema (contains filePattern + folderPattern) */
  naming_value: string;
  /** ISO timestamp when record was created */
  created_at: string;
  /** ISO timestamp of last modification */
  changed_at: string;
  /** JSON string: NamingVariable[] - user-defined variables */
  variables: string;
}

/**
 * Input for creating a new naming convention record
 */
export interface NamingConventionInput {
  /** Display name for the naming convention */
  naming_title: string;
  /** Primary type: 'file', 'folder', or 'both' */
  naming_type: NamingConventionType;
  /** Naming rule schema with file and folder patterns */
  naming_value: NamingRuleSchema;
  /** Scope ID linking to hazo_scopes (null/undefined for global) */
  scope_id?: string | null;
  /** User-defined variables for this convention */
  variables?: NamingVariable[];
}

/**
 * Input for updating an existing naming convention
 */
export interface NamingConventionUpdate {
  /** Display name for the naming convention */
  naming_title?: string;
  /** Primary type: 'file', 'folder', or 'both' */
  naming_type?: NamingConventionType;
  /** Naming rule schema with file and folder patterns */
  naming_value?: NamingRuleSchema;
  /** Scope ID linking to hazo_scopes (null for global) */
  scope_id?: string | null;
  /** User-defined variables for this convention */
  variables?: NamingVariable[];
}

/**
 * Parsed naming convention with typed fields
 * Used when working with naming conventions in code
 */
export interface ParsedNamingConvention {
  /** Unique identifier */
  id: string;
  /** Scope ID (null for global) */
  scope_id: string | null;
  /** Display name */
  naming_title: string;
  /** Primary type */
  naming_type: NamingConventionType;
  /** Parsed naming rule schema */
  schema: NamingRuleSchema;
  /** ISO timestamp when created */
  created_at: string;
  /** ISO timestamp of last modification */
  changed_at: string;
  /** Parsed user-defined variables */
  variables: NamingVariable[];
}

/**
 * Options for listing naming conventions
 */
export interface ListNamingConventionsOptions {
  /** Filter by scope ID (null for global only, undefined for all) */
  scope_id?: string | null;
  /** Filter by type */
  naming_type?: NamingConventionType;
  /** Include global conventions when filtering by scope_id */
  includeGlobal?: boolean;
}
