/**
 * Migration: Add Content Tag (V3)
 *
 * Adds content_tag column to an existing hazo_files table.
 * Idempotent — safe to run multiple times.
 */

import { HAZO_FILES_MIGRATION_V3, getMigrationV3ForTable } from '../schema';
import type { MigrationExecutor } from './add-reference-tracking';

/**
 * Run the V3 migration: add content_tag column and index.
 *
 * @param executor - Object with a `run(sql)` method
 * @param dbType - Database type ('sqlite' | 'postgres')
 * @param tableName - Custom table name (defaults to 'hazo_files')
 *
 * @example
 * ```typescript
 * import { migrateToV3 } from 'hazo_files';
 *
 * // SQLite with better-sqlite3
 * await migrateToV3({ run: (sql) => db.exec(sql) }, 'sqlite');
 *
 * // PostgreSQL with pg
 * await migrateToV3({ run: (sql) => client.query(sql) }, 'postgres');
 * ```
 */
export async function migrateToV3(
  executor: MigrationExecutor,
  dbType: 'sqlite' | 'postgres',
  tableName?: string
): Promise<void> {
  const migration = tableName
    ? getMigrationV3ForTable(tableName, dbType)
    : HAZO_FILES_MIGRATION_V3[dbType];

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
