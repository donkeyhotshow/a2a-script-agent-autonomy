// Scan ai-integration/proxy_logs/promises/*/body.md for LLM JSON contract issues
// (top-level message + tool, duplicate execute.message, etc.).
// Run from repo root: node tests/direct-tests/validators/scan-promise-bodies.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyzeLlmExecuteShape } from './lib/check-llm-execute-shape.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROMISES_DIR = path.join(__dirname, '..', '..', '..', 'ai-integration', 'proxy_logs', 'promises');

function extractJsonFromBody(md) {
  const m = md.match(/```json\s*([\s\S]*?)\s*```/);
  if (!m?.[1]) return null;
  try {
    return JSON.parse(m[1].trim());
  } catch {
    return null;
  }
}

function scan() {
  if (!fs.existsSync(PROMISES_DIR)) {
    console.error('No folder:', PROMISES_DIR);
    process.exit(1);
  }
  const dirs = fs.readdirSync(PROMISES_DIR, { withFileTypes: true }).filter((d) => d.isDirectory());

  const issues = [];

  for (const d of dirs) {
    const bodyPath = path.join(PROMISES_DIR, d.name, 'body.md');
    if (!fs.existsSync(bodyPath)) continue;
    const raw = fs.readFileSync(bodyPath, 'utf-8');
    if (raw.trim().startsWith('{') && raw.includes('"error"')) continue;

    const j = extractJsonFromBody(raw);
    if (!j || typeof j !== 'object') continue;

    for (const item of analyzeLlmExecuteShape(j)) {
      issues.push({ id: d.name, ...item });
    }
  }

  if (issues.length === 0) {
    console.log('No contract issues found in promise body.md files.');
    return;
  }

  console.log(`Found ${issues.length} issue(s):\n`);
  for (const i of issues) {
    console.log(`${i.id}  [${i.code}]  ${i.detail}`);
  }
}

scan();
