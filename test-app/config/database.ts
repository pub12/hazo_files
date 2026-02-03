/**
 * Database configuration for hazo_files test app
 * Sets up SQLite database and schema for file metadata tracking and naming conventions
 */

import { createHazoConnect, createCrudService, SqliteAdapter } from 'hazo_connect/server';
import type { HazoConnectAdapter, CrudService } from 'hazo_connect/server';
import type { FileMetadataRecord, NamingConventionRecord } from 'hazo_files';
import path from 'path';

// Re-export PromptRecord from hazo_llm_api for consistency
export type { PromptRecord } from 'hazo_llm_api';

// Singleton instances
let adapter: HazoConnectAdapter | null = null;
let crudService: CrudService<FileMetadataRecord> | null = null;
let namingCrudService: CrudService<NamingConventionRecord> | null = null;
let promptsCrudService: CrudService | null = null;
let initialized = false;

/**
 * SQL schema for hazo_files table
 */
const HAZO_FILES_SCHEMA = `
CREATE TABLE IF NOT EXISTS hazo_files (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_data TEXT DEFAULT '{}',
  created_at TEXT NOT NULL,
  changed_at TEXT NOT NULL,
  file_path TEXT NOT NULL,
  storage_type TEXT NOT NULL CHECK(storage_type IN ('local', 'google_drive')),
  file_hash TEXT,
  file_size INTEGER,
  file_changed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_hazo_files_path ON hazo_files(file_path, storage_type);
CREATE INDEX IF NOT EXISTS idx_hazo_files_storage ON hazo_files(storage_type);
CREATE INDEX IF NOT EXISTS idx_hazo_files_hash ON hazo_files(file_hash);
`;

/**
 * SQL schema for hazo_files_naming table
 */
const HAZO_FILES_NAMING_SCHEMA = `
CREATE TABLE IF NOT EXISTS hazo_files_naming (
  id TEXT PRIMARY KEY,
  scope_id TEXT,
  naming_title TEXT NOT NULL,
  naming_type TEXT NOT NULL CHECK(naming_type IN ('file', 'folder', 'both')),
  naming_value TEXT NOT NULL,
  created_at TEXT NOT NULL,
  changed_at TEXT NOT NULL,
  variables TEXT DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_hazo_files_naming_scope ON hazo_files_naming(scope_id);
CREATE INDEX IF NOT EXISTS idx_hazo_files_naming_type ON hazo_files_naming(naming_type);
`;

/**
 * SQL schema for hazo_prompts table
 * Stores LLM prompts for use with hazo_llm_api
 * Schema matches hazo_llm_api's PromptEditor component requirements
 */
const HAZO_PROMPTS_SCHEMA = `
CREATE TABLE IF NOT EXISTS hazo_prompts (
  id TEXT PRIMARY KEY,
  prompt_area TEXT NOT NULL,
  prompt_key TEXT NOT NULL,
  local_1 TEXT DEFAULT NULL,
  local_2 TEXT DEFAULT NULL,
  local_3 TEXT DEFAULT NULL,
  user_id TEXT DEFAULT NULL,
  scope_id TEXT DEFAULT NULL,
  prompt_name TEXT DEFAULT '',
  prompt_text_head TEXT DEFAULT '',
  prompt_text_body TEXT NOT NULL,
  prompt_text_tail TEXT DEFAULT '',
  prompt_variables TEXT DEFAULT '[]',
  prompt_notes TEXT DEFAULT '',
  next_prompt TEXT DEFAULT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  changed_at TEXT DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_hazo_prompts_area_key ON hazo_prompts(prompt_area, prompt_key, local_1, local_2, local_3, user_id, scope_id);
`;

/**
 * Get the database path from environment or default
 */
function getDatabasePath(): string {
  const envPath = process.env.HAZO_CONNECT_SQLITE_PATH || process.env.HAZO_FILES_SQLITE_PATH;
  if (envPath) {
    return path.isAbsolute(envPath) ? envPath : path.resolve(process.cwd(), envPath);
  }
  // Default to ./data/hazo_files.sqlite
  return path.resolve(process.cwd(), 'data', 'hazo_files.sqlite');
}

/**
 * Ensure the data directory exists
 */
