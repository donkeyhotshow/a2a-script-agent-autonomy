#!/usr/bin/env tsx

/**
 * Validators - валидация симуляций по схемам
 * Часть модульной структуры sim-validate
 */

import {readFileSync, existsSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import Ajv, {ErrorObject} from 'ajv';
import addFormats from 'ajv-formats';
import {collectNoLlmStepContractWarningsForSimulation} from '../sim-contract/step-transform-rules.js';

const __dirname = join(fileURLToPath(import.meta.url), '..');

/** Repo root `docs/new-request-flow/json-schemas` (two levels up from scripts). */
export const SCHEMAS_DIR = join(__dirname, '..', '..', '..', 'docs', 'new-request-flow', 'json-schemas');

const ajv = new Ajv({
    allErrors: true,
    verbose: true,
    strict: false,
    validateFormats: false
});

addFormats(ajv);

export interface ValidationError {
    path: string;
    message: string;
    keyword: string;
}

export interface FileValidationResult {
    file: string;
    valid: boolean;
    errors: ValidationError[];
    warnings: string[];
}

export interface SimulationValidationResult {
    name: string;
    path: string;
    valid: boolean;
    files: FileValidationResult[];
    errors: ValidationError[];
    warnings: string[];
}

export interface ValidateOptions {
    normalize: boolean;
    lenientTransforms: boolean;
    stepContractChecks: boolean;
}

interface SchemaCache {
    [key: string]: object;
}

const schemaCache: SchemaCache = {};

export function loadSchema(schemaName: string): object | null {
    if (schemaCache[schemaName]) {
        return schemaCache[schemaName];
    }

    const schemaPath = join(SCHEMAS_DIR, schemaName);
    if (!existsSync(schemaPath)) {
        console.error(`⚠️  Схема не найдена: ${schemaName}`);
        return null;
    }

    try {
        const content = readFileSync(schemaPath, 'utf-8');
        const schema = JSON.parse(content);
        schemaCache[schemaName] = schema;
        return schema;
    } catch (err: any) {
        console.error(`⚠️  Ошибка загрузки схемы ${schemaName}: ${err.message}`);
        return null;
    }
}

const EPHEMERAL_ROOT_KEYS = new Set([
    'createdAt',
    'startedAt',
    'completedAt',
    'updatedAt',
    'promiseId',
    'clientId',
    'retryCount',
    'retryAfter',
    'priority',
]);

function isEphemeralIdKey(key: string, value: unknown): boolean {
    if (key === 'id' && typeof value === 'string') {
        return /^(req_|prom_|sess_)/.test(value);
    }
    return false;
}

function stripEphemeralDeep(value: unknown): unknown {
    if (value === null || value === undefined) return value;
    if (Array.isArray(value)) return value.map(stripEphemeralDeep);
    if (typeof value !== 'object') return value;
    const o = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) {
        if (EPHEMERAL_ROOT_KEYS.has(k) || isEphemeralIdKey(k, v)) continue;
        out[k] = stripEphemeralDeep(v);
    }
    return out;
}

function deepCloneJson<T>(v: T): T {
    return JSON.parse(JSON.stringify(v)) as T;
}

function unwrapInvokeEnvelope(raw: Record<string, unknown>): Record<string, unknown> {
    if (raw.success !== true || raw.data === undefined || typeof raw.data !== 'object' || raw.data === null) {
        return raw;
    }
    const d = raw.data as Record<string, unknown>;
    const innerResult = d.result;
    if (innerResult && typeof innerResult === 'object' && !Array.isArray(innerResult)) {
        const r = innerResult as Record<string, unknown>;
        if (r.context && r.execute) {
            const out: Record<string, unknown> = {context: r.context, execute: r.execute};
            if (r.result !== undefined) out.result = r.result;
            return out;
        }
    }
    if (d.context && d.execute) {
        const out: Record<string, unknown> = {context: d.context, execute: d.execute};
        if (d.result !== undefined) out.result = d.result;
        return out;
    }
    return raw;
}

