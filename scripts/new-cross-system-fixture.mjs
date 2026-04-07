/**
 * Scaffold cross-system-contracts/fixtures/<slug>/ with meta.json + README.md
 * Usage: node scripts/new-cross-system-fixture.mjs <slug>
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const slug = process.argv[2];
if (!slug || !/^[a-z0-9][-a-z0-9]*$/i.test(slug)) {
  console.error('Usage: node scripts/new-cross-system-fixture.mjs <slug>  (letters, digits, hyphens)');
  process.exit(1);
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'cross-system-contracts', 'fixtures', slug);

if (fs.existsSync(dir)) {
  console.error(`Already exists: ${dir}`);
  process.exit(1);
}

fs.mkdirSync(dir, { recursive: true });

const meta = {
  id: slug,
  status: 'open',
  systems: ['a2a-client', 'a2a-server', 'ai-integration'],
  symptom: 'TODO: one line — wrong or missing field / shape',
  validators: ['scan-promise-bodies'],
  sourceHint: '',
};

fs.writeFileSync(path.join(dir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`, 'utf-8');

const readme = `# ${slug}

What broke (inter-system), expected vs actual, and link to \`tasks/pending/cross-system-parameter-hunt.md\` row.

Optional: add \`excerpt.json\` or \`excerpt.md\` with minimal repro.
`;

fs.writeFileSync(path.join(dir, 'README.md'), readme, 'utf-8');

console.log(`Created ${path.relative(root, dir)}`);
console.log('Edit meta.json symptom + validators; add excerpts; log the hunt table.');
