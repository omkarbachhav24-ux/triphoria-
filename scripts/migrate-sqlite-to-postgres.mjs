// One-off data migration: local SQLite (data/triphoria.db) -> Supabase Postgres.
//
// Usage:
//   node --env-file-if-exists=.env scripts/migrate-sqlite-to-postgres.mjs
//
// Requires:
//   - DATABASE_URL pointing at the target Postgres (schema already created;
//     it is created automatically the first time the API boots, or run the
//     statements in server/schema.sql manually in the Supabase SQL editor).
//   - A readable data/triphoria.db from the previous SQLite deployment.
//
// Safe to re-run: every row is inserted with ON CONFLICT (pk) DO NOTHING.
// Sessions are skipped by default (they expire anyway); pass --with-sessions
// to include them.

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlitePath = path.resolve(__dirname, '../data/triphoria.db');
const withSessions = process.argv.includes('--with-sessions');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Aborting.');
  process.exit(1);
}
if (!fs.existsSync(sqlitePath)) {
  console.error(`SQLite source not found at ${sqlitePath}. Nothing to migrate.`);
  process.exit(1);
}

// Insertion order respects foreign keys.
const TABLES = [
  'users',
  ...(withSessions ? ['sessions'] : []),
  'orders',
  'order_files',
  'output_versions',
  'storage_lifecycle',
  'audit_events',
  'cms_projects',
  'cms_social',
  'idempotency_records'
];

// Primary key column(s) per table, for ON CONFLICT.
const PK = {
  users: 'id',
  sessions: 'id',
  orders: 'id',
  order_files: 'id',
  output_versions: 'id',
  storage_lifecycle: 'order_id',
  audit_events: 'id',
  cms_projects: 'id',
  cms_social: 'id',
  idempotency_records: 'key'
};

const sqlite = new DatabaseSync(sqlitePath, { readOnly: true });
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: /(localhost|127\.0\.0\.1)/.test(process.env.DATABASE_URL) ? false : { rejectUnauthorized: false },
  max: 4
});

async function migrateTable(table) {
  let rows;
  try {
    rows = sqlite.prepare(`SELECT * FROM ${table}`).all();
  } catch (err) {
    console.warn(`  - ${table}: not present in source, skipped`);
    return;
  }
  if (rows.length === 0) {
    console.log(`  - ${table}: 0 rows`);
    return;
  }

  const cols = Object.keys(rows[0]);
  const colList = cols.map((c) => `"${c}"`).join(', ');
  let inserted = 0;

  for (const row of rows) {
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
    const values = cols.map((c) => row[c]);
    const sql = `INSERT INTO ${table} (${colList}) VALUES (${placeholders}) ON CONFLICT ("${PK[table]}") DO NOTHING`;
    const result = await pool.query(sql, values);
    inserted += result.rowCount;
  }
  console.log(`  - ${table}: ${rows.length} read, ${inserted} inserted (${rows.length - inserted} already present)`);
}

(async () => {
  console.log(`Migrating ${sqlitePath} -> ${process.env.DATABASE_URL.replace(/:[^:@/]+@/, ':****@')}`);
  try {
    for (const table of TABLES) {
      await migrateTable(table);
    }
    console.log('Migration complete.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
    sqlite.close();
  }
})();