export function normalizeServerInvokeRequest(data: unknown): unknown {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return data;
    let o = deepCloneJson(data) as Record<string, unknown>;
    o = stripEphemeralDeep(o) as Record<string, unknown>;

    if (typeof o.message === 'string' && o.message.length > 0) {
        const prev = o.result && typeof o.result === 'object' && !Array.isArray(o.result) ? (o.result as Record<string, unknown>) : {};
        o.result = {...prev, message: o.message};
        delete o.message;
    }

    const ctx = o.context;
    if (ctx && typeof ctx === 'object' && !Array.isArray(ctx)) {
        const c = ctx as Record<string, unknown>;
        delete c.llmPromiseId;
        delete c.hubLlmResubmitCount;
        const ex0 = c.execution;
        if (ex0 && typeof ex0 === 'object' && !Array.isArray(ex0)) {
            const e0 = ex0 as Record<string, unknown>;
            if (typeof e0.action === 'string' && e0.action.length > 0 && (e0.step === undefined || e0.step === null)) {
                e0.step = 'request';
            }
        }
        const task = typeof c.task === 'string' ? c.task : undefined;
        if (task && !c.execution) {
            const res = o.result;
            const hasFollowUp =
                res &&
                typeof res === 'object' &&
                !Array.isArray(res) &&
                Object.keys(res as Record<string, unknown>).length > 0;
            if (hasFollowUp) {
                c.execution = {action: 'task', step: 'router'};
            }
        }
        if (!c.task && typeof o.task === 'string') c.task = o.task;
        if (!c.task && o.result && typeof o.result === 'object' && !Array.isArray(o.result)) {
            const m = (o.result as Record<string, unknown>).message;
            if (typeof m === 'string' && m.length > 0) c.task = m;
        }
    }

    if (o.context && typeof o.context === 'object' && Object.keys(o.context as object).length === 0) {
        delete o.context;
    }
    if (o.result && typeof o.result === 'object' && Object.keys(o.result as object).length === 0) {
        delete o.result;
    }

    return o;
}

const RESPONSE_ROOT_ALLOW = new Set(['context', 'execute', 'result']);

export function normalizeServerInvokeResponse(data: unknown): unknown {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) return data;
    let o = deepCloneJson(data) as Record<string, unknown>;
    o = stripEphemeralDeep(o) as Record<string, unknown>;
    o = unwrapInvokeEnvelope(o);

    const ctx = o.context;
    if (ctx && typeof ctx === 'object' && !Array.isArray(ctx)) {
        const c = ctx as Record<string, unknown>;
        delete c.llmPromiseId;
        delete c.hubLlmResubmitCount;
        const ex = c.execution;
        if (ex && typeof ex === 'object' && !Array.isArray(ex)) {
            const e = ex as Record<string, unknown>;
            if (typeof e.action === 'string' && e.action.length > 0 && (e.step === undefined || e.step === null)) {
                e.step = 'request';
            }
        }
        if (!c.task || (typeof c.task === 'string' && c.task.length === 0)) {
            const hist = c.history;
            if (Array.isArray(hist)) {
                const u = hist.find(
                    (h: unknown) =>
                        h &&
                        typeof h === 'object' &&
                        (h as Record<string, unknown>).role === 'user' &&
                        typeof (h as Record<string, unknown>).message === 'string'
                ) as Record<string, unknown> | undefined;
                if (u && typeof u.message === 'string') c.task = u.message.slice(0, 500);
            }
            if (!c.task && ex && typeof ex === 'object' && !Array.isArray(ex)) {
                const act = (ex as Record<string, unknown>).action;
                if (typeof act === 'string' && act.length > 0) c.task = act;
            }
        }
        const histAll = c.history;
        if (Array.isArray(histAll)) {
            for (const h of histAll) {
                if (h && typeof h === 'object' && !Array.isArray(h)) {
                    const hi = h as Record<string, unknown>;
                    if (hi.role === undefined || hi.role === null) {
                        hi.role = 'system';
                    }
                }
            }
        }
    }

    const rawEx = o.execute;
    const executeEmpty =
        rawEx === undefined ||
        rawEx === null ||
        (typeof rawEx === 'object' &&
            !Array.isArray(rawEx) &&
            Object.keys(rawEx as object).length === 0);
    if (executeEmpty) {
        const topResult = o.result;
        if (topResult && typeof topResult === 'object' && !Array.isArray(topResult)) {
            o.execute = {message: '(normalized) see top-level result'};
        } else if (ctx && typeof ctx === 'object' && !Array.isArray(ctx)) {
            const c = ctx as Record<string, unknown>;
            const exec = c.execution;
            if (exec && typeof exec === 'object' && !Array.isArray(exec)) {
                const st = (exec as Record<string, unknown>).step;
                if (st === 'completed' || st === 'done') {
                    o.execute = {message: 'Completed'};
                }
            }
        }
    }

    const exForScript = o.execute;
    if (exForScript && typeof exForScript === 'object' && !Array.isArray(exForScript)) {
        const sc = (exForScript as Record<string, unknown>).script;
        if (sc && typeof sc === 'object' && !Array.isArray(sc)) {
            const s = sc as Record<string, unknown>;
            if (s.input !== undefined && s.output !== undefined && (s.code === undefined || s.code === null)) {
                s.code = '';
            }
        }
    }

    const cleaned: Record<string, unknown> = {};
    for (const k of RESPONSE_ROOT_ALLOW) {
        if (k in o) cleaned[k] = o[k];
    }
    return cleaned;
}

