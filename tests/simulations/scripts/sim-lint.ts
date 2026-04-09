#!/usr/bin/env tsx

/**
 * CLI for lint checks of protocol simulations
 * Index module - re-exports from submodules
 */

import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {SIMULATIONS_DIR, getAllSimulations} from './sim-lint/registry.js';
import {lintSimulation} from './sim-lint/runners.js';
import {parseArgs, printHelp, formatResults} from './sim-lint/reporters.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

// ============================================

