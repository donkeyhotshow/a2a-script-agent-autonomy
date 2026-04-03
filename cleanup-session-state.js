#!/usr/bin/env node

// Cleanup script: client sessions, server-side logs/promises, AI integration caches.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = __dirname;

/** Recursively remove all contents of a directory but keep the directory itself. */
async function emptyDir(dir) {
  const full = path.resolve(root, dir);
  if (!fs.existsSync(full)) return;

  const entries = await fs.promises.readdir(full, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(full, entry.name);
      if (entry.isDirectory()) {
        await fs.promises.rm(entryPath, { recursive: true, force: true });
      } else {
        await fs.promises.rm(entryPath, { force: true });
      }
    }),
  );
}

async function main() {
  const targets = [
    // Client sessions
    'a2a-client/storage/sessions',

    // AI integration proxy logs (requests, promises, logs)
    'ai-integration/proxy_logs',
    'proxy_logs',

    // AI integration promise and cache storage
    'ai-integration/storage/promises',
    'ai-integration/storage/cache',
  ];

  for (const dir of targets) {
    try {
      await emptyDir(dir);
      // eslint-disable-next-line no-console
      console.log(`OK  ${dir}`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`SKIP ${dir}: ${(err && err.message) || err}`);
    }
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

