/**
 * Registry: types, constants, and lint rules for simulation validation
 */

import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {INTERNAL_CLIENT_ACTION_KEYS} from '../../../shared/internal-client-action-keys.mjs';
import {VALID_EXECUTE_KEYS} from '../../src/actions/action-validator.js';
import {noLlmStepTransformContractWarnings} from '../sim-contract/step-transform-rules.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

// ============================================
// Константы
// ============================================

export const SIMULATIONS_DIR = join(__dirname, '..', '..', '..', 'simulations');
/** Ephemeral capture from sim:run / invoke scripts — not a committed golden (see .gitignore). */
export const SIMULATION_INVOKE_CAPTURE = 'invoke-capture.json';
export const FORBIDDEN_STEP_JSON = new Set(['server-response.json']);
export const REQUIRED_FILES = ['request.json', 'response.json', 'client.json', 'received.json'];
export const OPTIONAL_FILES = ['server-transforms-request.json', 'server-transforms-response.json'];

/** Step-level Markdown docs ignored by this linter (no checks). See `simulations/SCHEMA.md` § supplementary interrupt. */
export const SUPPLEMENTARY_STEP_MARKDOWN = ['interrupt.md'] as const;

/** Canonical allowlist — shared with runtime validation (`src/actions/action-validator.ts`). */
export const VALID_EXECUTE_TYPES = [...VALID_EXECUTE_KEYS];

/** Keys stripped from `execute` for Web DTO — must not appear under top-level `execute` in golden `received.json`. Source: `shared/internal-client-action-keys.mjs`. */
export const RECEIVED_EXECUTE_CLIENT_ONLY_KEYS = INTERNAL_CLIENT_ACTION_KEYS as readonly string[];

// ============================================
// Типы
// ============================================

export interface LintError {
    path: string;
    message: string;
    severity: 'error' | 'warning';
    fixable: boolean;
}

export interface FileLintResult {
    file: string;
    valid: boolean;
    errors: LintError[];
}

export interface SimulationLintResult {
    name: string;
    path: string;
    valid: boolean;
    files: FileLintResult[];
    errors: LintError[];
}

export interface CliArgs {
    sim: string | null;
    all: boolean;
    json: boolean;
    verbose: boolean;
    fix: boolean;
    help: boolean;
    /** SCHEMA.md no-LLM step transform checks (same messages as `sim-validate --step-contract`). */
    stepContract: boolean;
}

/** Optional warnings: no-LLM step vs `server-transforms-*.json` (UA-S-02 / `scripts/sim-contract/step-transform-rules.ts`). */
export function lintStepTransformContract(stepDir: string, stepRelativePath: string): LintError[] {
    return noLlmStepTransformContractWarnings(stepDir).map((message) => ({
        path: stepRelativePath || '.',
        message,
        severity: 'warning' as const,
        fixable: false,
    }));
}

// ============================================
// Утилиты
// ============================================

export function isKebabCase(str: string): boolean {
    return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(str);
}

export function hasTrailingCommas(content: string): boolean {
    return /,\s*[\]}]/.test(content);
}

// ============================================
// Правила lint
// ============================================

export function lintJsonFormat(filePath: string, content: string): LintError[] {
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

export function lintDirectoryStructure(simPath: string, simName: string): LintError[] {
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

export function lintRequiredFiles(simPath: string): LintError[] {
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

export function lintReceivedJsonExecuteSanitized(data: any, filePath: string): LintError[] {
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

export function lintFormParity(responsePath: string, receivedPath: string): LintError[] {
    const errors: LintError[] = [];

    if (!existsSync(responsePath) || !existsSync(receivedPath)) {
        return errors;
    }

    let responseData: any;
    let receivedData: any;

    try {
        responseData = JSON.parse(readFileSync(responsePath, 'utf-8'));
    } catch {
        return errors;
    }

    try {
        receivedData = JSON.parse(readFileSync(receivedPath, 'utf-8'));
    } catch {
        return errors;
    }

    const responseForm = responseData?.execute?.form;
    const receivedForm = receivedData?.execute?.form;

    if (responseForm && receivedForm) {
        // Deep compare the form objects, ignoring internal action keys (but form is not an action key)
        const responseFormStr = JSON.stringify(responseForm);
        const receivedFormStr = JSON.stringify(receivedForm);

        if (responseFormStr !== receivedFormStr) {
            errors.push({
                path: receivedPath,
                message: `received.json form must match response.json form exactly (Web DTO preserves form structure); differences found`,
                severity: 'error',
                fixable: false
            });
        }
    } else if (responseForm && !receivedForm) {
        errors.push({
            path: receivedPath,
            message: `received.json missing form that exists in response.json`,
            severity: 'error',
            fixable: false
        });
    } else if (!responseForm && receivedForm) {
        errors.push({
            path: receivedPath,
            message: `received.json has form but response.json does not`,
            severity: 'error',
            fixable: false
        });
    }

    return errors;
}

export function lintExecuteStructure(data: any, filePath: string): LintError[] {
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
            if (!(VALID_EXECUTE_TYPES as readonly string[]).includes(key)) {
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

export function lintFirstRequest(data: any, filePath: string): LintError[] {
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

export function lintFirstResponse(data: any, filePath: string): LintError[] {
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
// Simulation discovery
// ============================================

export function getAllSimulations(): {path: string; name: string}[] {
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
