#!/usr/bin/env tsx
/**
 * Export PostgreSQL tables to separate folders.
 * 1. Clears export dir
 * 2. Exports each table to export/<table_name>/data.json
 * Run: npx tsx scripts/export-db.ts [exportDir]
 * Env: DATABASE_URL
 */

import { Client } from 'pg';
import { rmSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const EXPORT_DIR = process.argv[2] ?? join(process.cwd(), 'export');

async function getTables(client: Client): Promise<string[]> {
  const r = await client.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
  );
  return r.rows.map((row) => row.tablename);
}

async function exportTable(client: Client, table: string, outDir: string) {
  const r = await client.query(`SELECT * FROM "${table}"`);
  const data = r.rows;
  const path = join(outDir, 'data.json');
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`  ${table}: ${data.length} rows → ${path}`);
}

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL required');
    process.exit(1);
  }

  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    const tables = await getTables(client);

    if (existsSync(EXPORT_DIR)) {
      rmSync(EXPORT_DIR, { recursive: true });
      console.log(`Cleared ${EXPORT_DIR}`);
    }
    mkdirSync(EXPORT_DIR, { recursive: true });

    for (const table of tables) {
      const tableDir = join(EXPORT_DIR, table);
      mkdirSync(tableDir, { recursive: true });
      await exportTable(client, table, tableDir);
    }

    console.log(`Done. Exported ${tables.length} tables to ${EXPORT_DIR}`);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
