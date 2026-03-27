import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_ROOT = process.env.A2A_CLIENT_STORAGE_DIR || path.join(__dirname, '../storage');
const SESSIONS_DIR = path.join(STORAGE_ROOT, 'sessions');

const RETENTION_DAYS = 14;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

const DRY_RUN = process.argv.includes('--dry-run') || process.argv.includes('-n');
const VERBOSE = process.argv.includes('--verbose') || process.argv.includes('-v');

function formatAge(ms) {
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days} days`;
  return `${hours} hours`;
}

function cleanup() {
  if (!fs.existsSync(SESSIONS_DIR)) {
    console.log('Sessions directory not found:', SESSIONS_DIR);
    return;
  }

  const now = Date.now();
  const sessions = fs.readdirSync(SESSIONS_DIR, { withFileTypes: true });

  let deletedCount = 0;
  let keptCount = 0;

  console.log(`\n=== Session Cleanup Utility ===`);
  console.log(`Storage: ${SESSIONS_DIR}`);
  console.log(`Retention: ${RETENTION_DAYS} days`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no deletions)' : 'LIVE'}\n`);

  for (const session of sessions) {
    if (!session.isDirectory()) continue;

    const sessionPath = path.join(SESSIONS_DIR, session.name);
    const stats = fs.statSync(sessionPath);
    const age = now - stats.mtimeMs;

    if (age > RETENTION_MS) {
      if (DRY_RUN) {
        console.log(`[DRY RUN] Would delete: ${session.name} (age: ${formatAge(age)})`);
      } else {
        if (VERBOSE) console.log(`Deleting: ${session.name} (age: ${formatAge(age)})`);
        fs.rmSync(sessionPath, { recursive: true, force: true });
      }
      deletedCount++;
    } else {
      if (VERBOSE) console.log(`Keeping: ${session.name} (age: ${formatAge(age)})`);
      keptCount++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Sessions deleted: ${deletedCount}`);
  console.log(`Sessions kept: ${keptCount}`);
  console.log(`\nCleanup ${DRY_RUN ? 'simulation' : 'complete'}.`);
}

cleanup();