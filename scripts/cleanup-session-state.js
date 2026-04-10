#!/usr/bin/env node

/**
 * Storage cleanup after bad runs — does NOT clear LLM / hub disk cache.
 *
 * Order (recommended):
 * 1) Stop buggy services: `kill-all.bat` (Windows) or `kill-all.ps1` / `kill-all.sh`
 * 2) Run this script: `node cleanup-session-state.js` (or `npm run cleanup:state`)
 *
 * Clears: **all** client session trees under `a2a-client/storage/sessions/*` (no age-based pruning),
 * hub proxy logs, in-flight promise snapshots, server request snapshots.
 * Intentionally skipped: `a2a-ai-hub/storage/cache` (LLM disk cache) — keep commented out.
 *
 * Flags:
 *   --fresh          Also remove Task Monitor JSON (`task-monitor-state.json` + completed ledger); then same dirs as default.
 *                      Use `npm run cleanup:fresh`. After that: `npm run monitor:reset` is redundant for those files.
 *   --sessions-only  Only empty `a2a-client/storage/sessions` (plus `--fresh` monitor files if combined).
 *   --monitor-state  Only remove monitor state JSON files (same paths as `scripts/monitor-reset-state.mjs`).
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

function removeMonitorStateFiles() {
  const stateFile = path.resolve(
    process.env.TASK_MONITOR_STATE_FILE || path.join(root, 'task-monitor-state.json')
  );
  const ledgerEnv = process.env.TASK_MONITOR_COMPLETED_SESSIONS_FILE;
  const ledgerFile =
    ledgerEnv && ledgerEnv !== '0'
      ? path.resolve(ledgerEnv)
      : path.join(path.dirname(stateFile), 'task-monitor-completed-sessions.json');
  for (const f of [stateFile, ledgerFile]) {
    try {
      fs.unlinkSync(f);
      // eslint-disable-next-line no-console
      console.log(`OK  (file) ${f}`);
    } catch (e) {
      if (e && e.code !== 'ENOENT') {
        // eslint-disable-next-line no-console
        console.warn(`SKIP (file) ${f}: ${e.message}`);
      }
    }
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const fresh = argv.includes('--fresh');
  const sessionsOnly = argv.includes('--sessions-only');
  const monitorStateOnly = argv.includes('--monitor-state');

  if (monitorStateOnly) {
    removeMonitorStateFiles();
    if (!sessionsOnly && !fresh) {
      return;
    }
  } else if (fresh) {
    removeMonitorStateFiles();
  }

  const allTargets = [
    'a2a-client/storage/sessions',
    'a2a-ai-hub/proxy_logs',
    'proxy_logs',
    'a2a-ai-hub/storage/promises',
    'a2a-server/storage/requests',
  ];
  const targets = sessionsOnly ? ['a2a-client/storage/sessions'] : allTargets;

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

