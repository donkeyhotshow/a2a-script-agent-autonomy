#!/usr/bin/env node
/**
 * Mama — Red room (vertical): validate an ordered dialog/session flow from disk.
 * No live stack. Compares each step's server-response-shaped JSON to a spec.
 *
 * Usage:
 *   node tests/indirect-tests/red-room/validate-red-room-dialog-vertical.mjs --base <dir> --spec <spec.json>
 *
 * --base: folder containing step subdirs (e.g. 1/, 2/) with server-response.json,
 *         OR flat layout if spec uses readFrom paths relative to --base.
 * --spec: JSON manifest (see fixtures/example-vertical.spec.json).
 */

import fs from 'node:fs';
import path from 'node:path';

function readJson(p) {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function unwrapSessionLike(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (obj.session && typeof obj.session === 'object') return obj.session;
    if (obj.data && typeof obj.data === 'object' && obj.data.execute !== undefined) return obj.data;
    return obj;
}

function executeActionKey(execute) {
    if (!execute || typeof execute !== 'object') return null;
    const keys = Object.keys(execute).filter((k) => !k.startsWith('_'));
    if (keys.length !== 1) return null;
    return keys[0];
}

function runStep(base, stepDef, index) {
    const issues = [];
    const rel = stepDef.readFrom || `${stepDef.stepFolder || index + 1}/server-response.json`;
    const filePath = path.resolve(base, rel);
    if (!fs.existsSync(filePath)) {
        issues.push(`step ${index + 1}: missing file ${rel}`);
        return issues;
    }
    let payload;
    try {
        payload = readJson(filePath);
    } catch (e) {
        issues.push(`step ${index + 1}: invalid JSON ${rel}: ${e.message}`);
        return issues;
    }
    const session = unwrapSessionLike(payload);
    const ex = session?.execute;
    const ctx = session?.context;
    const expect = stepDef.expect || {};

    if (expect.executeSingleKey) {
        const k = executeActionKey(ex);
        if (!k) issues.push(`step ${index + 1}: execute is not a single action key`);
    }
    if (expect.executeAction) {
        const k = executeActionKey(ex);
        if (k !== expect.executeAction) {
            issues.push(`step ${index + 1}: expected execute.${expect.executeAction}, got ${k}`);
        }
    }
    if (typeof expect.formChoicesMin === 'number') {
        const form = ex?.form;
        const choices = form?.choices;
        const n = Array.isArray(choices) ? choices.length : 0;
        if (n < expect.formChoicesMin) {
            issues.push(`step ${index + 1}: form.choices length ${n} < min ${expect.formChoicesMin}`);
        }
    }
    if (expect.executionAction) {
        const a = ctx?.execution?.action;
        if (a !== expect.executionAction) {
            issues.push(`step ${index + 1}: expected context.execution.action=${expect.executionAction}, got ${a}`);
        }
    }
    if (expect.executionStep) {
        const s = ctx?.execution?.step;
        if (s !== expect.executionStep) {
            issues.push(`step ${index + 1}: expected context.execution.step=${expect.executionStep}, got ${s}`);
        }
    }
    return issues;
}

function main() {
    const argv = process.argv.slice(2);
    if (argv.includes('--help') || argv.includes('-h')) {
        console.log(`Usage: node validate-red-room-dialog-vertical.mjs --base <dir> --spec <spec.json>`);
        process.exit(0);
    }
    const bi = argv.indexOf('--base');
    const si = argv.indexOf('--spec');
    if (bi < 0 || si < 0 || !argv[bi + 1] || !argv[si + 1]) {
        console.error('Expected --base <dir> --spec <spec.json>');
        process.exit(2);
    }
    const base = path.resolve(process.cwd(), argv[bi + 1]);
    const specPath = path.resolve(process.cwd(), argv[si + 1]);
    const spec = readJson(specPath);
    const steps = spec.steps;
    if (!Array.isArray(steps) || steps.length === 0) {
        console.error('spec.steps must be a non-empty array');
        process.exit(2);
    }
    const all = [];
    for (let i = 0; i < steps.length; i++) {
        all.push(...runStep(base, steps[i], i));
    }
    if (all.length > 0) {
        console.error('validate-red-room-dialog-vertical: FAIL');
        for (const m of all) console.error(`  - ${m}`);
        process.exit(1);
    }
    console.log(`validate-red-room-dialog-vertical: OK (${steps.length} steps)`);
    process.exit(0);
}

main();