export function prepareDataForSchema(filename: string, data: unknown, opts: ValidateOptions): unknown {
    if (!opts.normalize) return data;
    if (filename === 'request.json') return normalizeServerInvokeRequest(data);
    if (filename === 'response.json') return normalizeServerInvokeResponse(data);
    return data;
}

export function validateJsonAgainstSchema(data: any, schemaName: string): {valid: boolean; errors: ValidationError[]} {
    const schema = loadSchema(schemaName);
    if (!schema) {
        return {
            valid: false,
            errors: [{path: '', message: `Схема не найдена: ${schemaName}`, keyword: 'schema'}]
        };
    }

    const validate = ajv.compile(schema);
    const valid = validate(data);

    if (valid) {
        return {valid: true, errors: []};
    }

    const errors: ValidationError[] = (validate.errors || []).map((err: ErrorObject) => ({
        path: err.instancePath || '/',
        message: err.message || 'Unknown error',
        keyword: err.keyword
    }));

    return {valid: false, errors};
}

interface FileTypeConfig {
    schema: string | null;
    required: boolean;
}

const FILE_TYPE_CONFIGS: {[key: string]: FileTypeConfig} = {
    'request.json': {schema: 'server-invoke-request.schema.json', required: true},
    'response.json': {schema: 'server-invoke-response-execute.schema.json', required: true},
    'client.json': {schema: null, required: true},
    'received.json': {schema: null, required: true},
    'server-transforms-request.json': {schema: 'server-transform.schema.json', required: false},
    'server-transforms-response.json': {schema: 'server-transform.schema.json', required: false},
};

const SUBSTEP_FILE_TYPE_CONFIGS: {[key: string]: FileTypeConfig} = {
    'request.json': {schema: 'server-invoke-request.schema.json', required: true},
    'response.json': {schema: 'server-invoke-response-execute.schema.json', required: true},
    'client.json': {schema: null, required: false},
    'received.json': {schema: null, required: false},
    'server-transforms-request.json': {schema: 'server-transform.schema.json', required: false},
    'server-transforms-response.json': {schema: 'server-transform.schema.json', required: false},
};

export function detectFileType(filename: string, isSubstep = false): FileTypeConfig | null {
    const configs = isSubstep ? SUBSTEP_FILE_TYPE_CONFIGS : FILE_TYPE_CONFIGS;
    return configs[filename] || null;
}

