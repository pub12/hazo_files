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
  storage_type TEXT NOT NULL
)`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_hazo_files_path ON hazo_files (file_path)',
      'CREATE INDEX IF NOT EXISTS idx_hazo_files_storage ON hazo_files (storage_type)',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_hazo_files_path_storage ON hazo_files (file_path, storage_type)',
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
  storage_type TEXT NOT NULL
)`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_hazo_files_path ON hazo_files (file_path)',
      'CREATE INDEX IF NOT EXISTS idx_hazo_files_storage ON hazo_files (storage_type)',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_hazo_files_path_storage ON hazo_files (file_path, storage_type)',
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
