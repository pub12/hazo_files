/**
 * Database configuration for hazo_files test app
 * Sets up SQLite database and schema for file metadata tracking
 */

import { createHazoConnect, createCrudService, SqliteAdapter } from 'hazo_connect/server';
import type { HazoConnectAdapter, CrudService } from 'hazo_connect/server';
import type { FileMetadataRecord } from 'hazo_files';
import path from 'path';

// Singleton instance
let adapter: HazoConnectAdapter | null = null;
let crudService: CrudService<FileMetadataRecord> | null = null;
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
  storage_type TEXT NOT NULL CHECK(storage_type IN ('local', 'google_drive'))
);

CREATE INDEX IF NOT EXISTS idx_hazo_files_path ON hazo_files(file_path, storage_type);
CREATE INDEX IF NOT EXISTS idx_hazo_files_storage ON hazo_files(storage_type);
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
 * Initialize the database schema
 */
async function initializeSchema(sqliteAdapter: SqliteAdapter): Promise<void> {
  // Execute raw SQL to create schema
  // SqliteAdapter has a rawQuery method we can use
  const statements = HAZO_FILES_SCHEMA
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    await sqliteAdapter.rawQuery(statement + ';', { method: 'POST' });
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

  initialized = true;
  return crudService;
}

/**
 * Get the initialized CRUD service
 * Throws if not initialized
 */
export function getCrudService(): CrudService<FileMetadataRecord> {
  if (!crudService) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return crudService;
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
  initialized = false;
}
