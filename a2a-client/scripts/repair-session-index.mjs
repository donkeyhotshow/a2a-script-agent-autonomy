/**
 * Reconcile session-index.json with on-disk step folders (AGENTS.md session storage).
 * Usage (from repo): cd a2a-client && node ./scripts/repair-session-index.mjs
 * Optional: A2A_CLIENT_STORAGE_DIR=/path/to/storage
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const storageRoot = path.resolve(process.env.A2A_CLIENT_STORAGE_DIR || path.join(__dirname, '../storage'));
  process.env.A2A_CLIENT_STORAGE_DIR = storageRoot;
  const sessionsDir = path.join(storageRoot, 'sessions');
  if (!fs.existsSync(sessionsDir)) {
    console.error('Sessions dir not found:', sessionsDir);
    process.exit(1);
  }

  const { reconcileSessionIndexFromDisk } = await import('../packages/vite-plugin/storage/newSessions.js');
  const cwd = storageRoot;
  const entries = fs.readdirSync(sessionsDir, { withFileTypes: true }).filter((e) => e.isDirectory());
  let ok = 0;
  let skipped = 0;
  for (const e of entries) {
    const indexPath = path.join(sessionsDir, e.name, 'session-index.json');
    if (!fs.existsSync(indexPath)) {
      skipped++;
      continue;
    }
    const out = reconcileSessionIndexFromDisk(cwd, e.name);
    if (out) {
      ok++;
      console.log('reconciled', e.name, 'currentStep=', out.currentStep);
    } else {
      console.warn('skip/fail', e.name);
      skipped++;
    }
  }
  console.log(`Done. reconciled=${ok} skipped=${skipped} storage=${sessionsDir}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
