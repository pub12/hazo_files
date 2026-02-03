/**
 * Database Schema Exports for hazo_files
 *
 * Provides DDL statements for creating the hazo_files table in different databases.
 * Consuming applications can use these to set up their database schema.
 *
 * @example
 * ```typescript
 * import { HAZO_FILES_TABLE_SCHEMA } from 'hazo_files';
 *
 * // For SQLite
 * await db.run(HAZO_FILES_TABLE_SCHEMA.sqlite.ddl);
 * for (const idx of HAZO_FILES_TABLE_SCHEMA.sqlite.indexes) {
 *   await db.run(idx);
 * }
 *
 * // For PostgreSQL
 * await client.query(HAZO_FILES_TABLE_SCHEMA.postgres.ddl);
 * for (const idx of HAZO_FILES_TABLE_SCHEMA.postgres.indexes) {
 *   await client.query(idx);
 * }
 * ```
 */

/**
 * Column definitions for the hazo_files table
 */
export interface HazoFilesColumnDefinitions {
  /** Primary key (UUID) */
  id: 'TEXT' | 'UUID';
  /** File or folder name */
  filename: 'TEXT';
  /** MIME type for files, 'folder' for directories */
  file_type: 'TEXT';
  /** Custom metadata as JSON string */
  file_data: 'TEXT';
  /** ISO timestamp when record was created */
  created_at: 'TEXT' | 'TIMESTAMP';
  /** ISO timestamp of last modification */
  changed_at: 'TEXT' | 'TIMESTAMP';
  /** Virtual path in storage */
  file_path: 'TEXT';
  /** Storage provider type ('local' | 'google_drive') */
  storage_type: 'TEXT';
  /** xxHash hash of file content for change detection */
  file_hash: 'TEXT';
  /** File size in bytes */
  file_size: 'INTEGER' | 'BIGINT';
  /** ISO timestamp when file content last changed */
  file_changed_at: 'TEXT' | 'TIMESTAMP';
}

/**
 * Schema definition for a specific database type
 */
export interface DatabaseSchemaDefinition {
  /** CREATE TABLE statement */
  ddl: string;
  /** CREATE INDEX statements */
  indexes: string[];
}

/**
 * Complete schema definition for hazo_files table
 */
export interface HazoFilesTableSchema {
  /** Default table name */
  tableName: string;
  /** SQLite-specific DDL */
  sqlite: DatabaseSchemaDefinition;
  /** PostgreSQL-specific DDL */
  postgres: DatabaseSchemaDefinition;
  /** Column names for reference */
  columns: readonly string[];
}

/**
 * Default table name for hazo_files metadata
 */
export const HAZO_FILES_DEFAULT_TABLE_NAME = 'hazo_files';

/**
 * DDL schema for the hazo_files table.
 *
 * Use these DDL statements to create the required database table
 * in consuming applications.
 *
 * @example Using with hazo_connect
 * ```typescript
 * import { createHazoConnect, createCrudService } from 'hazo_connect/server';
 * import { createFileMetadataService, HAZO_FILES_TABLE_SCHEMA } from 'hazo_files';
 * import type { FileMetadataRecord } from 'hazo_files';
 *
 * // 1. Create table during app setup
 * await db.run(HAZO_FILES_TABLE_SCHEMA.sqlite.ddl);
 * for (const idx of HAZO_FILES_TABLE_SCHEMA.sqlite.indexes) {
 *   await db.run(idx);
 * }
 *
 * // 2. Create hazo_connect CRUD service
 * const adapter = createHazoConnect({ type: 'sqlite', database_path: './data.db' });
 * const crud = createCrudService<FileMetadataRecord>(adapter, HAZO_FILES_TABLE_SCHEMA.tableName);
 *
 * // 3. Pass directly to hazo_files - no adapter needed!
 * const metadataService = createFileMetadataService(crud);
 * ```
 */
export const HAZO_FILES_TABLE_SCHEMA: HazoFilesTableSchema = {
  tableName: HAZO_FILES_DEFAULT_TABLE_NAME,

  sqlite: {
    ddl: `CREATE TABLE IF NOT EXISTS hazo_files (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_data TEXT DEFAULT '{}',
  created_at TEXT NOT NULL,
  changed_at TEXT NOT NULL,
  file_path TEXT NOT NULL,
  storage_type TEXT NOT NULL,
  file_hash TEXT,
  file_size INTEGER,
  file_changed_at TEXT
)`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_hazo_files_path ON hazo_files (file_path)',
      'CREATE INDEX IF NOT EXISTS idx_hazo_files_storage ON hazo_files (storage_type)',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_hazo_files_path_storage ON hazo_files (file_path, storage_type)',
      'CREATE INDEX IF NOT EXISTS idx_hazo_files_hash ON hazo_files (file_hash)',
    ],
  },

  postgres: {
    ddl: `CREATE TABLE IF NOT EXISTS hazo_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_data TEXT DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  file_path TEXT NOT NULL,
  storage_type TEXT NOT NULL,
  file_hash TEXT,
  file_size BIGINT,
  file_changed_at TIMESTAMP WITH TIME ZONE
)`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_hazo_files_path ON hazo_files (file_path)',
      'CREATE INDEX IF NOT EXISTS idx_hazo_files_storage ON hazo_files (storage_type)',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_hazo_files_path_storage ON hazo_files (file_path, storage_type)',
      'CREATE INDEX IF NOT EXISTS idx_hazo_files_hash ON hazo_files (file_hash)',
    ],
  },

  columns: [
    'id',
    'filename',
    'file_type',
    'file_data',
    'created_at',
    'changed_at',
    'file_path',
    'storage_type',
    'file_hash',
    'file_size',
    'file_changed_at',
  ] as const,
};

