#!/usr/bin/env node
/**
 * One-off / maintenance: create missing request.md / response.md under simulations/sync/*
 * and simulations/async/* from sibling JSON (first fence = json for sim:check-md).
 */
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { walkDirsRecursive } from '../../a2a-server/src/fs-utils/recursive-directory-walker.js';
import { getRepoRoot } from '../../a2a-server/src/fs-utils/repo-root.js';

const REPO_ROOT = getRepoRoot();
const SIMULATION_ROOTS = [
    join(REPO_ROOT, 'simulations', 'sync'),
    join(REPO_ROOT, 'simulations', 'async'),
];
const STEP_RE = /^\d+(?:-sub-\d+)?$/;

// Using utility function from @/fs-utils/recursive-directory-walker.js
function scan(dir) {
    return walkDirsRecursive(dir, (name) => STEP_RE.test(name));
}

let n = 0;
for (const simRoot of SIMULATION_ROOTS) {
    if (!existsSync(simRoot)) continue;
    for (const stepDir of scan(simRoot)) {
        const rel = relative(simRoot, stepDir).replace(/\\/g, '/');
        const reqJ = join(stepDir, 'request.json');
        const resJ = join(stepDir, 'response.json');
        const reqM = join(stepDir, 'request.md');
        const resM = join(stepDir, 'response.md');
        if (existsSync(reqJ) && !existsSync(reqM)) {
            const obj = JSON.parse(readFileSync(reqJ, 'utf8'));
            const body =
                `# \`${rel}\` — request\n\nMirror of \`request.json\` for prompt pipeline / \`sim:check-md\`.\n\n\`\`\`json\n` +
                JSON.stringify(obj, null, 2) +
                `\n\`\`\`\n`;
            writeFileSync(reqM, body, 'utf8');
            n++;
        }
        if (existsSync(resJ) && !existsSync(resM)) {
            const obj = JSON.parse(readFileSync(resJ, 'utf8'));
            const body =
                `# \`${rel}\` — response\n\nMirror of \`response.json\` for prompt pipeline / \`sim:check-md\`.\n\n\`\`\`json\n` +
                JSON.stringify(obj, null, 2) +
                `\n\`\`\`\n`;
            writeFileSync(resM, body, 'utf8');
            n++;
        }
    }
}
console.log(`gen-sim-md-mirrors: wrote ${n} file(s).`);
