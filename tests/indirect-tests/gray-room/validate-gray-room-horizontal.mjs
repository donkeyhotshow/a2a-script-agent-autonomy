#!/usr/bin/env node
/**
 * Mama — Gray room (horizontal): validate ordered interrupt-handler chain from a saved snapshot.
 * Reads context.workbench.slots.interruptTrace (UA-S-01). No live stack.
 *
 * Usage:
 *   node tests/indirect-tests/gray-room/validate-gray-room-horizontal.mjs --snapshot <file.json> --spec <spec.json>
 *
 * Spec:
 *   { "expectedHandlerReasons": ["thinking", "auto_read_file"], "match": "exact" | "subsequence" }
 *   Uses trace entries with kind === "interrupt_handler" and their "reason" field.
 */

import fs from 'node:fs';
import path from 'node:path';

function readJson(p) {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function extractContext(payload) {
    if (payload?.context && typeof payload.context === 'object') return payload.context;
    if (payload?.workbench) return payload;
    return null;
}

function handlerReasonsFromTrace(trace) {
    if (!Array.isArray(trace)) return [];
    return trace.filter((e) => e && e.kind === 'interrupt_handler' && typeof e.reason === 'string').map((e) => e.reason);
}

function matchSequence(actual, expected, mode) {
    if (mode === 'exact') {
        if (actual.length !== expected.length) {
            return `length ${actual.length} !== expected ${expected.length}`;
        }
        for (let i = 0; i < expected.length; i++) {
            if (actual[i] !== expected[i]) return `at ${i}: got ${actual[i]}, want ${expected[i]}`;
        }
        return null;
    }
    // subsequence
    let j = 0;
    for (let i = 0; i < actual.length && j < expected.length; i++) {
        if (actual[i] === expected[j]) j++;
    }
    if (j < expected.length) {
        return `expected reasons not found in order: missing ${expected.slice(j).join(', ')}`;
    }
    return null;
}

function main() {
    const argv = process.argv.slice(2);
    if (argv.includes('--help') || argv.includes('-h')) {
        console.log(`Usage: node validate-gray-room-horizontal.mjs --snapshot <file.json> --spec <spec.json>`);
        process.exit(0);
    }
    const ni = argv.indexOf('--snapshot');
    const si = argv.indexOf('--spec');
    if (ni < 0 || si < 0 || !argv[ni + 1] || !argv[si + 1]) {
        console.error('Expected --snapshot <file.json> --spec <spec.json>');
        process.exit(2);
    }
    const snapPath = path.resolve(process.cwd(), argv[ni + 1]);
    const specPath = path.resolve(process.cwd(), argv[si + 1]);
    const payload = readJson(snapPath);
    const spec = readJson(specPath);
    const expected = spec.expectedHandlerReasons;
    const match = spec.match || 'subsequence';
    if (!Array.isArray(expected) || expected.length === 0) {
        console.error('spec.expectedHandlerReasons must be a non-empty array');
        process.exit(2);
    }
    if (match !== 'exact' && match !== 'subsequence') {
        console.error('spec.match must be "exact" or "subsequence"');
        process.exit(2);
    }

    const ctx = extractContext(payload);
    if (!ctx) {
        console.error('Could not extract context from snapshot');
        process.exit(2);
    }
    const slots = ctx.workbench?.slots;
    const trace = slots?.interruptTrace;
    const actual = handlerReasonsFromTrace(trace);
    const err = matchSequence(actual, expected, match);
    if (err) {
        console.error('validate-gray-room-horizontal: FAIL');
        console.error(`  ${err}`);
        console.error(`  actual handler reasons: ${JSON.stringify(actual)}`);
        console.error(`  expected: ${JSON.stringify(expected)} (${match})`);
        process.exit(1);
    }
    console.log(`validate-gray-room-horizontal: OK (${actual.length} handlers, ${expected.length} expected)`);
    process.exit(0);
}

main();
