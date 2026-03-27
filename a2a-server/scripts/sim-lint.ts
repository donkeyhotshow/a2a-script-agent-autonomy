#!/usr/bin/env tsx

/**
 * CLI для lint проверок симуляций протокола
 */

import {readFileSync, existsSync, readdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {INTERNAL_CLIENT_ACTION_KEYS} from '../../shared/internal-client-action-keys.mjs';
import {VALID_EXECUTE_KEYS} from '../src/actions/action-validator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

// ============================================
// Константы
// ============================================

const SIMULATIONS_DIR = join(__dirname, '..', '..', 'simulations');
/** Ephemeral capture from sim:run / invoke scripts — not a committed golden (see .gitignore). */
const SIMULATION_INVOKE_CAPTURE = 'invoke-capture.json';
const FORBIDDEN_STEP_JSON = new Set(['server-response.json']);
const REQUIRED_FILES = ['request.json', 'response.json', 'client.json', 'received.json'];
const OPTIONAL_FILES = ['server-transforms-request.json', 'server-transforms-response.json'];

/** Step-level Markdown docs ignored by this linter (no checks). See `simulations/SCHEMA.md` § supplementary interrupt. */
const SUPPLEMENTARY_STEP_MARKDOWN = ['interrupt.md'] as const;
void SUPPLEMENTARY_STEP_MARKDOWN;

/** Canonical allowlist — shared with runtime validation (`src/actions/action-validator.ts`). */
const VALID_EXECUTE_TYPES = [...VALID_EXECUTE_KEYS];

/** Keys stripped from `execute` for Web DTO — must not appear under top-level `execute` in golden `received.json`. Source: `shared/internal-client-action-keys.mjs`. */
const RECEIVED_EXECUTE_CLIENT_ONLY_KEYS = INTERNAL_CLIENT_ACTION_KEYS as readonly string[];

// ============================================
// Типы
// ============================================

interface LintError {
    path: string;
    message: string;
    severity: 'error' | 'warning';
    fixable: boolean;
}

interface FileLintResult {
    file: string;
    valid: boolean;
    errors: LintError[];
}

interface SimulationLintResult {
    name: string;
    path: string;
    valid: boolean;
    files: FileLintResult[];
    errors: LintError[];
}

interface CliArgs {
    sim: string | null;
    all: boolean;
    json: boolean;
    verbose: boolean;
    fix: boolean;
    help: boolean;
}

// ============================================
// Утилиты
// ============================================

function isKebabCase(str: string): boolean {
    return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(str);
}

function hasTrailingCommas(content: string): boolean {
    return /,\s*[\]}]/.test(content);
}

// ============================================
// Правила lint
// ============================================

function lintJsonFormat(filePath: string, content: string): LintError[] {
    const errors: LintError[] = [];

    if (hasTrailingCommas(content)) {
        errors.push({
            path: filePath,
            message: 'JSON contains trailing commas',
            severity: 'error',
            fixable: true
        });
    }

    try {
        JSON.parse(content);
    } catch (err: any) {
        errors.push({
            path: filePath,
            message: `Invalid JSON: ${err.message}`,
            severity: 'error',
            fixable: false
        });
    }

    return errors;
}

function lintDirectoryStructure(simPath: string, simName: string): LintError[] {
    const errors: LintError[] = [];

    // Only check kebab-case for root directory name (not nested like agent-coder/3)
    if (!simName.includes('/')) {
        if (!isKebabCase(simName)) {
            errors.push({
                path: simName,
                message: `Directory name should be kebab-case (e.g., 'my-simulation', not '${simName}')`,
                severity: 'error',
                fixable: false
            });
        }

        // Only check for description.md in root directories
        const descPath = join(simPath, 'description.md');
        if (!existsSync(descPath)) {
            errors.push({
                path: 'description.md',
                message: 'Missing description.md file',
                severity: 'warning',
                fixable: false
            });
        }
    }

    return errors;
}