async function ensureDataDirectory(dbPath: string): Promise<void> {
  const fs = await import('fs');
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Check if a column exists in a table
 */
async function columnExists(sqliteAdapter: SqliteAdapter, table: string, column: string): Promise<boolean> {
  try {
    const result = await sqliteAdapter.rawQuery(`PRAGMA table_info(${table});`, { method: 'GET' });
    if (result && Array.isArray(result)) {
      return result.some((col: { name?: string }) => col.name === column);
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Initialize the database schema
 */
async function initializeSchema(sqliteAdapter: SqliteAdapter): Promise<void> {
  // Execute raw SQL to create schema
  // SqliteAdapter has a rawQuery method we can use
  const allStatements = [HAZO_FILES_SCHEMA, HAZO_FILES_NAMING_SCHEMA, HAZO_PROMPTS_SCHEMA]
    .join('\n')
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of allStatements) {
    await sqliteAdapter.rawQuery(statement + ';', { method: 'POST' });
  }

  // Migration: Add new columns if they don't exist (for existing databases)
  const columnsToAdd = [
    { table: 'hazo_files', column: 'file_hash', type: 'TEXT' },
    { table: 'hazo_files', column: 'file_size', type: 'INTEGER' },
    { table: 'hazo_files', column: 'file_changed_at', type: 'TEXT' },
  ];

  for (const { table, column, type } of columnsToAdd) {
    const exists = await columnExists(sqliteAdapter, table, column);
    if (!exists) {
      try {
        await sqliteAdapter.rawQuery(`ALTER TABLE ${table} ADD COLUMN ${column} ${type};`, { method: 'POST' });
        console.log(`[database] Added column ${column} to ${table}`);
      } catch (err) {
        // Column might already exist or other error - log and continue
        console.warn(`[database] Could not add column ${column} to ${table}:`, err);
      }
    }
  }
}

/**
 * Initialize the database connection and schema
 * Returns a CRUD service for the hazo_files table
 */
export async function initializeDatabase(): Promise<CrudService<FileMetadataRecord>> {
  if (initialized && crudService) {
    return crudService;
  }

  const dbPath = getDatabasePath();
  await ensureDataDirectory(dbPath);

  // Check if tracking is enabled
  const trackingEnabled = process.env.HAZO_FILES_DB_ENABLED !== 'false';
  if (!trackingEnabled) {
    throw new Error('Database tracking is disabled. Set HAZO_FILES_DB_ENABLED=true to enable.');
  }

  // Create hazo_connect adapter for SQLite
  adapter = createHazoConnect({
    type: 'sqlite',
    sqlite: {
      database_path: dbPath,
    },
  });

  // Initialize schema
  if (adapter instanceof SqliteAdapter) {
    await initializeSchema(adapter);
  }

  // Create CRUD service for hazo_files table
  crudService = createCrudService<FileMetadataRecord>(adapter, 'hazo_files', {
    primaryKeys: ['id'],
    autoId: { enabled: true, column: 'id' },
  });

  // Create CRUD service for hazo_files_naming table
  namingCrudService = createCrudService<NamingConventionRecord>(adapter, 'hazo_files_naming', {
    primaryKeys: ['id'],
    autoId: { enabled: true, column: 'id' },
  });

  // Create CRUD service for hazo_prompts table
  promptsCrudService = createCrudService(adapter, 'hazo_prompts', {
    primaryKeys: ['id'],
    autoId: { enabled: true, column: 'id' },
  });

  initialized = true;
  return crudService;
}

/**
 * Get the initialized CRUD service for files
 * Throws if not initialized
 */
export function getCrudService(): CrudService<FileMetadataRecord> {
  if (!crudService) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return crudService;
}

/**
 * Get the initialized CRUD service for naming conventions
 * Throws if not initialized
 */
export function getNamingCrudService(): CrudService<NamingConventionRecord> {
  if (!namingCrudService) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return namingCrudService;
}

/**
 * Get the initialized CRUD service for prompts
 * Throws if not initialized
 */
export function getPromptsCrudService(): CrudService {
  if (!promptsCrudService) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return promptsCrudService;
}

/**
 * Get the hazo_connect adapter
 * Throws if not initialized
 */
export function getAdapter(): HazoConnectAdapter {
  if (!adapter) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return adapter;
}

/**
 * Check if database is initialized
 */
export function isDatabaseInitialized(): boolean {
  return initialized;
}

/**
 * Check if database tracking is enabled via environment
 */
export function isTrackingEnabled(): boolean {
  return process.env.HAZO_FILES_DB_ENABLED !== 'false';
}

/**
 * Reset the database connection (for testing)
 */
export function resetDatabase(): void {
  adapter = null;
  crudService = null;
  namingCrudService = null;
  promptsCrudService = null;
  initialized = false;
}
