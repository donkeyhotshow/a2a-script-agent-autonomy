/**
 * Context Parser - Simulation Mode
 *
 * Parses and validates Context Blocks according to A2A protocol.
 */

import {
    ContextBlock,
    Task,
    TaskType,
    TaskStatus,
    ProtocolError,
} from '../types/index.js';

const VALID_TASK_TYPES: TaskType[] = ['analyze', 'refactor', 'test', 'document', 'fix', 'create', 'delete'];
const VALID_TASK_STATUSES: TaskStatus[] = ['pending', 'in_progress', 'completed', 'failed', 'cancelled'];
const PROTOCOL_VERSIONS = ['0.1.0', '1.0.0'];

type ProtocolVersion = typeof PROTOCOL_VERSIONS[number];

function isSupportedVersion(version: string): version is ProtocolVersion {
    return PROTOCOL_VERSIONS.includes(version as ProtocolVersion);
}

// Type Guards
function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
    return typeof value === 'string';
}

function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every(isString);
}

function isBoolean(value: unknown): value is boolean {
    return typeof value === 'boolean';
}

function isValidTaskType(value: unknown): value is TaskType {
    return isString(value) && VALID_TASK_TYPES.includes(value as TaskType);
}

function isValidTaskStatus(value: unknown): value is TaskStatus {
    return isString(value) && VALID_TASK_STATUSES.includes(value as TaskStatus);
}

function isTask(value: unknown): value is Task {
    if (!isObject(value)) return false;
    const task = value as Record<string, unknown>;
    return (
        isString(task['id']) &&
        task['id'].length > 0 &&
        isValidTaskType(task['type']) &&
        isValidTaskStatus(task['status']) &&
        (task['target'] === undefined || isString(task['target'])) &&
        (task['progress'] === undefined || typeof task['progress'] === 'number')
    );
}

function isProtocolError(value: unknown): value is ProtocolError {
    if (!isObject(value)) return false;
    const err = value as Record<string, unknown>;
    return (
        isString(err['code']) &&
        err['code'].length > 0 &&
        isString(err['message']) &&
        (err['file'] === undefined || isString(err['file'])) &&
        (err['line'] === undefined || typeof err['line'] === 'number')
    );
}

// Validation & Parsing
export function validateContextBlock(context: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!isObject(context)) {
        return { valid: false, errors: ['Context must be an object'] };
    }

    const ctx = context as Record<string, unknown>;

    if (!isString(ctx['version'])) {
        errors.push('version is required and must be a string');
    } else if (!isSupportedVersion(ctx['version'])) {
        errors.push(`version must be one of: ${PROTOCOL_VERSIONS.join(', ')}`);
    }

    if (!isString(ctx['session_id']) || ctx['session_id'].length === 0) {
        errors.push('session_id is required and must be a non-empty string');
    }

    if (ctx['new_task'] !== undefined && !isStringArray(ctx['new_task'])) {
        errors.push('new_task must be an array of strings');
    }

    if (ctx['architectural_features'] !== undefined && !isStringArray(ctx['architectural_features'])) {
        errors.push('architectural_features must be an array of strings');
    }

    if (ctx['continue'] !== undefined && !isBoolean(ctx['continue'])) {
        errors.push('continue must be a boolean');
    }

    if (ctx['confirm'] !== undefined && !isBoolean(ctx['confirm'])) {
        errors.push('confirm must be a boolean');
    }

    if (ctx['tasks'] !== undefined && !Array.isArray(ctx['tasks']) && !ctx['tasks'].every(isTask)) {
        errors.push('tasks must be an array of valid Task objects');
    }

    if (ctx['request_files'] !== undefined && !isStringArray(ctx['request_files'])) {
        errors.push('request_files must be an array of strings');
    }

    if (ctx['errors'] !== undefined && !Array.isArray(ctx['errors']) && !ctx['errors'].every(isProtocolError)) {
        errors.push('errors must be an array of valid ProtocolError objects');
    }

    return { valid: errors.length === 0, errors };
}

export function parseContextBlock(data: unknown): ContextBlock {
    const { valid, errors } = validateContextBlock(data);

    if (!valid) {
        throw new Error(`Invalid context block: ${errors.join(', ')}`);
    }

    const ctx = data as Record<string, unknown>;

    const result: ContextBlock = {
        version: ctx['version'] as ProtocolVersion,
        session_id: ctx['session_id'] as string,
    };

    if (ctx['new_task'] !== undefined) result.new_task = ctx['new_task'] as string[];
    if (ctx['architectural_features'] !== undefined) result.architectural_features = ctx['architectural_features'] as string[];
    if (ctx['continue'] !== undefined) result.continue = ctx['continue'] as boolean;
    if (ctx['tasks'] !== undefined) result.tasks = ctx['tasks'] as Task[];
    if (ctx['request_files'] !== undefined) result.request_files = ctx['request_files'] as string[];
    if (ctx['confirm'] !== undefined) result.confirm = ctx['confirm'] as boolean;
    if (ctx['errors'] !== undefined) result.errors = ctx['errors'] as ProtocolError[];
    if (ctx['task'] !== undefined) result.task = ctx['task'] as string;
    if (ctx['execution'] !== undefined) result.execution = ctx['execution'] as ContextBlock['execution'];

    return result;
}

export function parseContextBlockSafe(data: unknown): ContextBlock | null {
    try {
        return parseContextBlock(data);
    } catch {
        return null;
    }
}
