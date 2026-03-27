/**
 * Reporters — CLI output and entrypoint for sim-validate
 */

import {join} from 'node:path';
import {parseArgs, printHelp, getAllSimulations, SIMULATIONS_DIR} from './scanner.js';
import {validateSimulation, type SimulationValidationResult, type ValidateOptions} from './validators.js';

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
        targets = getAllSimulations();
    } else if (args.sim) {
        const name = args.sim.replace(/\\/g, '/');
        const path = join(SIMULATIONS_DIR, ...name.split('/').filter(Boolean));
        targets = [{path, name}];
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

function printValidationResults(results: SimulationValidationResult[], json: boolean, verbose: boolean): void {
    if (json) {
        const payload = {
            valid: results.every(r => r.valid),
            simulations: results.map(r => ({
                name: r.name,
                path: r.path,
                valid: r.valid,
                errors: r.errors,
                warnings: r.warnings,
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
