/**
 * Fix inconsistent session step files under storage/sessions:
 * - request-to-server.json without client-result.json → rebuild client-result from the request body
 * - optional: --drop-stale-promises removes server-promise.json when server-response.json is missing
 *
 * Usage (repo): cd a2a-client && node ./scripts/repair-session-step-artifacts.mjs [--dry-run] [--drop-stale-promises]
 * Env: A2A_CLIENT_STORAGE_DIR
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const dryRun = argv.includes('--dry-run');
  const dropStale = argv.includes('--drop-stale-promises');
  return { dryRun, dropStale };
}

async function main() {
  const { dryRun, dropStale } = parseArgs(process.argv.slice(2));
  const storageRoot = path.resolve(process.env.A2A_CLIENT_STORAGE_DIR || path.join(__dirname, '../storage'));
  process.env.A2A_CLIENT_STORAGE_DIR = storageRoot;
  const sessionsDir = path.join(storageRoot, 'sessions');
  if (!fs.existsSync(sessionsDir)) {
    console.error('Sessions dir not found:', sessionsDir);
    process.exit(1);
  }

  const { listNewSteps, normalizeSessionIdForDir } = await import(
    '../packages/vite-plugin/storage/session-paths.js'
  );
  const {
    repairMissingClientResultForStep,
    dropStaleServerPromiseForStep,
    validateSessionStorage,
  } = await import('../packages/vite-plugin/storage/session-step-io.js');
  const { reconcileSessionIndexFromDisk } = await import('../packages/vite-plugin/storage/newSessions.js');

  const cwd = storageRoot;
  const entries = fs.readdirSync(sessionsDir, { withFileTypes: true }).filter((e) => e.isDirectory());
  let fixedClient = 0;
  let droppedPromise = 0;
  let sessionsTouched = new Set();

  for (const e of entries) {
    const sid = normalizeSessionIdForDir(e.name);
    if (!sid) continue;
    const steps = listNewSteps(cwd, sid);
    for (const stepNum of steps) {
      const r1 = repairMissingClientResultForStep(cwd, sid, stepNum, { dryRun });
      if (r1.fixed) {
        fixedClient++;
        sessionsTouched.add(sid);
        console.log(
          dryRun ? `[dry-run] would fix client-result ${sid}/${stepNum}` : `fixed client-result ${sid}/${stepNum}`
        );
      }
      if (dropStale) {
        const r2 = dropStaleServerPromiseForStep(cwd, sid, stepNum, { dryRun });
        if (r2.dropped) {
          droppedPromise++;
          sessionsTouched.add(sid);
          console.log(
            dryRun
              ? `[dry-run] would drop stale server-promise ${sid}/${stepNum}`
              : `dropped stale server-promise ${sid}/${stepNum}`
          );
        }
      }
    }
  }

  for (const sid of sessionsTouched) {
    const out = reconcileSessionIndexFromDisk(cwd, sid);
    if (out) {
      console.log('reconciled index', sid, 'currentStep=', out.currentStep);
    }
  }

  if (process.argv.includes('--validate')) {
    for (const e of entries) {
      const sid = normalizeSessionIdForDir(e.name);
      if (!sid) continue;
      const v = validateSessionStorage(cwd, sid);
      if (!v.isValid) {
        console.warn('still invalid', sid, v.steps.filter((s) => !s.isValid));
      }
    }
  }

  console.log(
    `Done. storage=${sessionsDir} fixedClientResult=${fixedClient} droppedPromise=${droppedPromise} dryRun=${dryRun}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
