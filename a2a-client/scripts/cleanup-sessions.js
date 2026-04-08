/**
 * Delete ALL Client API session trees under storage/sessions (no age / retention).
 *
 * Policy: there is no automatic pruning by mtime. Use this for a deliberate full wipe
 * before a clean run. After that, Task Monitor keeps at most one session id per prompt
 * file (`taskSessions`); do not run this script routinely if you need those bindings.
 *
 * Env: A2A_CLIENT_STORAGE_DIR — root containing `sessions/` (default: a2a-client/storage)
 *
 * Flags: --dry-run | -n (list only), --verbose | -v
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_ROOT = process.env.A2A_CLIENT_STORAGE_DIR || path.join(__dirname, '../storage');
const SESSIONS_DIR = path.join(STORAGE_ROOT, 'sessions');

const DRY_RUN = process.argv.includes('--dry-run') || process.argv.includes('-n');
const VERBOSE = process.argv.includes('--verbose') || process.argv.includes('-v');

function wipeAllSessions() {
  if (!fs.existsSync(SESSIONS_DIR)) {
    console.log('Sessions directory not found:', SESSIONS_DIR);
    return;
  }

  const sessions = fs.readdirSync(SESSIONS_DIR, { withFileTypes: true });
  let deleted = 0;

  console.log(`\n=== Client session storage wipe (all trees) ===`);
  console.log(`Directory: ${SESSIONS_DIR}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no deletions)' : 'LIVE'}\n`);

  for (const session of sessions) {
    if (!session.isDirectory()) continue;
    const sessionPath = path.join(SESSIONS_DIR, session.name);
    if (DRY_RUN) {
      console.log(`[DRY RUN] Would delete: ${session.name}`);
    } else {
      if (VERBOSE) console.log(`Deleting: ${session.name}`);
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }
    deleted++;
  }

  console.log(`\n=== Summary ===`);
  console.log(`Session trees ${DRY_RUN ? 'to delete' : 'deleted'}: ${deleted}`);
  console.log(`${DRY_RUN ? 'Re-run without --dry-run to apply.' : 'Done.'}\n`);
}

wipeAllSessions();