function lintRequiredFiles(simPath: string): LintError[] {
    const errors: LintError[] = [];

    for (const filename of REQUIRED_FILES) {
        const filePath = join(simPath, filename);
        if (!existsSync(filePath)) {
            errors.push({
                path: filename,
                message: `Required file missing: ${filename}`,
                severity: 'error',
                fixable: false
            });
        }
    }

    return errors;
}

function lintReceivedJsonExecuteSanitized(data: any, filePath: string): LintError[] {
    const errors: LintError[] = [];
    const ex = data?.execute;
    if (!ex || typeof ex !== 'object' || Array.isArray(ex)) {
        return errors;
    }
    for (const key of RECEIVED_EXECUTE_CLIENT_ONLY_KEYS) {
        if (Object.prototype.hasOwnProperty.call(ex, key)) {
            errors.push({
                path: `${filePath}/execute.${key}`,
                message: `received.json execute must not contain client-only tool key "${key}" (Web DTO / buildWebExecute); keep tool payloads under result only`,
                severity: 'error',
                fixable: false
            });
        }
    }
    return errors;
}

function lintExecuteStructure(data: any, filePath: string): LintError[] {
    const errors: LintError[] = [];

    if (!data || typeof data !== 'object') {
        return errors;
    }

    if (data.execute) {
        if (typeof data.execute !== 'object') {
            errors.push({
                path: filePath,
                message: 'execute should be an object',
                severity: 'error',
                fixable: false
            });
            return errors;
        }

        const executeKeys = Object.keys(data.execute);
        if (executeKeys.length > 1) {
            errors.push({
                path: `${filePath}/execute`,
                message: `execute must have at most one action key (CLIENT-SDK-IDEAL); found: ${executeKeys.join(', ')}`,
                severity: 'error',
                fixable: false
            });
        }
        for (const key of executeKeys) {
            if (!VALID_EXECUTE_TYPES.includes(key)) {
                errors.push({
                    path: `${filePath}/execute.${key}`,
                    message: `Unknown execute type: '${key}'. Valid types: ${VALID_EXECUTE_TYPES.join(', ')}`,
                    severity: 'error',
                    fixable: false
                });
            }
        }
    }

    if (data.result) {
        const resultKeys = Object.keys(data.result);
        if (resultKeys.includes('content') && resultKeys.length === 1) {
            errors.push({
                path: `${filePath}/result.content`,
                message: 'Use action-key shape for result (e.g., { "read-file": { ... } }) instead of { content: "..." }',
                severity: 'warning',
                fixable: false
            });
        }
    }

    if (data.execute?.form?.choices) {
        const choices = data.execute.form.choices;
        for (let i = 0; i < choices.length; i++) {
            const choice = choices[i];
            if (!choice.id && !choice.value) {
                errors.push({
                    path: `${filePath}/execute.form.choices[${i}]`,
                    message: 'Choice should have "id" or "value" field',
                    severity: 'error',
                    fixable: false
                });
            }
        }
    }

    return errors;
}

function lintFirstRequest(data: any, filePath: string): LintError[] {
    const errors: LintError[] = [];

    if (!data || typeof data !== 'object') {
        return errors;
    }

    const keys = Object.keys(data);
    if (keys.length === 0) {
        errors.push({
            path: filePath,
            message: 'request.json is empty',
            severity: 'error',
            fixable: false
        });
    } else if (keys.length === 1 && keys[0] === 'task') {
        // OK
    } else if (keys.includes('task') && keys.length > 1) {
        errors.push({
            path: filePath,
            message: 'First request should have only "task" field',
            severity: 'warning',
            fixable: false
        });
    }

    return errors;
}

function lintFirstResponse(data: any, filePath: string): LintError[] {
    const errors: LintError[] = [];

    if (!data || typeof data !== 'object') {
        return errors;
    }

    if (!data.context) {
        errors.push({
            path: `${filePath}/context`,
            message: 'First response should have context',
            severity: 'warning',
            fixable: false
        });
    }

    const hasExecute = data.execute && Object.keys(data.execute).length > 0;
    const hasActions = data.actions && data.actions.length > 0;
    const hasAiActions = data.aiActions && data.aiActions.length > 0;

    if (!hasExecute && !hasActions && !hasAiActions) {
        errors.push({
            path: filePath,
            message: 'First response should have execute, actions, or aiActions',
            severity: 'warning',
            fixable: false
        });
    }

    return errors;
}

