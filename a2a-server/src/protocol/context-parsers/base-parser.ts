/**
 * Base Context Parser
 *
 * Abstract base class for all context parsers
 * Provides common functionality for parsing, validation, and normalization
 */

import {
    ContextBlock,
    Task,
    TaskType,
    TaskStatus,
    ProtocolError,
} from '../../types/index.js';
import {CURRENT_PROTOCOL_VERSION} from '../versioning/protocol-versions.js';

export const PROTOCOL_VERSION = CURRENT_PROTOCOL_VERSION;

export const VALID_TASK_TYPES: TaskType[] = [
    'analyze',
    'refactor',
    'test',
    'document',
    'fix',
    'create',
    'delete',
];

export const VALID_TASK_STATUSES: TaskStatus[] = [
    'pending',
    'in_progress',
    'completed',
    'failed',
    'cancelled',
];

/**
 * Parse context options
 */
export interface ParseContext {
    strict?: boolean;
    validateVersion?: boolean;
    allowPartial?: boolean;
}

/**
 * Parse result with potential errors
 */
export interface ParseResult<T> {
    success: boolean;
    data?: T;
    errors: string[];
}

/**
 * Abstract base class for context parsers
 */
export abstract class BaseContextParser<T = unknown> {
    protected options: ParseContext;

    constructor(options: ParseContext = {}) {
        this.options = {
            strict: false,
            validateVersion: true,
            allowPartial: false,
            ...options,
        };
    }

    /**
     * Parse input data into structured context
     * Must be implemented by subclasses
     */
    abstract parse(data: unknown): T;

    /**
     * Validate input data without parsing
     * Must be implemented by subclasses
     */
    abstract validate(data: unknown): { valid: boolean; errors: string[] };

    /**
     * Normalize data to standard format
     * Default implementation returns data as-is
     */
    normalize(data: unknown): unknown {
        return data;
    }

    /**
     * Parse safely, returning null on error
     */
    parseSafe(data: unknown): T | null {
        try {
            return this.parse(data);
        } catch {
            return null;
        }
    }

    /**
     * Parse with detailed result
     */
    parseWithResult(data: unknown): ParseResult<T> {
        const validation = this.validate(data);
        if (!validation.valid) {
            return { success: false, errors: validation.errors };
        }

        try {
            const parsed = this.parse(data);
            return { success: true, data: parsed, errors: [] };
        } catch (error) {
            return {
                success: false,
                errors: [error instanceof Error ? error.message : 'Unknown error'],
            };
        }
    }

    // ============================================
    // Type Guards (shared across parsers)
    // ============================================

    protected isObject(value: unknown): value is Record<string, unknown> {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }

    protected isString(value: unknown): value is string {
        return typeof value === 'string';
    }

    protected isStringArray(value: unknown): value is string[] {
        return Array.isArray(value) && value.every(this.isString);
    }

    protected isBoolean(value: unknown): value is boolean {
        return typeof value === 'boolean';
    }

    protected isNumber(value: unknown): value is number {
        return typeof value === 'number' && !isNaN(value);
    }

    protected isValidTaskType(value: unknown): value is TaskType {
        return this.isString(value) && VALID_TASK_TYPES.includes(value as TaskType);
    }

    protected isValidTaskStatus(value: unknown): value is TaskStatus {
        return this.isString(value) && VALID_TASK_STATUSES.includes(value as TaskStatus);
    }

    protected isTask(value: unknown): value is Task {
        if (!this.isObject(value)) return false;
        const task = value as Record<string, unknown>;
        return (
            this.isString(task['id']) &&
            task['id'].length > 0 &&
            this.isValidTaskType(task['type']) &&
            this.isValidTaskStatus(task['status']) &&
            (task['target'] === undefined || this.isString(task['target'])) &&
            (task['progress'] === undefined || typeof task['progress'] === 'number')
        );
    }

    protected isTaskArray(value: unknown): value is Task[] {
        return Array.isArray(value) && value.every(this.isTask.bind(this));
    }

    protected isProtocolError(value: unknown): value is ProtocolError {
        if (!this.isObject(value)) return false;
        const err = value as Record<string, unknown>;
        return (
            this.isString(err['code']) &&
            err['code'].length > 0 &&
            this.isString(err['message']) &&
            (err['file'] === undefined || this.isString(err['file'])) &&
            (err['line'] === undefined || typeof err['line'] === 'number')
        );
    }

    protected isProtocolErrorArray(value: unknown): value is ProtocolError[] {
        return Array.isArray(value) && value.every(this.isProtocolError.bind(this));
    }

    // ============================================
    // Utility Methods
    // ============================================

    /**
     * Generate unique task ID
     */
    protected generateTaskId(): string {
        return `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    /**
     * Validate protocol version
     */
    protected validateVersion(version: unknown): boolean {
        return this.isString(version) && version === PROTOCOL_VERSION;
    }

    /**
     * Safe JSON parse with error handling
     */
    protected safeJsonParse<T>(data: string): T | null {
        try {
            return JSON.parse(data) as T;
        } catch {
            return null;
        }
    }

    /**
     * Deep clone an object
     */
    protected deepClone<T>(obj: T): T {
        return JSON.parse(JSON.stringify(obj));
    }
}

/**
 * Type guard for checking if a value is a valid context block
 */
export function isValidContextBlock(value: unknown): value is ContextBlock {
    if (!value || typeof value !== 'object') return false;
    const ctx = value as Record<string, unknown>;
    return (
        typeof ctx['version'] === 'string' &&
        typeof ctx['session_id'] === 'string' &&
        ctx['session_id'].length > 0
    );
}

/**
 * Extract session ID from context
 */
export function extractSessionId(context: ContextBlock): string {
    return context.session_id;
}

/**
 * Validate context version
 */
export function validateContextVersion(version: string): boolean {
    return /^1\.\d+$/.test(version);
}
