#!/usr/bin/env tsx

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

type Violation = { file: string; message: string };

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');
const SIMULATIONS_DIR = join(__dirname, '..', '..', 'simulations');

function parseArgs() {
    const args = process.argv.slice(2);
    let sim: string | null = null;
    let json = false;
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--sim' && i + 1 < args.length) {
            sim = args[i + 1];
            i++;
        }
        if (arg === '--json' || arg === '-j') json = true;
    }
    return { sim, json };
}

function isStepDir(name: string) {
    return /^\d+$/.test(name) || /^\d+-sub-\d+$/.test(name);
}

function getSimulationDirs(sim: string | null): string[] {
    if (sim) return [join(SIMULATIONS_DIR, sim)];
    const out: string[] = [];
    for (const entry of readdirSync(SIMULATIONS_DIR, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        if (!entry.name.startsWith('agent')) continue;
        out.push(join(SIMULATIONS_DIR, entry.name));
    }
    return out;
}

function checkFile(filePath: string, requireInterruptTrace: boolean, violations: Violation[]) {
    let data: any;
    try {
        data = JSON.parse(readFileSync(filePath, 'utf-8'));
    } catch (error: any) {
        violations.push({ file: filePath, message: `invalid JSON: ${error.message}` });
        return;
    }
    const workbench = data?.context?.workbench;
    if (!workbench) return;
    if (typeof workbench !== 'object' || Array.isArray(workbench)) {
        violations.push({ file: filePath, message: 'context.workbench must be an object when present' });
        return;
    }
    if ('sections' in workbench) {
        if (!workbench.sections || typeof workbench.sections !== 'object' || Array.isArray(workbench.sections)) {
            violations.push({ file: filePath, message: 'context.workbench.sections must be an object when present' });
        }
    }
    if (requireInterruptTrace) {
        const slots = workbench?.slots;
        if (!slots || typeof slots !== 'object' || Array.isArray(slots)) return;
        if (!('interruptTrace' in slots)) return;
        const trace = slots.interruptTrace;
        if (!Array.isArray(trace) || trace.length === 0) {
            violations.push({
                file: filePath,
                message: 'substep response must include context.workbench.slots.interruptTrace[]',
            });
        }
    }
}

function validateSimulation(simDir: string): Violation[] {
    const violations: Violation[] = [];
    if (!existsSync(simDir)) {
        return [{ file: simDir, message: 'simulation directory not found' }];
    }
    for (const entry of readdirSync(simDir, { withFileTypes: true })) {
        if (!entry.isDirectory() || !isStepDir(entry.name)) continue;
        const responsePath = join(simDir, entry.name, 'response.json');
        if (!existsSync(responsePath)) continue;
        const isSubstep = /^\d+-sub-\d+$/.test(entry.name);
        checkFile(responsePath, isSubstep, violations);
    }
    return violations;
}

function main() {
    const { sim, json } = parseArgs();
    const targets = getSimulationDirs(sim);
    const violations = targets.flatMap((dir) => validateSimulation(dir));
    const ok = violations.length === 0;

    if (json) {
        console.log(JSON.stringify({ valid: ok, violations }, null, 2));
    } else if (ok) {
        console.log(`✅ Workbench simulation validation passed (${targets.length} target(s))`);
    } else {
        console.error('❌ Workbench simulation validation failed');
        for (const v of violations) {
            console.error(` - ${v.file}: ${v.message}`);
        }
    }
    process.exit(ok ? 0 : 1);
}

main();
