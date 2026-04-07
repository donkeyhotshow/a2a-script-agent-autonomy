/**
 * Runs cross-system offline validators in a fixed order (see cross-system-contracts/SEQUENCE.md).
 * Skips proxy/session scans when those folders are missing; finds latest server-response.json for gray-room when no arg.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { globSync } from 'glob';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const win = process.platform === 'win32';

const PROMISES_DIR = path.join(root, 'ai-integration', 'proxy_logs', 'promises');
const SESSIONS_ROOT = path.join(root, 'a2a-client', 'storage', 'sessions');
const VERIFY_SCRIPT = path.join(
  root,
  'tests',
  'direct-tests',
  'validators',
  'verify-gray-room-state.mjs'
);

function runNpm(script) {
  const r = spawnSync(`npm run ${script}`, {
    cwd: root,
    encoding: 'utf-8',
    shell: win,
    stdio: 'inherit',
  });
  return r.status ?? 1;
}

function runNode(args) {
  const r = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: 'utf-8',
    stdio: 'inherit',
  });
  return r.status ?? 1;
}

function hasWorkbenchSequence(text) {
  let j;
  try {
    j = JSON.parse(text);
  } catch {
    return false;
  }
  const ctx = j?.context;
  const wb = ctx?.workbench ?? j?.workbench;
  const seq = wb?.sections?.sequence;
  if (seq == null) return false;
  if (Array.isArray(seq) && seq.length > 0) return true;
  if (typeof seq === 'object' && Array.isArray(seq.steps) && seq.steps.length > 0) return true;
  return false;
}

/** Prefer newest snapshot that actually has sequence data (skip "optional: nothing to verify"). */
function latestServerResponseWithSequencePath() {
  if (!fs.existsSync(SESSIONS_ROOT)) return null;
  const files = globSync('**/server-response.json', {
    cwd: SESSIONS_ROOT,
    absolute: true,
    nodir: true,
  });
  const withSeq = [];
  for (const p of files) {
    try {
      const raw = fs.readFileSync(p, 'utf-8');
      if (hasWorkbenchSequence(raw)) withSeq.push(p);
    } catch {
      /* skip */
    }
  }
  if (withSeq.length === 0) return null;
  withSeq.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return withSeq[0];
}

let code = 0;

console.log('\n=== cross-system:validate (1/4) scan-promise-bodies ===\n');
if (fs.existsSync(PROMISES_DIR)) {
  code |= runNpm('scan-promise-bodies');
} else {
  console.log(`SKIP: no ${path.relative(root, PROMISES_DIR)}`);
}

console.log('\n=== cross-system:validate (2/4) scan-session-responses ===\n');
if (fs.existsSync(SESSIONS_ROOT)) {
  code |= runNpm('scan-session-responses');
} else {
  console.log(`SKIP: no ${path.relative(root, SESSIONS_ROOT)}`);
}

console.log('\n=== cross-system:validate (3/4) verify:gray-room (latest session with sequence) ===\n');
const latest = latestServerResponseWithSequencePath();
if (latest) {
  console.log(`Using: ${path.relative(root, latest)}\n`);
  code |= runNode([VERIFY_SCRIPT, latest]);
} else {
  console.log(
    'SKIP: no server-response.json with context.workbench.sections.sequence under a2a-client/storage/sessions'
  );
}

console.log('\n=== cross-system:validate (4/4) audit:sim-choice-descriptions ===\n');
code |= runNpm('audit:sim-choice-descriptions');

console.log(
  code !== 0
    ? '\ncross-system:validate: FAILED (see output above)\n'
    : '\ncross-system:validate: OK\n'
);
process.exit(code);
