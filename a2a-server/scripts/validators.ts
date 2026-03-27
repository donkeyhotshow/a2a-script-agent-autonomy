#!/usr/bin/env tsx

/**
 * Validators - валидация симуляций по схемам
 * Часть модульной структуры sim-validate
 */

import {readFileSync, existsSync} from 'node:fs';
import {join} from 'node:path';
import Ajv, {ErrorObject} from 'ajv';
import addFormats from 'ajv-formats';

// ============================================
// Константы
// ============================================

export const SCHEMAS_DIR = join(import.meta.url, '..', '..', 'docs', 'new-request-flow', 'json-schemas');

// ============================================
// AJV setup
// ============================================

const ajv = new Ajv({
    allErrors: true,
    verbose: true,
    strict: false,
    validateFormats: false
});

addFormats(ajv);

// ============================================
// Типы
// ============================================

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
    /** If true, server-transforms-*.json are only checked for valid JSON + fromFile fixtures (ops drift faster than schema). */
    lenientTransforms: boolean;
}

// ============================================
// Schema loading
// ============================================

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

// ============================================
// Normalization functions
// ============================================

/** Strip only obvious transport/storage metadata (avoid removing semantic fields like execution.status). */
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

/** Unwrap run-simulation / API `{ success, data }` into invoke-style body when possible. */
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

// ============================================
// JSON Schema validation
// ============================================

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

// ============================================
// File type detection
// ============================================

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

export function detectFileType(filename: string): FileTypeConfig | null {
    return FILE_TYPE_CONFIGS[filename] || null;
}

// ============================================
// Transform reference validation
// ============================================

/** Collect `fromFile` paths inside transform pipeline JSON (e.g. parse-json-from-md). */
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

// ============================================
// File validation
// ============================================

export function validateFile(filePath: string, filename: string, opts: ValidateOptions): FileValidationResult {
    const result: FileValidationResult = {
        file: filename,
        valid: true,
        errors: [],
        warnings: []
    };

    // Проверка существования файла
    if (!existsSync(filePath)) {
        const fileConfig = detectFileType(filename);
        if (fileConfig?.required) {
            result.valid = false;
            result.errors.push({
                path: '',
                message: `Required file not found: ${filename}`,
                keyword: 'required'
            });
        } else {
            result.warnings.push(`Optional file not found: ${filename}`);
        }
        return result;
    }

    // Чтение и парсинг JSON
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

    // Определение типа файла и валидация
    const fileConfig = detectFileType(filename);
    if (typeof fileConfig?.schema === 'string' && fileConfig.schema.length > 0) {
        const isTransformFile =
            filename === 'server-transforms-request.json' || filename === 'server-transforms-response.json';
        if (opts.lenientTransforms && isTransformFile) {
            result.warnings.push(
                `${filename}: AJV schema check skipped (lenient); use --strict for full server-transform.schema validation`
            );
        } else {
            const prepared = prepareDataForSchema(filename, data, opts);
            const validationResult = validateJsonAgainstSchema(prepared, fileConfig.schema);
            result.valid = validationResult.valid;
            result.errors = validationResult.errors;
        }
    } else if (!fileConfig) {
        result.warnings.push(`No schema defined for: ${filename}`);
    }

    return result;
}

// ============================================
// Simulation validation
// ============================================

export function validateSimulation(simPath: string, simName: string, opts: ValidateOptions): SimulationValidationResult {
    const result: SimulationValidationResult = {
        name: simName,
        path: simPath,
        valid: true,
        files: [],
        errors: [],
        warnings: []
    };

    // Проверка существования директории
    if (!existsSync(simPath)) {
        result.valid = false;
        result.errors.push({
            path: '',
            message: `Simulation directory not found: ${simName}`,
            keyword: 'directory'
        });
        return result;
    }

    // Валидация каждого файла
    const requiredFiles = ['request.json', 'response.json', 'client.json', 'received.json'];
    const optionalFiles = ['server-transforms-request.json', 'server-transforms-response.json'];
    const allFiles = [...requiredFiles, ...optionalFiles];

    for (const filename of allFiles) {
        const filePath = join(simPath, filename);
        const fileResult = validateFile(filePath, filename, opts);
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

    return result;
}