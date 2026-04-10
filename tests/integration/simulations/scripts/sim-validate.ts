#!/usr/bin/env tsx

/**
 * CLI for validation and checking protocol simulations
 *
 * Modular structure (`scripts/sim-validate/`):
 * - scanner.ts    - scanning simulations
 * - validators.ts - validation by schemas
 * - reporters.ts  - reports and `main()`
 *
 * Usage:
 *   npm run sim:validate <sim-dir> [options]
 *   npm run sim:validate --all [options]
 *
 * Options:
 *   --sim <name>       Simulation name for validation
 *   --all              Validate all simulations
 *   --json             JSON output
 *   --verbose, -v      Detailed output
 *   --strict           No normalization and full AJV check server-transforms-*.json
 *   --skip-substeps    Exclude N-sub-M folders from --all (included by default)
 *   --help, -h         Show help
 *
 * Examples:
 *   npm run sim:validate -- --sim agent-coder/3
 *   npm run sim:validate -- --all --verbose
 *   npm run sim:validate -- --sim agent-coder/3 --json
 */

import {main} from './sim-validate/reporters.js';

main();
