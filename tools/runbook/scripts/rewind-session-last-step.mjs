/**
 * Rewind Client API session disk steps (same session id; retry /next without new session).
 * Storage: A2A_CLIENT_STORAGE_DIR or <repo>/a2a-client/storage
 *
 * Usage:
 *   node scripts/rewind-session-last-step.mjs <sessionId>
 *   node scripts/rewind-session-last-step.mjs <sessionId> <keepThroughStep>
 * When `keepThroughStep` is set, removes all step folders **after** that number (see `rewindSessionAfterStep`).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

function resolveStorageRoot() {
  if (process.env.A2A_CLIENT_STORAGE_DIR) {
    return path.resolve(process.env.A2A_CLIENT_STORAGE_DIR);
  }
  const ac = path.join(REPO_ROOT, 'a2a-client', 'storage');
  if (fs.existsSync(ac)) return ac;
  return path.join(REPO_ROOT, 'storage');
}

async function main() {
  const sessionId = process.argv[2];
  const keepThrough = process.argv[3];
  if (!sessionId || sessionId.startsWith('-')) {
    console.error(
      'Usage: node scripts/rewind-session-last-step.mjs <sessionId> [keepThroughStep]'
    );
    process.exit(1);
  }
  process.env.A2A_CLIENT_STORAGE_DIR = resolveStorageRoot();
  const mod = await import('../a2a-client/packages/vite-plugin/storage/newSessions.js');
  const cwd = process.env.A2A_CLIENT_STORAGE_DIR;
  let out;
  if (keepThrough != null && String(keepThrough).trim() !== '') {
    const k = parseInt(String(keepThrough).trim(), 10);
    if (!Number.isFinite(k) || k < 1) {
      console.error('invalid keepThroughStep');
      process.exit(1);
    }
    out = mod.rewindSessionAfterStep(cwd, sessionId, k);
  } else {
    out = mod.rewindSessionLastStep(cwd, sessionId);
  }
  if (!out.ok) {
    console.error('rewind failed:', out.reason);
    process.exit(1);
  }
  console.log('ok', out, 'storage=', cwd);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