/**
 * Get DDL for a custom table name
 *
 * @param tableName - Custom table name to use
 * @param dbType - Database type ('sqlite' | 'postgres')
 * @returns DDL and index statements with the custom table name
 */
export function getSchemaForTable(
  tableName: string,
  dbType: 'sqlite' | 'postgres'
): DatabaseSchemaDefinition {
  const schema = HAZO_FILES_TABLE_SCHEMA[dbType];
  const defaultName = HAZO_FILES_TABLE_SCHEMA.tableName;

  return {
    ddl: schema.ddl.replace(new RegExp(defaultName, 'g'), tableName),
    indexes: schema.indexes.map((idx) =>
      idx.replace(new RegExp(defaultName, 'g'), tableName)
    ),
  };
}

// ============================================
// Naming Conventions Table Schema
// ============================================

/**
 * Default table name for naming conventions
 */
export const HAZO_FILES_NAMING_DEFAULT_TABLE_NAME = 'hazo_files_naming';

/**
 * Column definitions for the hazo_files_naming table
 */
export interface HazoFilesNamingColumnDefinitions {
  /** Primary key (UUID) */
  id: 'TEXT' | 'UUID';
  /** Scope ID linking to hazo_scopes (from hazo_auth) - organizational unit */
  scope_id: 'TEXT' | 'UUID';
  /** Display name for the naming convention */
  naming_title: 'TEXT';
  /** Primary type: 'file', 'folder', or 'both' */
  naming_type: 'TEXT';
  /** JSON: NamingRuleSchema (contains filePattern + folderPattern) */
  naming_value: 'TEXT';
  /** ISO timestamp when record was created */
  created_at: 'TEXT' | 'TIMESTAMP';
  /** ISO timestamp of last modification */
  changed_at: 'TEXT' | 'TIMESTAMP';
  /** JSON: NamingVariable[] - user-defined variables */
  variables: 'TEXT';
}

/**
 * Schema definition for hazo_files_naming table
 */
export interface HazoFilesNamingTableSchema {
  /** Default table name */
  tableName: string;
  /** SQLite-specific DDL */
  sqlite: DatabaseSchemaDefinition;
  /** PostgreSQL-specific DDL */
  postgres: DatabaseSchemaDefinition;
  /** Column names for reference */
  columns: readonly string[];
}

/**
 * DDL schema for the hazo_files_naming table.
 *
 * This table stores naming conventions that define how files and folders
 * should be named. Each convention can be scoped to a specific organizational
 * unit (via scope_id linking to hazo_scopes from hazo_auth).
 *
 * @example Using with hazo_connect
 * ```typescript
 * import { createHazoConnect, createCrudService } from 'hazo_connect/server';
 * import { HAZO_FILES_NAMING_TABLE_SCHEMA } from 'hazo_files';
 * import type { NamingConventionRecord } from 'hazo_files';
 *
 * // 1. Create table during app setup
 * await db.run(HAZO_FILES_NAMING_TABLE_SCHEMA.sqlite.ddl);
 * for (const idx of HAZO_FILES_NAMING_TABLE_SCHEMA.sqlite.indexes) {
 *   await db.run(idx);
 * }
 *
 * // 2. Create CRUD service
 * const crud = createCrudService<NamingConventionRecord>(
 *   adapter,
 *   HAZO_FILES_NAMING_TABLE_SCHEMA.tableName
 * );
 * ```
 */
export const HAZO_FILES_NAMING_TABLE_SCHEMA: HazoFilesNamingTableSchema = {
  tableName: HAZO_FILES_NAMING_DEFAULT_TABLE_NAME,

  sqlite: {
    ddl: `CREATE TABLE IF NOT EXISTS hazo_files_naming (
  id TEXT PRIMARY KEY,
  scope_id TEXT,
  naming_title TEXT NOT NULL,
  naming_type TEXT NOT NULL CHECK(naming_type IN ('file', 'folder', 'both')),
  naming_value TEXT NOT NULL,
  created_at TEXT NOT NULL,
  changed_at TEXT NOT NULL,
  variables TEXT DEFAULT '[]'
)`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_hazo_files_naming_scope ON hazo_files_naming (scope_id)',
      'CREATE INDEX IF NOT EXISTS idx_hazo_files_naming_type ON hazo_files_naming (naming_type)',
    ],
  },

  postgres: {
    ddl: `CREATE TABLE IF NOT EXISTS hazo_files_naming (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_id UUID,
  naming_title TEXT NOT NULL,
  naming_type TEXT NOT NULL CHECK(naming_type IN ('file', 'folder', 'both')),
  naming_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  variables TEXT DEFAULT '[]'
)`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_hazo_files_naming_scope ON hazo_files_naming (scope_id)',
      'CREATE INDEX IF NOT EXISTS idx_hazo_files_naming_type ON hazo_files_naming (naming_type)',
    ],
  },

  columns: [
    'id',
    'scope_id',
    'naming_title',
    'naming_type',
    'naming_value',
    'created_at',
    'changed_at',
    'variables',
  ] as const,
};

/**
 * Get DDL for a custom naming table name
 */
export function getNamingSchemaForTable(
  tableName: string,
  dbType: 'sqlite' | 'postgres'
): DatabaseSchemaDefinition {
  const schema = HAZO_FILES_NAMING_TABLE_SCHEMA[dbType];
  const defaultName = HAZO_FILES_NAMING_TABLE_SCHEMA.tableName;

  return {
    ddl: schema.ddl.replace(new RegExp(defaultName, 'g'), tableName),
    indexes: schema.indexes.map((idx) =>
      idx.replace(new RegExp(defaultName, 'g'), tableName)
    ),
  };
}