export function collectFromFileRefs(doc: unknown): string[] {
    const refs: string[] = [];
    const visit = (o: unknown): void => {
        if (o === null || o === undefined) return;
        if (Array.isArray(o)) {
            for (const x of o) visit(x);
            return;
        }
        if (typeof o !== 'object') return;
        const r = o as Record<string, unknown>;
        if (typeof r.fromFile === 'string' && r.fromFile.length > 0) {
            refs.push(r.fromFile);
        }
        for (const k of Object.keys(r)) visit(r[k]);
    };
    visit(doc);
    return [...new Set(refs)];
}

export function validateTransformReferencedFiles(simPath: string, transformFilename: string): string[] {
    const warnings: string[] = [];
    const filePath = join(simPath, transformFilename);
    if (!existsSync(filePath)) return warnings;
    let data: unknown;
    try {
        data = JSON.parse(readFileSync(filePath, 'utf-8'));
    } catch {
        return warnings;
    }
    for (const ref of collectFromFileRefs(data)) {
        const refPath = join(simPath, ref);
        if (!existsSync(refPath)) {
            warnings.push(
                `${transformFilename}: missing fixture "${ref}" (referenced by transform; needed for replay/tests)`
            );
        }
    }
    return warnings;
}

export function collectSequenceWorkbenchWarnings(sequenceVal: unknown, filename: string): string[] {
    const out: string[] = [];
    const prefix = `${filename} context.workbench.sections.sequence:`;

    if (Array.isArray(sequenceVal)) {
        sequenceVal.forEach((step, i) => {
            if (!step || typeof step !== 'object') {
                out.push(`${prefix} [${i}] must be an object`);
                return;
            }
            const s = step as Record<string, unknown>;
            if (typeof s['id'] !== 'string') {
                out.push(`${prefix} [${i}].id must be a string`);
            }
            if (typeof s['title'] !== 'string') {
                out.push(`${prefix} [${i}].title must be a string`);
            }
            if (typeof s['status'] !== 'string') {
                out.push(`${prefix} [${i}].status must be a string`);
            }
        });
        return out;
    }

    if (sequenceVal && typeof sequenceVal === 'object' && !Array.isArray(sequenceVal)) {
        const o = sequenceVal as Record<string, unknown>;
        const steps = o['steps'];
        const headIndex = o['headIndex'];
        if (!Array.isArray(steps)) {
            out.push(`${prefix} object form requires "steps" array`);
            return out;
        }
        if (typeof headIndex === 'number' && (headIndex < 0 || headIndex >= steps.length)) {
            out.push(`${prefix} headIndex out of range for steps.length`);
        }
        steps.forEach((step: unknown, i: number) => {
            if (!step || typeof step !== 'object') {
                out.push(`${prefix} steps[${i}] must be an object`);
                return;
            }
            const s = step as Record<string, unknown>;
            if (typeof s['id'] !== 'string') {
                out.push(`${prefix} steps[${i}].id must be a string`);
            }
            if (typeof s['title'] !== 'string') {
                out.push(`${prefix} steps[${i}].title must be a string`);
            }
            if (typeof s['status'] !== 'string') {
                out.push(`${prefix} steps[${i}].status must be a string`);
            }
        });
        return out;
    }

    out.push(`${prefix} must be a non-null array or { steps, headIndex? }`);
    return out;
}

