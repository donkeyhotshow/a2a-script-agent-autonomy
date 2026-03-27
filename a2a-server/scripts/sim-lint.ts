#!/usr/bin/env tsx

/**
 * CLI для lint проверок симуляций протокола
 * Index module - re-exports from submodules
 */

import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {SIMULATIONS_DIR, getAllSimulations} from './registry.js';
import {lintSimulation} from './runners.js';
import {parseArgs, printHelp, formatResults} from './reporters.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

// ============================================
// Main
// ============================================

function main() {
    const args = parseArgs();

    if (args.help) {
        printHelp();
        process.exit(0);
    }

    if (!args.sim && !args.all) {
        console.error('❌ Error: specify simulation or use --all');
        console.error('   Usage: npm run sim:lint -- --sim <name>');
        console.error('   Example: npm run sim:lint -- --sim agent-coder/3');
        console.error('   Help: npm run sim:lint -- --help');
        process.exit(1);
    }

    const results = [];

    if (args.all) {
        const simulations = getAllSimulations();

        if (simulations.length === 0) {
            console.log('⚠️  No simulations found');
            process.exit(0);
        }

        console.log(`📂 Found ${simulations.length} simulations\n`);

        for (const sim of simulations) {
            const result = lintSimulation(sim.path, sim.name, args.fix);
            results.push(result);
        }
    } else if (args.sim) {
        const simPath = join(SIMULATIONS_DIR, args.sim);
        const result = lintSimulation(simPath, args.sim, args.fix);
        results.push(result);
    }

    formatResults(results, args.json, args.verbose);

    const hasErrors = results.some(r => !r.valid);
    process.exit(hasErrors ? 1 : 0);
}

main();
