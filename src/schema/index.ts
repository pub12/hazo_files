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
  /** JSON string of FileRef[] - reference tracking (V2) */
  file_refs: 'TEXT';
  /** Number of active references (V2) */
  ref_count: 'INTEGER';
  /** File status: active, orphaned, soft_deleted, missing (V2) */
  status: 'TEXT';
  /** Scope ID for organizational grouping (V2) */
  scope_id: 'TEXT' | 'UUID';
  /** User who uploaded the file (V2) */
  uploaded_by: 'TEXT' | 'UUID';
  /** ISO timestamp when storage was last verified (V2) */
  storage_verified_at: 'TEXT' | 'TIMESTAMP';
  /** ISO timestamp when file was soft-deleted (V2) */
  deleted_at: 'TEXT' | 'TIMESTAMP';
  /** Original filename at upload time (V2) */
  original_filename: 'TEXT';
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
  file_changed_at TEXT,
  file_refs TEXT DEFAULT '[]',
  ref_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  scope_id TEXT,
  uploaded_by TEXT,
  storage_verified_at TEXT,
  deleted_at TEXT,
  original_filename TEXT
)`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_hazo_files_path ON hazo_files (file_path)',
      'CREATE INDEX IF NOT EXISTS idx_hazo_files_storage ON hazo_files (storage_type)',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_hazo_files_path_storage ON hazo_files (file_path, storage_type)',
      'CREATE INDEX IF NOT EXISTS idx_hazo_files_hash ON hazo_files (file_hash)',
      'CREATE INDEX IF NOT EXISTS idx_hazo_files_status ON hazo_files (status)',
      'CREATE INDEX IF NOT EXISTS idx_hazo_files_scope ON hazo_files (scope_id)',
      'CREATE INDEX IF NOT EXISTS idx_hazo_files_ref_count ON hazo_files (ref_count)',
      'CREATE INDEX IF NOT EXISTS idx_hazo_files_deleted ON hazo_files (deleted_at)',
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
  file_changed_at TIMESTAMP WITH TIME ZONE,
  file_refs TEXT DEFAULT '[]',
  ref_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  scope_id UUID,
  uploaded_by UUID,
  storage_verified_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  original_filename TEXT
)`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_hazo_files_path ON hazo_files (file_path)',
      'CREATE INDEX IF NOT EXISTS idx_hazo_files_storage ON hazo_files (storage_type)',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_hazo_files_path_storage ON hazo_files (file_path, storage_type)',
      'CREATE INDEX IF NOT EXISTS idx_hazo_files_hash ON hazo_files (file_hash)',
      'CREATE INDEX IF NOT EXISTS idx_hazo_files_status ON hazo_files (status)',
      'CREATE INDEX IF NOT EXISTS idx_hazo_files_scope ON hazo_files (scope_id)',
      'CREATE INDEX IF NOT EXISTS idx_hazo_files_ref_count ON hazo_files (ref_count)',
      'CREATE INDEX IF NOT EXISTS idx_hazo_files_deleted ON hazo_files (deleted_at)',
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
    'file_refs',
    'ref_count',
    'status',
    'scope_id',
    'uploaded_by',
    'storage_verified_at',
    'deleted_at',
    'original_filename',
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
// V2 Migration (Reference Tracking)
// ============================================

/**
 * Migration schema for adding V2 reference tracking columns to existing tables.
 * Idempotent — safe to run multiple times (uses IF NOT EXISTS for indexes,
 * and ALTER TABLE ADD COLUMN is ignored if column exists in SQLite).
 *
 * For PostgreSQL, columns are added with IF NOT EXISTS (PG 9.6+).
 *
 * @example
 * ```typescript
 * import { HAZO_FILES_MIGRATION_V2 } from 'hazo_files';
 *
 * // SQLite
 * for (const stmt of HAZO_FILES_MIGRATION_V2.sqlite.alterStatements) {
 *   try { await db.run(stmt); } catch { /* column already exists *\/ }
 * }
 * for (const idx of HAZO_FILES_MIGRATION_V2.sqlite.indexes) {
 *   await db.run(idx);
 * }
 *
 * // PostgreSQL
 * for (const stmt of HAZO_FILES_MIGRATION_V2.postgres.alterStatements) {
 *   await client.query(stmt);
 * }
 * for (const idx of HAZO_FILES_MIGRATION_V2.postgres.indexes) {
 *   await client.query(idx);
 * }
 * ```
 */
export interface MigrationSchemaDefinition {
  /** ALTER TABLE statements to add new columns */
  alterStatements: string[];
  /** CREATE INDEX statements for new columns */
  indexes: string[];
  /** UPDATE statement to backfill defaults for existing records */
  backfill: string;
}

