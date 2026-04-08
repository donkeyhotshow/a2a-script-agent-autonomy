/**
 * Runs tests/human-review only (excluded from default `npm test`).
 * Overwrites tests/human-review/REPORT.md for operator review.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const hrDir = join(root, 'tests', 'human-review');
const reportPath = join(hrDir, 'REPORT.md');
const jsonPath = join(hrDir, '.last-vitest.json');

mkdirSync(hrDir, { recursive: true });

const vitestArgs = [
  'run',
  '--config',
  'vitest.human-review.config.ts',
  '--reporter=json',
  `--outputFile=tests/human-review/.last-vitest.json`,
];
const vitestMain = join(root, 'node_modules', 'vitest', 'vitest.mjs');
if (!existsSync(vitestMain)) {
  console.error(`[run-human-review] Missing ${vitestMain} — run npm install in ${root}`);
  process.exit(1);
}
const proc = spawnSync(process.execPath, [vitestMain, ...vitestArgs], {
  cwd: root,
  encoding: 'utf-8',
  shell: false,
  env: { ...process.env, FORCE_COLOR: '0' },
});

let summary = '';
try {
  const raw = readFileSync(jsonPath, 'utf8');
  const data = JSON.parse(raw);
  const files = Array.isArray(data.testResults) ? data.testResults : [];
  let failed = 0;
  let passed = 0;
  const lines = [];
  for (const f of files) {
    const assertion = f.assertionResults || [];
    for (const a of assertion) {
      if (a.status === 'failed') {
        failed++;
        lines.push(`### FAIL: ${f.name} › ${a.title}\n\n\`\`\`\n${(a.failureMessages || []).join('\n')}\n\`\`\`\n`);
      } else if (a.status === 'passed') passed++;
    }
  }
  summary = `Passed: ${passed}, Failed: ${failed}, Vitest exit: ${proc.status ?? '?'}\n\n`;
  if (lines.length) summary += lines.join('\n');
} catch {
  summary = `Could not parse Vitest JSON (${jsonPath}). Raw stdout/stderr below.\n\n`;
}

const spawnErr = proc.error ? String(proc.error) : '';
const stamp = new Date().toISOString();
const report = `# Human-review test run (a2a-client)

**When:** ${stamp}
**Exit code:** ${proc.status ?? 'null'}${spawnErr ? `\n**Spawn error:** ${spawnErr}` : ''}

## Summary

${summary}

## Console

\`\`\`text
${proc.stdout || ''}
${proc.stderr || ''}
\`\`\`

## Your confirmation (edit below)

- [ ] I reviewed failures above — real bugs vs wrong expectations
- [ ] Notes:

`;

writeFileSync(reportPath, report, 'utf8');
process.exit(proc.status === null ? 1 : proc.status);
