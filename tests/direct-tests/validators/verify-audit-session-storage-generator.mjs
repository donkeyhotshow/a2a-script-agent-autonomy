/**
 * Contract check: repo-root `scripts/audit-session-storage-to-tasks.mjs` must not
 * use content MD5 for skip/rewrite and must embed the standard generated-task workflow.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const scriptPath = path.join(repoRoot, 'scripts', 'audit-session-storage-to-tasks.mjs');

let code;
try {
  code = fs.readFileSync(scriptPath, 'utf8');
} catch (e) {
  console.error(`Cannot read ${scriptPath}: ${e?.message || e}`);
  process.exit(1);
}

const errors = [];
if (/createHash\s*\(\s*['"]md5['"]\s*\)/.test(code)) {
  errors.push('Must not use MD5 content hashing in audit-session-storage-to-tasks.mjs');
}
if (!/Before execution/i.test(code) || !/After execution/i.test(code)) {
  errors.push('Must define GENERATED_TASK_WORKFLOW with Before/After execution instructions');
}
if (!/GENERATED_TASK_WORKFLOW/.test(code)) {
  errors.push('Must export/embed GENERATED_TASK_WORKFLOW constant for generated task bodies');
}

if (errors.length) {
  for (const m of errors) console.error(m);
  process.exit(1);
}
console.log('verify-audit-session-storage-generator: ok');