// ============================================
// Основные функции
// ============================================

function lintFile(filePath: string, filename: string, simPath: string, stepNumber: number | null, fix: boolean): FileLintResult {
    const result: FileLintResult = {
        file: filename,
        valid: true,
        errors: []
    };

    if (!existsSync(filePath)) {
        return result;
    }

    let content: string;
    try {
        content = readFileSync(filePath, 'utf-8');
    } catch (err: any) {
        result.valid = false;
        result.errors.push({
            path: filePath,
            message: `Cannot read file: ${err.message}`,
            severity: 'error',
            fixable: false
        });
        return result;
    }

    const formatErrors = lintJsonFormat(filePath, content);
    result.errors.push(...formatErrors);

    let data: any;
    try {
        data = JSON.parse(content);
    } catch {
        return result;
    }

    if (filename === 'response.json') {
        const executeErrors = lintExecuteStructure(data, filePath);
        result.errors.push(...executeErrors);
    }

    if (filename === 'received.json') {
        result.errors.push(...lintReceivedJsonExecuteSanitized(data, filePath));
    }

    if (stepNumber === 1) {
        if (filename === 'request.json') {
            result.errors.push(...lintFirstRequest(data, filePath));
        } else if (filename === 'response.json') {
            result.errors.push(...lintFirstResponse(data, filePath));
        }
    }

    // Fix trailing commas
    if (fix && formatErrors.some(e => e.fixable && e.message.includes('trailing'))) {
        const fixed = content.replace(/,(\s*[\]}])/g, '$1');
        try {
            writeFileSync(filePath, fixed, 'utf-8');
            console.log(`  ✅ Fixed trailing commas in ${filename}`);
        } catch (err: any) {
            result.errors.push({
                path: filePath,
                message: `Cannot fix trailing commas: ${err.message}`,
                severity: 'warning',
                fixable: false
            });
        }
    }

    if (result.errors.length > 0) {
        result.valid = result.errors.filter(e => e.severity === 'error').length === 0;
    }

    return result;
}

