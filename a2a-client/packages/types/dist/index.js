"use strict";
/**
 * @a2a/types - Shared TypeScript types for A2A packages
 * Shared between @a2a/client, @a2a/server, and other packages.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContextBlock = createContextBlock;
exports.createTask = createTask;
exports.createFileBlock = createFileBlock;
exports.createSearchQuery = createSearchQuery;
// ============================================
// Factory functions
// ============================================
function createContextBlock(options) {
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
function createTask(options) {
    return {
        id: options.id ?? `task_${Date.now()}`,
        type: options.type ?? 'analyze',
        status: options.status ?? 'pending',
        target: options.target,
        progress: options.progress ?? 0,
    };
}
function createFileBlock(options) {
    return {
        path: options.path,
        content: options.content,
        startLine: options.startLine,
        endLine: options.endLine,
    };
}
function createSearchQuery(options) {
    return {
        query: options.query,
        filters: options.filters,
        options: options.options,
    };
}
