#!/usr/bin/env node

/**
 * Script to run all simulations sequentially
 *
 * Usage:
 *   node run-all-simulations.js
 *
 * Result:
 *   - Finds all simulation directories
 *   - Runs each via run-simulation.js
 *   - Outputs final report
 */

import {readdirSync, statSync, readFileSync, writeFileSync, existsSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const simulationsPath = join(__dirname);

// List of simulation categories (in execution order)
const simulationCategories = [
    'pilot',
    'analyze-full',
    'analyze',
    'analyze-typescript',
    'analyze-vue',
    'analyze-laravel',
    'generate-crud',
    'generate-controller',
    'generate-model',
    'generate-migration',
    'graph-build',
    'graph-query',
    'graph-impact',
    'hybrid-fix',
    'hybrid-refactor'
];

/**
 * Find all simulations in directory
 */
function findSimulations(basePath) {
    const simulations = [];

    for (const category of simulationCategories) {
        const categoryPath = join(basePath, category);

        if (!existsSync(categoryPath)) {
            continue;
        }

        const stat = statSync(categoryPath);

        if (stat.isDirectory()) {
            // Check if category has subfolders (e.g. pilot/1, pilot/2)
            const files = readdirSync(categoryPath);
            const hasSubDirs = files.some(f => {
                try {
                    return statSync(join(categoryPath, f)).isDirectory();
                } catch {
                    return false;
                }
            });

            if (hasSubDirs) {
                // Category with numbers (pilot/1, pilot/2)
                for (const file of files.sort()) {
                    const subPath = join(categoryPath, file);
                    if (statSync(subPath).isDirectory()) {
                        const requestPath = join(subPath, 'request.json');
                        if (existsSync(requestPath)) {
                            simulations.push({
                                id: category + '/' + file,
                                path: subPath,
                                category
                            });
                        }
                    }
                }
            } else {
                // Single simulation
                const requestPath = join(categoryPath, 'request.json');
                if (existsSync(requestPath)) {
                    simulations.push({
                        id: category,
                        path: categoryPath,
                        category
                    });
                }
            }
        }
    }

    return simulations;
}

/**
 * Run single simulation
 */
function runSimulation(simulation) {
    return new Promise((resolve) => {
        console.log('\n' + '='.repeat(60));
        console.log('Running: ' + simulation.id);
        console.log('='.repeat(60));

        const startTime = Date.now();

        // Run run-simulation.js as child process
        const child = spawn(
            'node',
            ['run-simulation.js', simulation.id],
            {
                cwd: simulationsPath,
                stdio: 'inherit',
                shell: true
            }
        );

        child.on('close', (code) => {
            const duration = Date.now() - startTime;

            if (code === 0) {
                resolve({
                    simulation,
                    success: true,
                    duration,
                    error: null
                });
            } else {
                resolve({
                    simulation,
                    success: false,
                    duration,
                    error: 'Exit code: ' + code
                });
            }
        });

        child.on('error', (err) => {
            const duration = Date.now() - startTime;
            resolve({
                simulation,
                success: false,
                duration,
                error: err.message
            });
        });
    });
}

/**
 * Main function
 */
async function main() {
    console.log('\nA2A Simulation Runner - Run All');
    console.log('='.repeat(60));

    // Find all simulations
    const simulations = findSimulations(simulationsPath);

    if (simulations.length === 0) {
        console.log('No simulations found');
        process.exit(1);
    }

    console.log('Found ' + simulations.length + ' simulations:');
    simulations.forEach((sim, i) => {
        console.log('   ' + (i + 1) + '. ' + sim.id);
    });

    // Run all simulations
    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const simulation of simulations) {
        const result = await runSimulation(simulation);
        results.push(result);

        if (result.success) {
            successCount++;
            console.log('\nOK: ' + simulation.id + ' - ' + result.duration + 'ms');
        } else {
            failCount++;
            console.log('\nFAIL: ' + simulation.id + ' - ' + result.duration + 'ms - ' + result.error);
        }
    }

    // Final report
    console.log('\n' + '='.repeat(60));
    console.log('FINAL REPORT');
    console.log('='.repeat(60));
    console.log('   Total: ' + simulations.length);
    console.log('   OK: ' + successCount);
    console.log('   Failed: ' + failCount);
    console.log('='.repeat(60));

    // Details per simulation
    console.log('\nDetails:');
    results.forEach((result, i) => {
        const status = result.success ? 'OK' : 'FAIL';
        const duration = result.duration ? result.duration + 'ms' : '-';
        console.log('   ' + (i + 1) + '. ' + status + ' ' + result.simulation.id + ' (' + duration + ')');
        if (!result.success && result.error) {
            console.log('      Error: ' + result.error);
        }
    });

    // Save report
    const report = {
        timestamp: new Date().toISOString(),
        total: simulations.length,
        success: successCount,
        failed: failCount,
        results: results.map(r => ({
            id: r.simulation.id,
            category: r.simulation.category,
            success: r.success,
            duration: r.duration,
            error: r.error
        }))
    };

    const reportPath = join(simulationsPath, 'simulation-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log('\nReport saved: ' + reportPath);

    // Return error code if there are failures
    process.exit(failCount > 0 ? 1 : 0);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
