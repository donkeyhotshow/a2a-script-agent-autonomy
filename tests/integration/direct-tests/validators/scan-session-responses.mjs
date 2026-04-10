// Scan a2a-client/storage/sessions/**/server-response.json with the same execute/message
// rules as scan-promise-bodies (noisy while debugging — optional CI use).
// Run from repo root: node tests/direct-tests/validators/scan-session-responses.mjs
// Flags: --skip-if-missing, --strict (exit 1 if any issue)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyzeLlmExecuteShape } from './lib/check-llm-execute-shape.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..', '..', '..');
const SESSIONS_ROOT = path.join(REPO_ROOT, 'a2a-client', 'storage', 'sessions');
const argv = new Set(process.argv.slice(2));
const skipIfMissing = argv.has('--skip-if-missing');
const strict = argv.has('--strict');

/** Same rule as tests/proba-servera/validate.mts — dialog sim contract (see simulations/sync/dialog/description.md). */
function checkHistoryHasUserWhenTask(j) {
  const ctx = j.context;
  if (!ctx || typeof ctx !== 'object') return null;
  const task = ctx.task;
  if (typeof task !== 'string' || !task.trim()) return null;
  const history = ctx.history;
  if (!Array.isArray(history) || history.length === 0) return null;
  const hasUser = history.some(
    (h) => h && typeof h === 'object' && String(h.role).toLowerCase() === 'user'
  );
  if (!hasUser) {
    return {
      code: 'history-no-user',
      detail:
        'context.task is set and context.history is non-empty but has no role:user (assistant-only breaks session UX).',
    };
  }
  return null;
}

function collectServerResponseFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      collectServerResponseFiles(p, out);
    } else if (ent.name === 'server-response.json') {
      out.push(p);
    }
  }
  return out;
}

function scan() {
  if (!fs.existsSync(SESSIONS_ROOT)) {
    if (skipIfMissing) {
      console.log('[scan-session-responses] SKIP (no dir):', SESSIONS_ROOT);
      process.exit(0);
    }
    console.error('No folder:', SESSIONS_ROOT);
    process.exit(1);
  }

  const files = collectServerResponseFiles(SESSIONS_ROOT);
  const issues = [];

  for (const filePath of files) {
    let j;
    try {
      j = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      continue;
    }
    if (!j || typeof j !== 'object') continue;
    if (!j.execute) continue;

    const rel = path.relative(REPO_ROOT, filePath).replace(/\\/g, '/');
    for (const item of analyzeLlmExecuteShape(j)) {
      issues.push({ id: rel, ...item });
    }
    const histIssue = checkHistoryHasUserWhenTask(j);
    if (histIssue) issues.push({ id: rel, ...histIssue });
  }

  if (issues.length === 0) {
    console.log(`No contract issues in ${files.length} server-response.json file(s).`);
    process.exit(0);
  }

  console.log(`Found ${issues.length} issue(s) in session server-response.json:\n`);
  for (const i of issues) {
    console.log(`${i.id}  [${i.code}]  ${i.detail}`);
  }
  if (strict) process.exit(1);
  process.exit(0);
}

scan();
