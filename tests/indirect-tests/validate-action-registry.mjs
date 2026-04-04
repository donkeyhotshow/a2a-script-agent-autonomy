#!/usr/bin/env node
/**
 * Validate a2a-server action layout (registry + handlers + YAML router actions).
 * No live stack required.
 *
 * Usage:
 *   node tests/indirect-tests/validate-action-registry.mjs
 *   node tests/indirect-tests/validate-action-registry.mjs --json
 */

import { readdirSync, existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const serverRoot = join(repoRoot, 'a2a-server');
const actionsDir = join(serverRoot, 'src', 'actions');
const yamlActionsDir = join(actionsDir, 'definitions', 'yaml', 'actions');

let exitCode = 0;
const errors = [];

function error(msg) {
    errors.push(msg);
    exitCode = 1;
}

if (!existsSync(actionsDir)) {
    console.error(`Actions directory not found: ${actionsDir}`);
    process.exit(1);
}

const requiredFiles = [
    join(actionsDir, 'action-registry.ts'),
    join(actionsDir, 'action-handler-registry.ts'),
    join(actionsDir, 'handlers', 'index.ts'),
    join(actionsDir, 'action-processor.ts'),
];

for (const p of requiredFiles) {
    if (!existsSync(p)) {
        error(`Missing required file: ${p}`);
    }
}

if (!existsSync(yamlActionsDir)) {
    error(`YAML actions dir missing: ${yamlActionsDir}`);
} else {
    const yamls = readdirSync(yamlActionsDir).filter(
        (f) => f.endsWith('.yaml') || f.endsWith('.yml')
    );
    if (yamls.length === 0) {
        error('No .yaml/.yml files under definitions/yaml/actions');
    } else {
        console.log(`Found ${yamls.length} YAML action definition(s)`);
    }
}

if (errors.length > 0) {
    console.error('\n=== Action Registry Validation FAILED ===');
    for (const e of errors) {
        console.error(`  ✗ ${e}`);
    }
    console.error(`\nTotal errors: ${errors.length}`);
} else {
    console.log('\n=== Action Registry Validation OK ===');
    console.log('  ✓ Core registry + handler entrypoints present');
}

if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ ok: exitCode === 0, errors }, null, 2));
}

process.exit(exitCode);
