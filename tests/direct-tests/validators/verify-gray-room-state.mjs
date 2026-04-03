#!/usr/bin/env node
/**
 * Offline checks for sequence queue + predictions in a session context snapshot.
 * Usage:
 *   node tests/direct-tests/validators/verify-gray-room-state.mjs <path-to-json>
 *   npm run verify:gray-room -- <path-to-json>
 *   node tests/direct-tests/validators/verify-gray-room-state.mjs --stdin   # read JSON from stdin
 *
 * Accepted shapes:
 *   { "context": { "workbench", "history", "operationHistory" } }
 *   { "workbench", "history", "operationHistory" }  (treated as context)
 */

import fs from 'node:fs';
import path from 'node:path';

function normalizeSequence(raw) {
    if (raw == null) return null;
    if (Array.isArray(raw)) {
        const steps = raw;
        if (steps.length === 0) return null;
        return {steps, headIndex: 0};
    }
    if (typeof raw !== 'object') return null;
    const steps = raw.steps;
    if (!Array.isArray(steps) || steps.length === 0) return null;
    const hi = raw.headIndex;
    const headIndex =
        typeof hi === 'number' && hi >= 0 && hi < steps.length ? hi : 0;
    return {steps, headIndex};
}

function extractContext(payload) {
    if (payload.context && typeof payload.context === 'object') {
        return payload.context;
    }
    if (payload.workbench) return payload;
    return null;
}

function verify(context) {
    const issues = [];
    const wb = context.workbench;
    if (!wb || typeof wb !== 'object') {
        issues.push('missing context.workbench');
        return issues;
    }
    const sections = wb.sections;
    if (!sections || typeof sections !== 'object') {
        issues.push('missing context.workbench.sections');
        return issues;
    }
    const seq = normalizeSequence(sections.sequence);
    if (!seq) {
        issues.push('no sequence (optional): nothing to verify');
        return issues;
    }

    const {steps, headIndex} = seq;
    if (headIndex < 0 || headIndex > steps.length) {
        issues.push(`headIndex out of range: ${headIndex} (len=${steps.length})`);
    }

    for (let i = 0; i < headIndex && i < steps.length; i++) {
        const st = steps[i];
        if (st?.status !== 'complete') {
            issues.push(`step before head not complete: index ${i} id=${st?.id} status=${st?.status}`);
        }
    }

    for (let i = 0; i < steps.length; i++) {
        const st = steps[i];
        if (!st?.id || typeof st.id !== 'string') {
            issues.push(`step ${i}: missing id`);
        }
        if (!st?.title || typeof st.title !== 'string') {
            issues.push(`step ${i}: missing title`);
        }
        if (!st?.status) {
            issues.push(`step ${i}: missing status`);
        }
    }

    const pendingAfter = steps.slice(headIndex).filter((s) => s.status !== 'complete');
    const hasComplete = steps.some((s) => s.status === 'complete');
    const preds = sections.predictions;
    if (hasComplete && pendingAfter.length <= 2 && steps.length > 0) {
        const finals = Array.isArray(preds) ? preds.filter((p) => p?.kind === 'final_prediction') : [];
        if (finals.length === 0) {
            issues.push(
                `after at least one completed step, pending backlog <= 2 (${pendingAfter.length}) but no final_prediction in sections.predictions`
            );
        }
        for (const p of finals) {
            if (!p.at) issues.push('final_prediction missing at');
            if (!p.goal) issues.push('final_prediction missing goal');
        }
    }

    const history = context.history;
    if (Array.isArray(history)) {
        const completes = history.filter((h) => h?.type === 'step_complete');
        const completedSteps = steps.filter((s) => s.status === 'complete').length;
        if (completes.length < completedSteps) {
            issues.push(
                `history step_complete entries (${completes.length}) < completed steps (${completedSteps}) — history may be truncated`
            );
        }
    }

    const op = context.operationHistory;
    if (Array.isArray(op)) {
        const seqOps = op.filter((o) => o?.op === 'sequence_step_complete');
        const completes = Array.isArray(history)
            ? history.filter((h) => h?.type === 'step_complete').length
            : 0;
        if (completes > 0 && seqOps.length === 0) {
            issues.push('operationHistory has no sequence_step_complete but history has step_complete');
        }
    }

    return issues;
}

function readInput(argv) {
    if (argv.includes('--help') || argv.includes('-h')) {
        console.log(`Usage: node tests/direct-tests/validators/verify-gray-room-state.mjs <file.json> | --stdin`);
        console.log(`       npm run verify:gray-room -- <file.json>`);
        process.exit(0);
    }
    if (argv.includes('--stdin')) {
        return fs.readFileSync(0, 'utf8');
    }
    const file = argv.find((a) => !a.startsWith('-'));
    if (!file) {
        console.error('Expected file path or --stdin');
        process.exit(2);
    }
    const resolved = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
    return fs.readFileSync(resolved, 'utf8');
}

const text = readInput(process.argv.slice(2));
let payload;
try {
    payload = JSON.parse(text);
} catch (e) {
    console.error('Invalid JSON:', e.message);
    process.exit(2);
}

const context = extractContext(payload);
if (!context) {
    console.error('Could not find context (need .context or top-level .workbench)');
    process.exit(2);
}

const issues = verify(context);
if (issues.length === 0) {
    console.log('verify-gray-room-state: OK');
    process.exit(0);
}

console.error('verify-gray-room-state: issues:');
for (const i of issues) {
    console.error(`  - ${i}`);
}
process.exit(1);
