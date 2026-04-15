/**
 * Reporters — CLI output and entrypoint for sim-validate
 */

import {existsSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {parseArgs, printHelp} from './scanner.js';
import {
    getAllSimulations,
    INTEGRATION_SIMULATIONS_DIR,
    SIMULATIONS_DIR,
} from '../sim-lint/registry.js';
import {validateSimulation, type SimulationValidationResult, type ValidateOptions} from './validators.js';

const REQUIRED_STEP_FILES = ['request.json', 'response.json', 'client.json', 'received.json'] as const;

/** Flat golden: all four JSON files live directly under `dir`. */
function isFlatSimulationRoot(dir: string): boolean {
    return REQUIRED_STEP_FILES.every((f) => existsSync(join(dir, f)));
}

/**
 * `getAllSimulations()` returns lint roots (folder with numbered steps inside).
 * Schema validation is per-step; expand to `sync/foo/1`, `sync/foo/2`, … and interrupt `N-sub-M` dirs.
 */
function expandSimulationValidateTargets(items: {path: string; name: string}[]): {path: string; name: string}[] {
    const out: {path: string; name: string}[] = [];
    for (const item of items) {
        if (!existsSync(item.path)) {
            out.push(item);
            continue;
        }
        if (isFlatSimulationRoot(item.path)) {
            out.push(item);
            continue;
        }
        let added = false;
        try {
            for (const ent of readdirSync(item.path, {withFileTypes: true})) {
                if (!ent.isDirectory()) continue;
                if (/^\d+$/.test(ent.name)) {
                    const sub = join(item.path, ent.name);
                    if (existsSync(join(sub, 'request.json'))) {
                        out.push({path: sub, name: `${item.name}/${ent.name}`});
                        added = true;
                    }
                } else if (/^\d+-sub-\d+$/.test(ent.name)) {
                    const sub = join(item.path, ent.name);
                    if (
                        existsSync(join(sub, 'request.json')) ||
                        existsSync(join(sub, 'response.json'))
                    ) {
                        out.push({path: sub, name: `${item.name}/${ent.name}`});
                        added = true;
                    }
                }
            }
        } catch {
            // keep fallback below
        }
        if (!added) {
            out.push(item);
        }
    }
    return out;
}

export function main(): void {
    const args = parseArgs();
    if (args.help) {
        printHelp();
        process.exit(0);
    }

    const opts: ValidateOptions = {
        normalize: !args.strict,
        lenientTransforms: !args.strict,
        stepContractChecks: args.stepContract,
    };

    let targets: {path: string; name: string}[] = [];

    if (args.all) {
        targets = expandSimulationValidateTargets(getAllSimulations());
    } else if (args.sim) {
        const name = args.sim.replace(/\\/g, '/');
        const parts = name.split('/').filter(Boolean);
        const path =
            parts[0] === 'integration'
                ? join(INTEGRATION_SIMULATIONS_DIR, ...parts.slice(1))
                : join(SIMULATIONS_DIR, ...parts);
        targets = expandSimulationValidateTargets([{path, name}]);
    } else {
        console.error('Error: specify --sim <name> or --all\n');
        printHelp();
        process.exit(1);
    }

    if (targets.length === 0) {
        console.error('No simulations found.');
        process.exit(1);
    }

    const results = targets.map(t => validateSimulation(t.path, t.name, opts));
    printValidationResults(results, args.json, args.verbose);
    const ok = results.every(r => r.valid);
    process.exit(ok ? 0 : 1);
}

function simulationWarningCount(r: SimulationValidationResult): number {
    let n = r.warnings.length;
    for (const f of r.files) {
        n += f.warnings.length;
    }
    return n;
}

function printValidationResults(results: SimulationValidationResult[], json: boolean, verbose: boolean): void {
    if (json) {
        const structuralValid = results.every(r => r.valid);
        let warningCount = 0;
        for (const r of results) {
            warningCount += simulationWarningCount(r);
        }
        const contractComplete = warningCount === 0;
        const payload = {
            valid: structuralValid,
            structuralValid,
            contractComplete,
            warningCount,
            simulations: results.map(r => ({
                name: r.name,
                path: r.path,
                valid: r.valid,
                errors: r.errors,
                warnings: r.warnings,
                warningCount: simulationWarningCount(r),
                ...(verbose ? {files: r.files} : {}),
            })),
        };
        console.log(JSON.stringify(payload, null, 2));
        return;
    }

    let totalErrors = 0;

    for (const r of results) {
        const status = r.valid ? '✅' : '❌';
        console.log(`\n${status} ${r.name}`);
        console.log(`   ${r.path}`);

        if (r.errors.length > 0) {
            console.log('   Errors:');
            for (const e of r.errors) {
                const p = e.path ? `[${e.path}] ` : '';
                console.log(`     ❌ ${p}${e.message}`);
                totalErrors++;
            }
        }

        if (r.warnings.length > 0) {
            console.log('   Warnings:');
            for (const w of r.warnings) {
                console.log(`     ⚠️  ${w}`);
            }
        }

        if (verbose) {
            console.log('   Files:');
            for (const f of r.files) {
                const fs = f.valid ? '✅' : '❌';
                console.log(`     ${fs} ${f.file}`);
                if (!f.valid && f.errors.length > 0) {
                    for (const e of f.errors) {
                        const p = e.path ? `[${e.path}] ` : '';
                        console.log(`        ❌ ${p}${e.message}`);
                    }
                }
                for (const w of f.warnings) {
                    console.log(`        ⚠️  ${w}`);
                }
            }
        }
    }

    const allOk = results.every(x => x.valid);
    const sym = allOk ? '✅' : '❌';
    console.log(`\n${sym} Total: ${results.length} simulation(s)`);
    if (!allOk && totalErrors === 0) {
        console.log('   (validation failed — see messages above)');
    }
}
