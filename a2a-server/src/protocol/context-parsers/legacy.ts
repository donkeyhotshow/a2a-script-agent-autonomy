/**
 * Legacy Context Parser Functions
 *
 * Deprecated functions kept for backward compatibility.
 * Use specialized parsers from './index.js' instead.
 *
 * @deprecated This file will be removed in a future version
 */

import {
    ContextBlock,
    Task,
    TaskType,
    TaskStatus,
    ProtocolError,
} from '../../types/index.js';
import { PROTOCOL_VERSION } from './base-parser.js';

// ============================================
// Type Guards
// ============================================

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

// ============================================
// Extraction Functions
// ============================================

/** @deprecated Use ActionContextParser instead */
export function extractNewTask(context: ContextBlock): string[] | null {
    return context.new_task?.length ? context.new_task : null;
}

/** @deprecated Use ActionContextParser instead */
export function extractRequestedFiles(context: ContextBlock): string[] | null {
    return context.request_files?.length ? context.request_files : null;
}

/** @deprecated Use specialized parsers instead */
export function extractArchitecturalFeatures(context: ContextBlock): string[] | null {
    return context.architectural_features?.length ? context.architectural_features : null;
}

/** @deprecated Use specialized parsers instead */
export function parseTasks(context: ContextBlock): Task[] {
    return context.tasks ?? [];
}

/** @deprecated Use specialized parsers instead */
export function hasContinueFlag(context: ContextBlock): boolean {
    return context.continue === true;
}

/** @deprecated Use specialized parsers instead */
export function hasConfirmFlag(context: ContextBlock): boolean {
    return context.confirm === true;
}

// ============================================
// Context Creation & Modification
// ============================================

function generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/** @deprecated Use createActionContextParser().createExecutionContext() instead */
export function createInitialContext(sessionId: string): ContextBlock {
    return { version: PROTOCOL_VERSION, session_id: sessionId };
}

/** @deprecated Use ActionContextParser instead */
export function createNewTaskContext(
    sessionId: string,
    tasks: string[],
    architecturalFeatures?: string[]
): ContextBlock {
    const context: ContextBlock = {
        version: PROTOCOL_VERSION,
        session_id: sessionId,
        new_task: tasks,
    };
    if (architecturalFeatures?.length) {
        context.architectural_features = architecturalFeatures;
    }
    return context;
}

/** @deprecated Use specialized parsers instead */
export function createFileRequestContext(sessionId: string, paths: string[]): ContextBlock {
    return { version: PROTOCOL_VERSION, session_id: sessionId, request_files: paths };
}

/** @deprecated Use specialized parsers instead */
export function updateTaskProgress(
    context: ContextBlock,
    taskId: string,
    progress: number,
    status: TaskStatus
): ContextBlock {
    const tasks = context.tasks ?? [];
    return {
        ...context,
        tasks: tasks.map((t) =>
            t.id === taskId ? { ...t, progress: Math.max(0, Math.min(100, progress)), status } : t
        ),
    };
}

/** @deprecated Use specialized parsers instead */
export function addTaskToContext(
    context: ContextBlock,
    type: TaskType,
    target?: string
): ContextBlock {
    const tasks = context.tasks ?? [];
    const newTask: Task = {
        id: generateTaskId(),
        type,
        status: 'pending',
        progress: 0,
        ...(target && { target }),
    };
    return { ...context, tasks: [...tasks, newTask] };
}

/** @deprecated Use specialized parsers instead */
export function removeTaskFromContext(context: ContextBlock, taskId: string): ContextBlock {
    const tasks = context.tasks ?? [];
    return { ...context, tasks: tasks.filter((t) => t.id !== taskId) };
}

/** @deprecated Use ErrorContextParser instead */
export function addErrorToContext(context: ContextBlock, error: ProtocolError): ContextBlock {
    const errors = context.errors ?? [];
    return { ...context, errors: [...errors, error] };
}

/** @deprecated Use ErrorContextParser instead */
export function clearErrorsFromContext(context: ContextBlock): ContextBlock {
    const { errors: _, ...rest } = context;
    return rest as ContextBlock;
}

// ============================================
// Serialization
// ============================================

/** @deprecated Use JSON.stringify directly */
export function serializeContext(context: ContextBlock): string {
    return JSON.stringify(context);
}

/** @deprecated Use JSON.parse with validation */
export function deserializeContext(data: string): ContextBlock {
    const parsed = JSON.parse(data);
    if (!isObject(parsed) || !isString(parsed['version']) || !isString(parsed['session_id'])) {
        throw new Error('Invalid context format');
    }
    return parsed as ContextBlock;
}

/** @deprecated Use JSON.parse with try-catch */
export function deserializeContextSafe(data: string): ContextBlock | null {
    try {
        return deserializeContext(data);
    } catch {
        return null;
    }
}

// ============================================
// Context Utilities
// ============================================

/** @deprecated Use spread operator directly */
export function mergeContexts(base: ContextBlock, override: Partial<ContextBlock>): ContextBlock {
    return {
        ...base,
        ...override,
        version: PROTOCOL_VERSION,
        session_id: override.session_id ?? base.session_id,
    };
}

/** @deprecated Use structuredClone or JSON.parse(JSON.stringify()) */
export function cloneContext(context: ContextBlock): ContextBlock {
    return JSON.parse(JSON.stringify(context));
}

/** @deprecated Check tasks array directly */
export function hasActiveTasks(context: ContextBlock): boolean {
    return (context.tasks ?? []).some(
        (t) => t.status === 'pending' || t.status === 'in_progress'
    );
}

/** @deprecated Use array find directly */
export function getTaskById(context: ContextBlock, taskId: string): Task | null {
    return (context.tasks ?? []).find((t) => t.id === taskId) ?? null;
}

/** @deprecated Use array filter directly */
export function getTasksByStatus(context: ContextBlock, status: TaskStatus): Task[] {
    return (context.tasks ?? []).filter((t) => t.status === status);
}

/** @deprecated Calculate progress manually */
export function calculateOverallProgress(context: ContextBlock): number {
    const tasks = context.tasks ?? [];
    if (!tasks.length) return 0;
    return Math.round(tasks.reduce((sum, t) => sum + (t.progress ?? 0), 0) / tasks.length);
}
