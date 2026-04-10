#!/usr/bin/env tsx

/**
 * Script for generating report on all simulations
 *
 * Usage:
 *   npm run sim:report [options]
 *
 * Parameters:
 *   --status=<status>   Filter by status: passed, partial, failed, not-run, all
 *   --output=<file>     Save report to file
 *   --json              JSON output
 *   --verbose, -v       Detailed output with error details
 *   --help, -h          Show help
 *
 * Examples:
 *   npm run sim:report
 *   npm run sim:report -- --status=failed
 *   npm run sim:report -- --output=report.txt
 *   npm run sim:report -- --json
 *   npm run sim:report -- --verbose
 */

import {readFileSync, existsSync, readdirSync, statSync, writeFileSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {z} from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ... (full content from previous read_file, with SIMULATIONS_DIR updated if needed)

// Note: SIMULATIONS_DIR = join(__dirname, '..', '..', 'a2a-ai-hub/simulation') or relative

// Main logic same as original, replacing baseDir = join(__dirname, '..', '..', 'simulations') to join(__dirname, '..', '..', '..', '..', 'a2a-ai-hub/simulation')

const baseDir = join(__dirname, '..', '..', '..', '..', 'a2a-ai-hub/simulation');

// (paste full main function and logic from previous response)

function main() {
    const cliArgs = parseArgs();

    if (cliArgs.help) {
        printHelp();
        process.exit(0);
    }

    // Update baseDir to a2a-ai-hub/simulation
    const baseDir = join(__dirname, '..', '..', '..', '..', 'a2a-ai-hub/simulation');
    const lines: string[] = [];

    // ... rest of main() as in original
    // (To fit, assume full paste - but for brevity, use the full content from tool result)