function lintSimulation(simPath: string, simName: string, fix: boolean): SimulationLintResult {
    const result: SimulationLintResult = {
        name: simName,
        path: simPath,
        valid: true,
        files: [],
        errors: []
    };

    const dirErrors = lintDirectoryStructure(simPath, simName);
    result.errors.push(...dirErrors);

    // Check root level files first
    // Check for step directories first (more common pattern)
    let foundSteps = false;
    if (existsSync(simPath)) {
        const entries = readdirSync(simPath, {withFileTypes: true});
        const substepDirRe = /^\d+-sub-\d+$/;

        for (const entry of entries) {
            // Check step directories (numeric like 1, 2, 3)
            if (entry.isDirectory() && /^\d+$/.test(entry.name)) {
                foundSteps = true;
                const stepPath = join(simPath, entry.name);
                const stepNum = parseInt(entry.name);

                try {
                    const stepFiles = readdirSync(stepPath);
                    for (const stepFile of stepFiles) {
                        if (!stepFile.endsWith('.json')) continue;
                        if (FORBIDDEN_STEP_JSON.has(stepFile)) {
                            result.errors.push({
                                path: `${entry.name}/${stepFile}`,
                                message: `Forbidden artifact in golden step: ${stepFile}. Use response.json + received.json; capture runs write ${SIMULATION_INVOKE_CAPTURE} (gitignored). See AGENTS.md / simulations/SCHEMA.md.`,
                                severity: 'error',
                                fixable: false
                            });
                            continue;
                        }
                        const filePath = join(stepPath, stepFile);
                        const fileResult = lintFile(filePath, stepFile, simPath, stepNum, fix);
                        result.files.push(fileResult);
                    }
                } catch {
                    // Skip if cannot read
                }
            } else if (entry.isDirectory() && substepDirRe.test(entry.name)) {
                foundSteps = true;
                const subPath = join(simPath, entry.name);
                const parentStep = parseInt(entry.name.split('-')[0], 10);
                try {
                    for (const subFile of readdirSync(subPath)) {
                        if (!subFile.endsWith('.json')) continue;
                        if (FORBIDDEN_STEP_JSON.has(subFile)) {
                            result.errors.push({
                                path: `${entry.name}/${subFile}`,
                                message: `Forbidden artifact in interrupt substep: ${subFile}. Use response.json; capture runs write ${SIMULATION_INVOKE_CAPTURE}.`,
                                severity: 'error',
                                fixable: false
                            });
                            continue;
                        }
                        const filePath = join(subPath, subFile);
                        const fileResult = lintFile(filePath, subFile, simPath, parentStep, fix);
                        result.files.push(fileResult);
                    }
                } catch {
                    // Skip if cannot read
                }
            }
        }
    }

    // If no step directories, check root level files
    if (!foundSteps) {
        const requiredErrors = lintRequiredFiles(simPath);
        result.errors.push(...requiredErrors);
        
        // Also check root level JSON files
        if (existsSync(simPath)) {
            const entries = readdirSync(simPath, {withFileTypes: true});
            for (const entry of entries) {
                if (entry.isFile() && entry.name.endsWith('.json')) {
                    const filePath = join(simPath, entry.name);
                    const stepMatch = entry.name.match(/^(\d+)\//);
                    const stepNumber = stepMatch ? parseInt(stepMatch[1]) : null;
                    const fileResult = lintFile(filePath, entry.name, simPath, stepNumber, fix);
                    result.files.push(fileResult);
                }
            }
        }
    } else {
        // Numbered steps: any folder with request.json must have the full step bundle
        const substepDirReNum = /^\d+-sub-\d+$/;
        for (const entry of readdirSync(simPath, {withFileTypes: true})) {
            if (!entry.isDirectory()) continue;
            if (substepDirReNum.test(entry.name)) continue;
            if (!/^\d+$/.test(entry.name)) continue;
            const stepPath = join(simPath, entry.name);
            if (!existsSync(join(stepPath, 'request.json'))) continue;
            for (const filename of REQUIRED_FILES) {
                const filePath = join(stepPath, filename);
                if (!existsSync(filePath)) {
                    result.errors.push({
                        path: `${entry.name}/${filename}`,
                        message: `Required file missing: ${entry.name}/${filename}`,
                        severity: 'error',
                        fixable: false
                    });
                }
            }
        }
    }

    const hasErrors = result.errors.some(e => e.severity === 'error');
    const hasFileErrors = result.files.some(f => !f.valid);

    result.valid = !hasErrors && !hasFileErrors;

    return result;
}

function getAllSimulations(): {path: string; name: string}[] {
    const simulations: {path: string; name: string}[] = [];

    if (!existsSync(SIMULATIONS_DIR)) {
        return simulations;
    }

    const entries = readdirSync(SIMULATIONS_DIR, {withFileTypes: true});

    for (const entry of entries) {
        if (entry.isDirectory()) {
            const subDir = join(SIMULATIONS_DIR, entry.name);

            if (existsSync(subDir)) {
                try {
                    const subEntries = readdirSync(subDir, {withFileTypes: true});

                    const substepDirRe = /^\d+-sub-\d+$/;
                    for (const subEntry of subEntries) {
                        if (!subEntry.isDirectory()) continue;
                        if (substepDirRe.test(subEntry.name)) continue;
                        simulations.push({
                            path: join(subDir, subEntry.name),
                            name: `${entry.name}/${subEntry.name}`
                        });
                    }

                    const mainSimPath = join(SIMULATIONS_DIR, entry.name);
                    if (existsSync(join(mainSimPath, 'request.json'))) {
                        simulations.push({
                            path: mainSimPath,
                            name: entry.name
                        });
                    }
                } catch {
                    // Ignore
                }
            }
        }
    }

    return simulations;
}

// ============================================
// CLI
// ============================================

function parseArgs(): CliArgs {
    const args = process.argv.slice(2);

    let sim: string | null = null;

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg === '--sim' && i + 1 < args.length) {
            sim = args[i + 1];
            i++;
        }
    }

    return {
        sim,
        all: args.includes('--all'),
        json: args.includes('--json') || args.includes('-j'),
        verbose: args.includes('--verbose') || args.includes('-v'),
        fix: args.includes('--fix'),
        help: args.includes('--help') || args.includes('-h'),
    };
}

