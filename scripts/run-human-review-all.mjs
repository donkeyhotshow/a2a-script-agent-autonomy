/**
 * Runs human-review suites in a2a-server, a2a-client, ai-integration.
 * Each module overwrites its own tests/human-review/REPORT.md
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const win = process.platform === 'win32';

function run(cmd, cwd) {
  const r = spawnSync(cmd, {
    cwd,
    encoding: 'utf-8',
    shell: win,
    stdio: 'inherit',
  });
  return r.status ?? 1;
}

let code = 0;
code |= run('npm run test:human-review', join(root, 'a2a-server'));
code |= run('npm run test:human-review', join(root, 'a2a-client'));
code |= run('python scripts/run-human-review.py', join(root, 'ai-integration'));

console.log('\nReports (overwritten each run):');
console.log('  a2a-server:      tests/human-review/REPORT.md');
console.log('  a2a-client:      tests/human-review/REPORT.md');
console.log('  ai-integration:  tests/human-review/REPORT.md');
process.exit(code);
