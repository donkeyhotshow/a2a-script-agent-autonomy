#!/usr/bin/env node
/**
 * Central orchestrator — **no CLI parameters**.
 *
 * Behavior: offline Mama gate + cross-system + sim gates, then Task Monitor once (`monitor:once`).
 * Set CENTRAL_SKIP_OFFLINE=1 to run only `monitor:once` (offline suite already passed).
 * See docs/CENTRAL-ORCHESTRATOR.md.
 */
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Repository root (this file lives in scripts/orchestrator-runbook/). */
const repoRoot = path.resolve(__dirname, '..', '..');

const extra = process.argv.slice(2);
if (extra.length > 0) {
  console.error(
    'central-orchestrator: no CLI arguments allowed (received: %s). See docs/CENTRAL-ORCHESTRATOR.md',
    extra.join(' ')
  );
  process.exit(2);
}

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

/**
 * @param {string} script
 * @param {string[]} [scriptArgs] passed after `--` to the npm script
 */
function runNpm(script, scriptArgs = []) {
  const args = ['run', script];
  if (scriptArgs.length > 0) {
    args.push('--', ...scriptArgs);
  }
  const r = spawnSync(npmCmd, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env,
  });
  return r.status ?? 1;
}

console.log('[central-orchestrator] docs/CENTRAL-ORCHESTRATOR.md');

const skipOffline = process.env.CENTRAL_SKIP_OFFLINE === '1';

if (skipOffline) {
  console.log('[central-orchestrator] CENTRAL_SKIP_OFFLINE=1 → monitor:only\n');
  process.exit(runNpm('monitor:once'));
}

console.log(
  '[central-orchestrator] test:before-start → cross-system:validate → sim:check-md:fail → sim:lint:all → sim:validate --all → monitor:once\n'
);

const steps = [
  ['test:before-start', []],
  ['cross-system:validate', []],
  ['sim:check-md:fail', []],
  ['sim:lint:all', []],
  ['sim:validate', ['--all']],
  ['monitor:once', []],
];

for (const [script, scriptArgs] of steps) {
  const code = runNpm(script, scriptArgs);
  if (code !== 0) process.exit(code);
}

process.exit(0);
