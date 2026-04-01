#!/usr/bin/env node
/**
 * Compare first ```json fenced block in request.md / response.md to sibling request.json / response.json.
 * Default: exit 0 (report only). Pass `--fail` to exit 1 when any mismatch (CI opt-in).
 * Pass `--fix` to rewrite the first ```json fence to match sibling JSON.
 * See simulations/SIM-AUDIT-WORKBOOK.md.
 */
import {readdirSync, readFileSync, writeFileSync, statSync, existsSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SIM_ROOT = join(__dirname, '..', '..', 'simulations');

function firstJsonFence(md) {
    const m = md.match(/```json\s*([\s\S]*?)```/);
    if (!m) return null;
    try {
        return JSON.parse(m[1].trim());
    } catch {
        return null;
    }
}

function checkPair(stepDir, mdName, jsonName) {
    const mdPath = join(stepDir, mdName);
    const jsonPath = join(stepDir, jsonName);
    if (!existsSync(mdPath) || !existsSync(jsonPath)) return null;
    const md = readFileSync(mdPath, 'utf8');
    const fromMd = firstJsonFence(md);
    if (fromMd === null) return null;
    const fromJson = JSON.parse(readFileSync(jsonPath, 'utf8'));
    if (!isDeepStrictEqual(fromMd, fromJson)) {
        return {stepDir, mdName, jsonName};
    }
    return null;
}

/** Replace the first ```json … ``` block with pretty-printed JSON (must match sibling *.json for sim:check-md). */
function replaceFirstJsonFence(md, jsonObj) {
    const pretty = JSON.stringify(jsonObj, null, 2);
    if (!/```json\s*[\s\S]*?```/.test(md)) return null;
    return md.replace(/```json\s*[\s\S]*?```/, '```json\n' + pretty + '\n```');
}

function fixPair(stepDir, mdName, jsonName) {
    const mdPath = join(stepDir, mdName);
    const jsonPath = join(stepDir, jsonName);
    if (!existsSync(mdPath) || !existsSync(jsonPath)) return false;
    const fromJson = JSON.parse(readFileSync(jsonPath, 'utf8'));
    const md = readFileSync(mdPath, 'utf8');
    const fromMd = firstJsonFence(md);
    if (fromMd === null) return false;
    if (isDeepStrictEqual(fromMd, fromJson)) return false;
    const next = replaceFirstJsonFence(md, fromJson);
    if (next === null) return false;
    writeFileSync(mdPath, next, 'utf8');
    return true;
}

function main() {
    const fail = process.argv.includes('--fail');
    const fix = process.argv.includes('--fix');
    if (!existsSync(SIM_ROOT)) {
        console.error('No simulations dir:', SIM_ROOT);
        process.exit(2);
    }
    const mismatches = [];
    function scanDir(dir) {
        for (const name of readdirSync(dir)) {
            const p = join(dir, name);
            if (statSync(p).isDirectory()) {
                if (/^\d+$/.test(name) || /^\d+-sub-\d+$/.test(name)) {
                    for (const pair of [
                        ['request.md', 'request.json'],
                        ['response.md', 'response.json'],
                    ]) {
                        const bad = checkPair(p, pair[0], pair[1]);
                        if (bad) mismatches.push(bad);
                    }
                }
                scanDir(p);
            }
        }
    }
    scanDir(SIM_ROOT);

    if (fix) {
        let n = 0;
        for (const m of mismatches) {
            if (fixPair(m.stepDir, m.mdName, m.jsonName)) n += 1;
        }
        console.log(`check-sim-md-json-drift --fix: updated ${n} file(s).`);
        const after = [];
        function rescan(dir) {
            for (const name of readdirSync(dir)) {
                const p = join(dir, name);
                if (statSync(p).isDirectory()) {
                    if (/^\d+$/.test(name) || /^\d+-sub-\d+$/.test(name)) {
                        for (const pair of [
                            ['request.md', 'request.json'],
                            ['response.md', 'response.json'],
                        ]) {
                            const bad = checkPair(p, pair[0], pair[1]);
                            if (bad) after.push(bad);
                        }
                    }
                    rescan(p);
                }
            }
        }
        rescan(SIM_ROOT);
        if (after.length > 0) {
            console.warn(`check-sim-md-json-drift: ${after.length} mismatch(es) remain after --fix:`);
            for (const m of after) console.warn(`  ${m.stepDir}: ${m.mdName} vs ${m.jsonName}`);
            process.exit(1);
        }
        console.log('check-sim-md-json-drift: no mismatches after --fix.');
        process.exit(0);
    }

    if (mismatches.length === 0) {
        console.log('check-sim-md-json-drift: no mismatches (or no comparable fenced JSON).');
        process.exit(0);
    }
    console.warn(`check-sim-md-json-drift: ${mismatches.length} mismatch(es) (fix MD or JSON, or ignore if intentional):`);
    for (const m of mismatches) {
        console.warn(`  ${m.stepDir}: ${m.mdName} vs ${m.jsonName}`);
    }
    process.exit(fail ? 1 : 0);
}

main();
