#!/usr/bin/env node

/**
 * Storage cleanup after bad runs — does NOT clear LLM / hub disk cache.
 *
 * Order (recommended):
 * 1) Stop buggy services: `kill-all.bat` (Windows) or `kill-all.ps1` / `kill-all.sh`
 * 2) Run this script: `node cleanup-session-state.js` (or `npm run cleanup:state`)
 *
 * Clears: client session trees, hub proxy logs, in-flight promise snapshots, server request snapshots.
 * Intentionally skipped: `ai-integration/storage/cache` (LLM disk cache) — keep commented out.
 */

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

    // Hub promise snapshots (not LLM disk cache)
    'ai-integration/storage/promises',
    // LLM disk cache — do not add: 'ai-integration/storage/cache',

    // Server-side persisted request snapshots (invoke / async)
    'a2a-server/storage/requests',
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

