/**
 * npm runs `npm run build --workspaces` in workspace name order, not dependency order.
 * This script builds waves so `dist/` exists before dependents (e.g. @a2a/server-actions after @a2a/server-core).
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function runBuild(workspace) {
    const r = spawnSync('npm', ['run', 'build', '-w', workspace], {
        cwd: root,
        stdio: 'inherit',
        shell: true,
    });
    if (r.status !== 0 && r.status !== null) {
        process.exit(r.status);
    }
    if (r.error) {
        console.error(r.error);
        process.exit(1);
    }
}

/**
 * @a2a/config-legacy — known broken (see `npm run build:parallel`).
 * @a2a/server-protocol-legacy — `tsc` pulls in ../actions without this repo’s path maps; fix separately.
 */
const waves = [
    ['@a2a/config', '@a2a/server-protocol', '@a2a/server-utils'],
    ['@a2a/server-request', '@a2a/server-ai'],
    ['@a2a/server-daemon'],
    ['@a2a/server-services'],
    ['@a2a/server-core'],
    ['@a2a/server-actions', '@a2a/server-features'],
    ['@a2a/server-gray-room'],
];

for (const wave of waves) {
    for (const w of wave) {
        runBuild(w);
    }
}