export interface HazoFilesMigrationV2 {
  /** Default table name */
  tableName: string;
  /** SQLite migration statements */
  sqlite: MigrationSchemaDefinition;
  /** PostgreSQL migration statements */
  postgres: MigrationSchemaDefinition;
  /** New column names added in V2 */
  newColumns: readonly string[];
}

export const HAZO_FILES_MIGRATION_V2: HazoFilesMigrationV2 = {
  tableName: HAZO_FILES_DEFAULT_TABLE_NAME,

  sqlite: {
    alterStatements: [
      "ALTER TABLE hazo_files ADD COLUMN file_refs TEXT DEFAULT '[]'",
      'ALTER TABLE hazo_files ADD COLUMN ref_count INTEGER DEFAULT 0',
      "ALTER TABLE hazo_files ADD COLUMN status TEXT DEFAULT 'active'",
      'ALTER TABLE hazo_files ADD COLUMN scope_id TEXT',
      'ALTER TABLE hazo_files ADD COLUMN uploaded_by TEXT',
      'ALTER TABLE hazo_files ADD COLUMN storage_verified_at TEXT',
      'ALTER TABLE hazo_files ADD COLUMN deleted_at TEXT',
      'ALTER TABLE hazo_files ADD COLUMN original_filename TEXT',
    ],
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_hazo_files_status ON hazo_files (status)',
      'CREATE INDEX IF NOT EXISTS idx_hazo_files_scope ON hazo_files (scope_id)',
      'CREATE INDEX IF NOT EXISTS idx_hazo_files_ref_count ON hazo_files (ref_count)',
      'CREATE INDEX IF NOT EXISTS idx_hazo_files_deleted ON hazo_files (deleted_at)',
    ],
    backfill: `UPDATE hazo_files SET
  file_refs = COALESCE(file_refs, '[]'),
  ref_count = COALESCE(ref_count, 0),
  status = COALESCE(status, 'active')
WHERE file_refs IS NULL OR ref_count IS NULL OR status IS NULL`,
  },

  postgres: {
    alterStatements: [
      "ALTER TABLE hazo_files ADD COLUMN IF NOT EXISTS file_refs TEXT DEFAULT '[]'",
      'ALTER TABLE hazo_files ADD COLUMN IF NOT EXISTS ref_count INTEGER DEFAULT 0',
      "ALTER TABLE hazo_files ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'",
      'ALTER TABLE hazo_files ADD COLUMN IF NOT EXISTS scope_id UUID',
      'ALTER TABLE hazo_files ADD COLUMN IF NOT EXISTS uploaded_by UUID',
      'ALTER TABLE hazo_files ADD COLUMN IF NOT EXISTS storage_verified_at TIMESTAMP WITH TIME ZONE',
      'ALTER TABLE hazo_files ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE',
      'ALTER TABLE hazo_files ADD COLUMN IF NOT EXISTS original_filename TEXT',
    ],
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_hazo_files_status ON hazo_files (status)',
      'CREATE INDEX IF NOT EXISTS idx_hazo_files_scope ON hazo_files (scope_id)',
      'CREATE INDEX IF NOT EXISTS idx_hazo_files_ref_count ON hazo_files (ref_count)',
      'CREATE INDEX IF NOT EXISTS idx_hazo_files_deleted ON hazo_files (deleted_at)',
    ],
    backfill: `UPDATE hazo_files SET
  file_refs = COALESCE(file_refs, '[]'),
  ref_count = COALESCE(ref_count, 0),
  status = COALESCE(status, 'active')
WHERE file_refs IS NULL OR ref_count IS NULL OR status IS NULL`,
  },

  newColumns: [
    'file_refs',
    'ref_count',
    'status',
    'scope_id',
    'uploaded_by',
    'storage_verified_at',
    'deleted_at',
    'original_filename',
  ] as const,
};

/**
 * Get migration statements for a custom table name
 */
export function getMigrationForTable(
  tableName: string,
  dbType: 'sqlite' | 'postgres'
): MigrationSchemaDefinition {
  const migration = HAZO_FILES_MIGRATION_V2[dbType];
  const defaultName = HAZO_FILES_MIGRATION_V2.tableName;

  return {
    alterStatements: migration.alterStatements.map((stmt) =>
      stmt.replace(new RegExp(defaultName, 'g'), tableName)
    ),
    indexes: migration.indexes.map((idx) =>
      idx.replace(new RegExp(defaultName, 'g'), tableName)
    ),
    backfill: migration.backfill.replace(new RegExp(defaultName, 'g'), tableName),
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
