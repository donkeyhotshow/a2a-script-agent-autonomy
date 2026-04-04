#!/usr/bin/env node
/**
 * Mama — offline audit: execute/result action-key shape under simulations/sync (each step/response.json).
 * Scans numeric steps and N-sub-M substeps (matches sim-workbench-validate step dirs).
 * Exit 1 if any simulation response violates the contract.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const SIM_DIR = path.join(REPO_ROOT, 'simulations', 'sync');

const TOOL_KEYS = new Set([
    'rag-search',
    'read-file',
    'write-file',
    'execute-command',
    'list-directory',
    'grep-search',
    'script',
    'file-exists',
    'edit-patch',
    'run-script',
    'dialog',
]);

function isStepDir(name) {
    return /^\d+$/.test(name) || /^\d+-sub-\d+$/.test(name);
}

function findViolations(jsonPath) {
    const violations = [];
    let data;
    try {
        data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    } catch (e) {
        return [{ type: 'PARSE_ERROR', message: String(e.message) }];
    }

    const payload = data?.session ?? data?.data ?? data;
    if (!payload || typeof payload !== 'object') return [];

    const execute = payload.execute;
    if (!execute || typeof execute !== 'object') return [];

    const keys = Object.keys(execute).filter((k) => execute[k] !== undefined && execute[k] !== null);
    const toolKeys = keys.filter((k) => TOOL_KEYS.has(k));
    const hasForm = keys.includes('form');
    const hasMessage = keys.includes('message');

    if (toolKeys.length > 0 && hasMessage) {
        violations.push({
            type: 'MESSAGE_WITH_TOOL',
            message: `execute has both message and tool keys: ${toolKeys.join(',')}`,
        });
    }

    if (toolKeys.length > 1) {
        violations.push({
            type: 'MULTI_TOOL',
            message: `execute has multiple tool keys: ${toolKeys.join(',')}`,
        });
    }

    if (keys.length > 2 && !keys.includes('_meta')) {
        violations.push({
            type: 'MULTI_KEY_EXECUTE',
            message: `execute has ${keys.length} keys: ${keys.join(',')}`,
        });
    }

    if (execute.action && typeof execute.action === 'string' && keys.length > 1) {
        violations.push({
            type: 'FLAT_ACTION',
            message: `execute uses flat action key with params: action=${execute.action}`,
        });
    }

    const result = payload.result;
    if (result && typeof result === 'object' && !Array.isArray(result)) {
        const rkeys = Object.keys(result);
        if (rkeys.length === 1 && rkeys[0] === 'content') {
            violations.push({ type: 'RESULT_BARE_CONTENT', message: 'legacy result { content }' });
        }
        if (rkeys.length === 1 && rkeys[0] === 'results') {
            violations.push({ type: 'RESULT_BARE_RESULTS', message: 'legacy result { results }' });
        }
    }

    return violations;
}

function scanSimulations() {
    const results = [];
    if (!fs.existsSync(SIM_DIR)) {
        return { results, filesScanned: 0 };
    }
    let filesScanned = 0;
    const categories = fs.readdirSync(SIM_DIR, { withFileTypes: true }).filter((d) => d.isDirectory());

    for (const ent of categories) {
        const catPath = path.join(SIM_DIR, ent.name);
        const stepDirs = fs.readdirSync(catPath, { withFileTypes: true }).filter((d) => d.isDirectory() && isStepDir(d.name));

        for (const sd of stepDirs) {
            const responsePath = path.join(catPath, sd.name, 'response.json');
            if (!fs.existsSync(responsePath)) continue;
            filesScanned++;
            const violations = findViolations(responsePath);
            if (violations.length > 0) {
                results.push({
                    file: path.relative(REPO_ROOT, responsePath),
                    violations,
                });
            }
        }
    }

    return { results, filesScanned };
}

function main() {
    const { results, filesScanned } = scanSimulations();

    if (results.length === 0) {
        console.log(`audit-execute-shape-simulations: OK (${filesScanned} response.json scanned)`);
        process.exit(0);
    }

    console.error('audit-execute-shape-simulations: FAIL');
    console.error(`Files scanned: ${filesScanned}`);
    console.error(`Files with violations: ${results.length}\n`);
    for (const r of results) {
        console.error(`${r.file}:`);
        for (const v of r.violations) {
            console.error(`  [${v.type}] ${v.message}`);
        }
    }
    process.exit(1);
}

main();
