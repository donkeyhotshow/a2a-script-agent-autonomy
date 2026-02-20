#!/usr/bin/env tsx
/**
 * Init PostgreSQL: create databases and app user if not exist.
 * Run: npx tsx scripts/init-db.ts
 * Env: PG_ADMIN_URL (default postgresql://postgres:postgres@localhost:5432/postgres)
 *      or use a2a:a2a_secret when docker postgres is up
 */

import { Client } from 'pg';

// PG_ADMIN_URL for superuser (create db/user). Examples:
// postgresql://postgres:51202368Wmid%40@localhost:5432/postgres
// postgresql://a2a:a2a_secret@localhost:5432/postgres  (docker)
const ADMIN_URL = process.env.PG_ADMIN_URL ?? 'postgresql://postgres:51202368Wmid%40@localhost:5432/postgres';
const APP_USER = process.env.PG_APP_USER ?? 'pgadmin';
const APP_PASS = process.env.PG_APP_PASS ?? '51202368Wmid@';
const DB_DEV = 'a2a_server';
const DB_TEST = 'a2a_test';

async function run() {
  const client = new Client({ connectionString: ADMIN_URL });
  try {
    await client.connect();
    console.log('Connected as admin');

    const esc = (s: string) => s.replace(/'/g, "''");
    // Create user if not exists
    const userExists = await client.query(
      `SELECT 1 FROM pg_roles WHERE rolname = $1`,
      [APP_USER]
    );
    if (userExists.rows.length === 0) {
      await client.query(`CREATE ROLE "${APP_USER}" WITH LOGIN PASSWORD '${esc(APP_PASS)}' CREATEDB`);
      console.log(`Created user ${APP_USER}`);
    } else {
      await client.query(`ALTER ROLE "${APP_USER}" WITH PASSWORD '${esc(APP_PASS)}'`);
      await client.query(`ALTER ROLE "${APP_USER}" CREATEDB`);
      console.log(`Updated ${APP_USER}`);
    }

    for (const db of [DB_DEV, DB_TEST]) {
      const dbExists = await client.query(
        `SELECT 1 FROM pg_database WHERE datname = $1`,
        [db]
      );
      if (dbExists.rows.length === 0) {
        await client.query(`CREATE DATABASE "${db}"`);
        console.log(`Created database ${db}`);
      } else {
        console.log(`Database ${db} exists`);
      }

      // Grant connect
      await client.query(`GRANT CONNECT ON DATABASE "${db}" TO "${APP_USER}"`);
      // Connect to db to grant schema
      const base = ADMIN_URL.replace(/\?.*$/, '').replace(/\/[^/]+$/, '');
      const dbClient = new Client({ connectionString: `${base}/${db}` });
      await dbClient.connect();
      await dbClient.query(`GRANT ALL ON SCHEMA public TO "${APP_USER}"`);
      await dbClient.query(`GRANT CREATE ON SCHEMA public TO "${APP_USER}"`);
      await dbClient.query(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "${APP_USER}"`);
      await dbClient.query(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "${APP_USER}"`);
      await dbClient.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "${APP_USER}"`);
      await dbClient.end();
      console.log(`Granted privileges on ${db} to ${APP_USER}`);
    }

    const enc = (s: string) => encodeURIComponent(s).replace(/%2F/g, '/');
    console.log('Done.');
    console.log(`\nDATABASE_URL (dev):  postgresql://${APP_USER}:${enc(APP_PASS)}@localhost:5432/${DB_DEV}?schema=public`);
    console.log(`DATABASE_URL (test): postgresql://${APP_USER}:${enc(APP_PASS)}@localhost:5432/${DB_TEST}?schema=public`);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
