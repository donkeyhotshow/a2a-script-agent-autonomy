/**
 * Factory Module
 * 
 * Factory functions for creating type instances
 */

import type { ContextBlock } from '../state/types.js';
import type { Task, CreateTaskOptions, TaskType, TaskStatus } from '../state/types.js';
import type { FileBlock, CreateFileBlockOptions } from '../file/types.js';
import type { SearchQuery, CreateSearchQueryOptions } from '../search/types.js';
import type { ProtocolError } from '../protocol/index.js';

/**
 * Factory options for creating context blocks
 */
export interface CreateContextBlockOptions {
    sessionId: string;
    newTask?: string[];
    architecturalFeatures?: string[];
    continue?: boolean;
    tasks?: Task[];
    requestFiles?: string[];
    confirm?: boolean;
    errors?: ProtocolError[];
}

/**
 * Create a context block with default values
 */
export function createContextBlock(options: CreateContextBlockOptions): ContextBlock {
    return {
        version: '1.0',
        session_id: options.sessionId,
        new_task: options.newTask,
        architectural_features: options.architecturalFeatures,
        continue: options.continue,
        tasks: options.tasks,
        request_files: options.requestFiles,
        confirm: options.confirm,
        errors: options.errors,
    };
}

/**
 * Create a task with default values
 */
export function createTask(options: CreateTaskOptions = {}): Task {
    return {
        id: options.id ?? `task_${Date.now()}`,
        type: options.type ?? 'analyze',
        status: options.status ?? 'pending',
        target: options.target,
        progress: options.progress ?? 0,
    };
}

/**
 * Create a file block with default values
 */
export function createFileBlock(options: CreateFileBlockOptions): FileBlock {
    return {
        path: options.path,
        content: options.content,
        startLine: options.startLine,
        endLine: options.endLine,
    };
}

/**
 * Create a search query with default values
 */
export function createSearchQuery(options: CreateSearchQueryOptions): SearchQuery {
    return {
        query: options.query,
        filters: options.filters,
        options: options.options,
    };
}