function printHelp() {
    console.log(`
🛠️  Simulation Linter CLI

Usage: npm run sim:lint [options]

Options:
  --sim <name>       Simulation name to check
  --all              Check all simulations
  --json, -j         JSON output
  --verbose, -v      Verbose output
  --fix              Auto-fix issues (trailing commas)
  --help, -h         Show help

Examples:
  npm run sim:lint -- --sim agent-coder/3
  npm run sim:lint -- --all --verbose
  npm run sim:lint -- --all --fix
`);
}

function formatResults(results: SimulationLintResult[], json: boolean, verbose: boolean): void {
    if (json) {
        const output = {
            valid: results.every(r => r.valid),
            simulations: results.map(r => ({
                name: r.name,
                valid: r.valid,
                errors: r.errors,
                files: r.files.map(f => ({
                    file: f.file,
                    valid: f.valid,
                    errors: f.errors
                }))
            }))
        };
        console.log(JSON.stringify(output, null, 2));
        return;
    }

    console.log('\n📋 Simulation lint results:\n');

    let totalErrors = 0;
    let totalWarnings = 0;

    for (const result of results) {
        const status = result.valid ? '✅' : '❌';
        console.log(`${status} ${result.name}`);

        if (result.errors.length > 0) {
            console.log(`   Errors/warnings:`);
            result.errors.forEach(err => {
                const symbol = err.severity === 'error' ? '❌' : '⚠️';
                const path = err.path ? `[${err.path}] ` : '';
                console.log(`     ${symbol} ${path}${err.message}`);
                if (err.severity === 'error') totalErrors++;
                else totalWarnings++;
            });
        }

        if (verbose) {
            console.log(`   Files:`);
            for (const file of result.files) {
                const fileStatus = file.valid ? '✅' : '❌';
                console.log(`     ${fileStatus} ${file.file}`);
                if (!file.valid && file.errors.length > 0) {
                    file.errors.forEach(err => {
                        const symbol = err.severity === 'error' ? '❌' : '⚠️';
                        console.log(`       ${symbol} ${err.message}`);
                    });
                }
            }
        }

        console.log('');
    }

    const allValid = results.every(r => r.valid);
    const symbol = allValid ? '✅' : '❌';

    console.log('─────────────────────────────────────────');
    console.log(`${symbol} Total: ${results.length} simulations`);

    if (totalErrors > 0) {
        console.log(`   ❌ Errors: ${totalErrors}`);
    }

    if (totalWarnings > 0) {
        console.log(`   ⚠️  Warnings: ${totalWarnings}`);
    }
}

function main() {
    const args = parseArgs();

    if (args.help) {
        printHelp();
        process.exit(0);
    }

    if (!args.sim && !args.all) {
        console.error('❌ Error: specify simulation or use --all');
        console.error('   Usage: npm run sim:lint -- --sim <name>');
        console.error('   Example: npm run sim:lint -- --sim agent-coder/3');
        console.error('   Help: npm run sim:lint -- --help');
        process.exit(1);
    }

    const results: SimulationLintResult[] = [];

    if (args.all) {
        const simulations = getAllSimulations();

        if (simulations.length === 0) {
            console.log('⚠️  No simulations found');
            process.exit(0);
        }

        console.log(`📂 Found ${simulations.length} simulations\n`);

        for (const sim of simulations) {
            const result = lintSimulation(sim.path, sim.name, args.fix);
            results.push(result);
        }
    } else if (args.sim) {
        const simPath = join(SIMULATIONS_DIR, args.sim);
        const result = lintSimulation(simPath, args.sim, args.fix);
        results.push(result);
    }

    formatResults(results, args.json, args.verbose);

    const hasErrors = results.some(r => !r.valid);
    process.exit(hasErrors ? 1 : 0);
}

main();
