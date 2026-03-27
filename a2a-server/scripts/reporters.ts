/**
 * Reporters: CLI output formatting
 */

import {SimulationLintResult} from './registry.js';

// ============================================
// CLI
// ============================================

export function parseArgs(): {
    sim: string | null;
    all: boolean;
    json: boolean;
    verbose: boolean;
    fix: boolean;
    help: boolean;
} {
    const args = process.argv.slice(2);

    let sim: string | null = null;

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg === '--sim' && i + 1 < args.length) {
            sim = args[i + 1];
            i++;
        }
    }

    return {
        sim,
        all: args.includes('--all'),
        json: args.includes('--json') || args.includes('-j'),
        verbose: args.includes('--verbose') || args.includes('-v'),
        fix: args.includes('--fix'),
        help: args.includes('--help') || args.includes('-h'),
    };
}

export function printHelp() {
    console.log(`
🛠️  Simulation Linter CLI

Usage: npm run sim:lint [options]

Options:
  --sim <name>       Simulation name to check
  --all              Check all simulations
  --json, -j         JSON output
  --verbose, -v      Verbose output
  --fix              Auto-fix issues (trailing commas)
  --help, -h         Show help

Examples:
  npm run sim:lint -- --sim agent-coder/3
  npm run sim:lint -- --all --verbose
  npm run sim:lint -- --all --fix
`);
}

export function formatResults(results: SimulationLintResult[], json: boolean, verbose: boolean): void {
    if (json) {
        const output = {
            valid: results.every(r => r.valid),
            simulations: results.map(r => ({
                name: r.name,
                valid: r.valid,
                errors: r.errors,
                files: r.files.map(f => ({
                    file: f.file,
                    valid: f.valid,
                    errors: f.errors
                }))
            }))
        };
        console.log(JSON.stringify(output, null, 2));
        return;
    }

    console.log('\n📋 Simulation lint results:\n');

    let totalErrors = 0;
    let totalWarnings = 0;

    for (const result of results) {
        const status = result.valid ? '✅' : '❌';
        console.log(`${status} ${result.name}`);

        if (result.errors.length > 0) {
            console.log(`   Errors/warnings:`);
            result.errors.forEach(err => {
                const symbol = err.severity === 'error' ? '❌' : '⚠️';
                const path = err.path ? `[${err.path}] ` : '';
                console.log(`     ${symbol} ${path}${err.message}`);
                if (err.severity === 'error') totalErrors++;
                else totalWarnings++;
            });
        }

        if (verbose) {
            console.log(`   Files:`);
            for (const file of result.files) {
                const fileStatus = file.valid ? '✅' : '❌';
                console.log(`     ${fileStatus} ${file.file}`);
                if (!file.valid && file.errors.length > 0) {
                    file.errors.forEach(err => {
                        const symbol = err.severity === 'error' ? '❌' : '⚠️';
                        console.log(`       ${symbol} ${err.message}`);
                    });
                }
            }
        }

        console.log('');
    }

    const allValid = results.every(r => r.valid);
    const symbol = allValid ? '✅' : '❌';

    console.log('─────────────────────────────────────────');
    console.log(`${symbol} Total: ${results.length} simulations`);

    if (totalErrors > 0) {
        console.log(`   ❌ Errors: ${totalErrors}`);
    }

    if (totalWarnings > 0) {
        console.log(`   ⚠️  Warnings: ${totalWarnings}`);
    }
}
