#!/usr/bin/env node
/**
 * Run all indirect tests (Mama layer).
 * No live stack required — validates code, schemas, and configuration.
 *
 * Usage:
 *   node tests/integration/indirect-tests/run-all.mjs
 *   node tests/integration/indirect-tests/run-all.mjs --json
 */

import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
/** Repo root: indirect-tests → integration → tests → root */
const repoRoot = resolve(__dirname, '..', '..', '..');
const tests = [
    { name: 'Action Registry', cmd: ['node', join(__dirname, 'validate-action-registry.mjs')] },
    { name: 'Request Schemas', cmd: ['node', join(__dirname, 'validate-request-schemas.mjs')] },
    { name: 'Import Extensions', cmd: ['node', join(__dirname, 'validate-import-extensions.mjs')] },
    { name: 'Prompts', cmd: ['node', join(__dirname, 'validate-prompts.mjs')] },
    {
        name: 'Mama Red (vertical example)',
        cmd: [
            'node',
            join(__dirname, 'red-room', 'validate-red-room-dialog-vertical.mjs'),
            '--base',
            join(__dirname, 'red-room', 'fixtures', 'example-vertical'),
            '--spec',
            join(__dirname, 'red-room', 'fixtures', 'example-vertical.spec.json'),
        ],
    },
    {
        name: 'Mama Red (realistic sim/agent)',
        cmd: [
            'node',
            join(__dirname, 'red-room', 'validate-red-room-dialog-vertical.mjs'),
            '--base',
            repoRoot,
            '--spec',
            join(__dirname, 'red-room', 'fixtures', 'sim-agent-vertical.spec.json'),
        ],
    },
    {
        name: 'Mama Gray (horizontal example)',
        cmd: [
            'node',
            join(__dirname, 'gray-room', 'validate-gray-room-horizontal.mjs'),
            '--snapshot',
            join(__dirname, 'gray-room', 'fixtures', 'example-horizontal-snapshot.json'),
            '--spec',
            join(__dirname, 'gray-room', 'fixtures', 'example-horizontal.spec.json'),
        ],
    },
    {
        name: 'Mama Gray (compress_history)',
        cmd: [
            'node',
            join(__dirname, 'gray-room', 'validate-gray-room-horizontal.mjs'),
            '--snapshot',
            join(__dirname, 'gray-room', 'fixtures', 'compress-history-snapshot.json'),
            '--spec',
            join(__dirname, 'gray-room', 'fixtures', 'compress-history.spec.json'),
        ],
    },
    {
        name: 'Mama Gray (clarify)',
        cmd: [
            'node',
            join(__dirname, 'gray-room', 'validate-gray-room-horizontal.mjs'),
            '--snapshot',
            join(__dirname, 'gray-room', 'fixtures', 'clarify-snapshot.json'),
            '--spec',
            join(__dirname, 'gray-room', 'fixtures', 'clarify.spec.json'),
        ],
    },
    {
        name: 'Mama Gray (algorithm_invoke)',
        cmd: [
            'node',
            join(__dirname, 'gray-room', 'validate-gray-room-horizontal.mjs'),
            '--snapshot',
            join(__dirname, 'gray-room', 'fixtures', 'algorithm-invoke-snapshot.json'),
            '--spec',
            join(__dirname, 'gray-room', 'fixtures', 'algorithm-invoke.spec.json'),
        ],
    },
    {
        name: 'Mama Sticky Router Audit',
        cmd: ['node', join(__dirname, '..', '..', 'indirect-tests', 'validators', 'audit-sticky-router.mjs')],
    },
    {
        name: 'Mama Execute Shape (simulations/sync)',
        cmd: ['node', join(__dirname, '..', '..', 'indirect-tests', 'validators', 'audit-execute-shape-simulations.mjs')],
    },
    {
        name: 'Mama Sim Choice Descriptions',
        cmd: ['node', join(__dirname, '..', 'direct-tests', 'validators', 'audit-sim-choice-descriptions.mjs')],
    },
    {
        name: 'Mama Gray Room Sequence (verify-gray-room-state)',
        cmd: [
            'node',
            join(__dirname, '..', 'direct-tests', 'validators', 'verify-gray-room-state.mjs'),
            join(__dirname, 'gray-room', 'fixtures', 'sequence-workbench-snapshot.json'),
        ],
    },
];

const results = [];
let allPassed = true;

console.log('=== Indirect Tests (Мама) ===\n');

for (const test of tests) {
    process.stdout.write(`${test.name}... `);
    const result = spawnSync(process.execPath, test.cmd.slice(1), {
        cwd: repoRoot,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
    });

    const passed = result.status === 0;
    results.push({ name: test.name, passed, exitCode: result.status, output: result.stdout, error: result.stderr });

    if (passed) {
        console.log('✓ PASS');
    } else {
        console.log('✗ FAIL');
        allPassed = false;
    }
}

console.log('\n=== Summary ===');
const passedCount = results.filter(r => r.passed).length;
console.log(`${passedCount}/${results.length} passed`);

if (!allPassed) {
    console.log('\nFailed tests:');
    for (const r of results.filter(r => !r.passed)) {
        console.log(`  - ${r.name} (exit ${r.exitCode})`);
    }
}

if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ passed: allPassed, results }, null, 2));
}

process.exit(allPassed ? 0 : 1);