export function validateFile(filePath: string, filename: string, opts: ValidateOptions, isSubstep = false): FileValidationResult {
    const result: FileValidationResult = {
        file: filename,
        valid: true,
        errors: [],
        warnings: []
    };

    if (!existsSync(filePath)) {
        const fileConfig = detectFileType(filename, isSubstep);
        if (fileConfig?.required) {
            result.valid = false;
            result.errors.push({
                path: '',
                message: `Required file not found: ${filename}`,
                keyword: 'required'
            });
        }
        return result;
    }

    let data: any;
    try {
        const content = readFileSync(filePath, 'utf-8');
        data = JSON.parse(content);
    } catch (err: any) {
        result.valid = false;
        result.errors.push({
            path: '',
            message: `Invalid JSON: ${err.message}`,
            keyword: 'parse'
        });
        return result;
    }

    const fileConfig = detectFileType(filename, isSubstep);
    if (typeof fileConfig?.schema === 'string' && fileConfig.schema.length > 0) {
        const isTransformFile =
            filename === 'server-transforms-request.json' || filename === 'server-transforms-response.json';
        if (opts.lenientTransforms && isTransformFile) {
            // skip
        } else {
            const prepared = prepareDataForSchema(filename, data, opts);
            const validationResult = validateJsonAgainstSchema(prepared, fileConfig.schema);
            result.valid = validationResult.valid;
            result.errors = validationResult.errors;
        }
    } else if (!fileConfig) {
        result.warnings.push(`No schema defined for: ${filename}`);
    }

    if (filename === 'response.json' && data && typeof data === 'object' && data !== null && !Array.isArray(data)) {
        const ctx = (data as Record<string, unknown>)['context'] as Record<string, unknown> | undefined;
        const seq = ctx?.['workbench'] as Record<string, unknown> | undefined;
        const sections = seq?.['sections'] as Record<string, unknown> | undefined;
        const sequenceVal = sections?.['sequence'];
        if (sequenceVal !== undefined && sequenceVal !== null) {
            result.warnings.push(...collectSequenceWorkbenchWarnings(sequenceVal, filename));
        }
    }

    if (
        filename === 'response.json' &&
        data &&
        typeof data === 'object' &&
        !Array.isArray(data) &&
        data !== null &&
        'interrupt' in data &&
        (data as Record<string, unknown>)['interrupt'] != null &&
        typeof (data as Record<string, unknown>)['interrupt'] === 'object' &&
        !Array.isArray((data as Record<string, unknown>)['interrupt'])
    ) {
        const intr = (data as Record<string, unknown>)['interrupt'] as Record<string, unknown>;
        const intResult = validateJsonAgainstSchema(intr, 'interrupt-directive.schema.json');
        if (!intResult.valid) {
            result.valid = false;
            for (const e of intResult.errors) {
                result.errors.push({
                    path: `interrupt${e.path}`,
                    message: e.message,
                    keyword: e.keyword,
                });
            }
        }
    }

    return result;
}

export function validateSimulation(simPath: string, simName: string, opts: ValidateOptions): SimulationValidationResult {
    const result: SimulationValidationResult = {
        name: simName,
        path: simPath,
        valid: true,
        files: [],
        errors: [],
        warnings: []
    };

    if (!existsSync(simPath)) {
        result.valid = false;
        result.errors.push({
            path: '',
            message: `Simulation directory not found: ${simName}`,
            keyword: 'directory'
        });
        return result;
    }

    const isSubstep = simName.includes('-sub-');
    const requiredFiles = isSubstep
        ? ['request.json', 'response.json']
        : ['request.json', 'response.json', 'client.json', 'received.json'];
    const optionalFiles = ['server-transforms-request.json', 'server-transforms-response.json'];
    const allFiles = [...requiredFiles, ...optionalFiles];

    for (const filename of allFiles) {
        const filePath = join(simPath, filename);
        const fileResult = validateFile(filePath, filename, opts, isSubstep);
        result.files.push(fileResult);

        if (!fileResult.valid) {
            result.valid = false;
            result.errors.push(...fileResult.errors.map(e => ({
                ...e,
                path: `${filename}${e.path}`
            })));
        }

        result.warnings.push(...fileResult.warnings.map(w => `${filename}: ${w}`));
    }

    for (const tf of ['server-transforms-request.json', 'server-transforms-response.json'] as const) {
        const fixtureWarnings = validateTransformReferencedFiles(simPath, tf);
        for (const w of fixtureWarnings) {
            result.warnings.push(w);
        }
    }

    if (opts.stepContractChecks) {
        result.warnings.push(...collectNoLlmStepContractWarningsForSimulation(simPath));
    }

    return result;
}
