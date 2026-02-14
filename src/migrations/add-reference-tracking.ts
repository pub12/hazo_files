/**
 * Migration: Add Reference Tracking (V2)
 *
 * Adds reference tracking columns to an existing hazo_files table.
 * Idempotent — safe to run multiple times.
 */

import { HAZO_FILES_MIGRATION_V2, getMigrationForTable } from '../schema';

/**
 * Executor interface for running SQL statements.
 * Compatible with common database adapters (better-sqlite3, pg, hazo_connect).
 */
export interface MigrationExecutor {
  run(sql: string): Promise<void> | void;
}

/**
 * Run the V2 migration: add reference tracking columns and indexes.
 *
 * @param executor - Object with a `run(sql)` method
 * @param dbType - Database type ('sqlite' | 'postgres')
 * @param tableName - Custom table name (defaults to 'hazo_files')
 *
 * @example
 * ```typescript
 * import { migrateToV2 } from 'hazo_files';
 *
 * // SQLite with better-sqlite3
 * await migrateToV2({ run: (sql) => db.exec(sql) }, 'sqlite');
 *
 * // PostgreSQL with pg
 * await migrateToV2({ run: (sql) => client.query(sql) }, 'postgres');
 * ```
 */
export async function migrateToV2(
  executor: MigrationExecutor,
  dbType: 'sqlite' | 'postgres',
  tableName?: string
): Promise<void> {
  const migration = tableName
    ? getMigrationForTable(tableName, dbType)
    : HAZO_FILES_MIGRATION_V2[dbType];

  // Add new columns
  for (const stmt of migration.alterStatements) {
    try {
      await executor.run(stmt);
    } catch {
      // Column already exists — expected for idempotent runs (especially SQLite)
    }
  }

  // Create indexes
  for (const idx of migration.indexes) {
    await executor.run(idx);
  }
}

/**
 * Backfill V2 defaults for existing records that have NULL V2 columns.
 *
 * @param executor - Object with a `run(sql)` method
 * @param dbType - Database type ('sqlite' | 'postgres')
 * @param tableName - Custom table name (defaults to 'hazo_files')
 */
export async function backfillV2Defaults(
  executor: MigrationExecutor,
  dbType: 'sqlite' | 'postgres',
  tableName?: string
): Promise<void> {
  const migration = tableName
    ? getMigrationForTable(tableName, dbType)
    : HAZO_FILES_MIGRATION_V2[dbType];

  await executor.run(migration.backfill);
}
