// Scan a2a-client/storage/sessions/**/server-response.json with the same execute/message
// rules as scan-promise-bodies (noisy while debugging — optional CI use).
// Run from repo root: node tests/direct-tests/validators/scan-session-responses.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyzeLlmExecuteShape } from './lib/check-llm-execute-shape.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..', '..', '..');
const SESSIONS_ROOT = path.join(REPO_ROOT, 'a2a-client', 'storage', 'sessions');

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
  }

  if (issues.length === 0) {
    console.log(`No contract issues in ${files.length} server-response.json file(s).`);
    return;
  }

  console.log(`Found ${issues.length} issue(s) in session server-response.json:\n`);
  for (const i of issues) {
    console.log(`${i.id}  [${i.code}]  ${i.detail}`);
  }
}

scan();
