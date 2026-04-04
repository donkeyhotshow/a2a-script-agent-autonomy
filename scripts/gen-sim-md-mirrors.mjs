#!/usr/bin/env node
/**
 * One-off / maintenance: create missing request.md / response.md under simulations/sync/*
 * and simulations/async/* from sibling JSON (first fence = json for sim:check-md).
 */
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SIMULATION_ROOTS = [
    join(__dirname, '..', 'simulations', 'sync'),
    join(__dirname, '..', 'simulations', 'async'),
];
const STEP_RE = /^\d+(?:-sub-\d+)?$/;

function scan(dir) {
    const out = [];
    for (const name of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, name.name);
        if (!name.isDirectory()) continue;
        if (STEP_RE.test(name.name)) out.push(p);
        else out.push(...scan(p));
    }
    return out;
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
