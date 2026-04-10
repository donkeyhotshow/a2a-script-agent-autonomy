/**
 * A2A Protocol - context and file block handling
 * Supports both legacy (1.0) and new (2.0) protocol
 * @see docs/new-request-flow/PROTOCOL.md
 */

const VERSION = '1.0';
const NEW_VERSION = '2.0';

export interface FileBlockLike {
    path: string;
    content: string;
    startLine?: number;
    endLine?: number;
}

export function buildNewTaskContext(
    sessionId: string,
    newTask: string[],
    architecturalFeatures?: string[]
): Record<string, unknown> {
    // session_id is a technical field, not part of protocol
    const ctx: Record<string, unknown> = {version: VERSION, new_task: newTask};
    if (architecturalFeatures?.length) ctx.architectural_features = architecturalFeatures;
    return ctx;
}

export function buildContinueContext(sessionId: string): Record<string, unknown> {
    // session_id is a technical field, not part of protocol
    return {version: VERSION, continue: true};
}

export function buildConfirmContext(sessionId: string): Record<string, unknown> {
    // session_id is a technical field, not part of protocol
    return {version: VERSION, confirm: true};
}

export function buildFileResponseContext(sessionId: string): Record<string, unknown> {
    // session_id is a technical field, not part of protocol
    return {version: VERSION};
}

// ============================================
// New Protocol (v2.0) Functions
// @see docs/new-request-flow/PROTOCOL.md
// ============================================

/**
 * Build context block for new protocol (v2.0)
 * @see docs/new-request-flow/PROTOCOL.md#context
 */
export function buildProtocolContext(
    sessionId: string,
    options?: {
        execution?: { action: string; step: string; status?: string; progress?: number };
        history?: Array<{ action: string; step: string; result?: unknown; timestamp: string }>;
        workbench?: unknown;
        newTask?: string[];
        architecturalFeatures?: string[];
        continue?: boolean;
        confirm?: boolean;
        tasks?: unknown[];
        requestFiles?: string[];
        errors?: unknown[];
    }
): Record<string, unknown> {
    const NEW_VERSION = '2.0';
    // session_id is a technical field, not part of protocol
    const ctx: Record<string, unknown> = {
        version: NEW_VERSION,
    };
    
    if (options?.execution) ctx.execution = options.execution;
    if (options?.history) ctx.history = options.history;
    if (options?.workbench !== undefined) ctx.workbench = options.workbench;
    if (options?.newTask) ctx.new_task = options.newTask;
    if (options?.architecturalFeatures) ctx.architectural_features = options.architecturalFeatures;
    if (options?.continue) ctx.continue = options.continue;
    if (options?.confirm) ctx.confirm = options.confirm;
    if (options?.tasks) ctx.tasks = options.tasks;
    if (options?.requestFiles) ctx.request_files = options.requestFiles;
    if (options?.errors) ctx.errors = options.errors;
    
    return ctx;
}

/**
 * Build form choice request (new protocol)
 * @see docs/new-request-flow/PROTOCOL.md#form-choice-request
 */
export function buildFormChoiceRequest(
    context: Record<string, unknown>,
    choiceId: string,
    input?: Record<string, unknown>
): { context: Record<string, unknown>; result: { form: { choice: string; input?: Record<string, unknown> } } } {
    return {
        context,
        result: {
            form: {
                choice: choiceId,
                ...(input && { input }),
            },
        },
    };
}

/**
 * Build action result request (new protocol)
 * @see docs/new-request-flow/PROTOCOL.md#action-result-request
 */
export function buildActionResultRequest(
    context: Record<string, unknown>,
    result: Record<string, unknown>
): { context: Record<string, unknown>; result: Record<string, unknown> } {
    return { context, result };
}

/**
 * Check if response is form choices response (new protocol)
 * @see docs/new-request-flow/PROTOCOL.md#form-choices-response
 */
export function isFormChoicesResponse(response: { execute?: Record<string, unknown> }): boolean {
    return !!(
        response?.execute &&
        typeof response.execute === 'object' &&
        'form' in response.execute &&
        response.execute.form &&
        typeof response.execute.form === 'object' &&
        'choices' in response.execute.form
    );
}

/**
 * Check if response is completed response (new protocol)
 * @see docs/new-request-flow/PROTOCOL.md#completed-response
 * 
 * Checks multiple signals for completion:
 * - response.result.completed === true (preferred, golden contract)
 * - response.execute.completed === true (backward compatibility)
 * - response.context.execution.status === 'completed' (optional compatibility)
 */
export function isCompletedResponse(response: { execute?: Record<string, unknown>; result?: Record<string, unknown>; context?: Record<string, unknown> }): boolean {
    // Preferred: check result.completed (golden contract)
    if (
        response?.result &&
        typeof response.result === 'object' &&
        'completed' in response.result &&
        response.result.completed === true
    ) {
        return true;
    }
    
    // Backward compatibility: check execute.completed
    if (
        response?.execute &&
        typeof response.execute === 'object' &&
        'completed' in response.execute &&
        response.execute.completed === true
    ) {
        return true;
    }
    
    // Optional: check context.execution.status
    if (
        response?.context &&
        typeof response.context === 'object' &&
        'execution' in response.context &&
        response.context.execution &&
        typeof response.context.execution === 'object' &&
        'status' in response.context.execution &&
        response.context.execution.status === 'completed'
    ) {
        return true;
    }
    
    return false;
}

/**
 * Check if response is error response (new protocol)
 * @see docs/new-request-flow/PROTOCOL.md#error-response
 */
export function isErrorResponse(response: { error?: Record<string, unknown> }): boolean {
    return !!(
        response?.error &&
        typeof response.error === 'object' &&
        'code' in response.error &&
        'message' in response.error
    );
}

/**
 * Check if context is new protocol (v2.0)
 */
export function isNewProtocol(context: Record<string, unknown>): boolean {
    return context?.version === '2.0';
}

export function serializeFileBlock(
    path: string,
    content: string,
    startLine?: number,
    endLine?: number
): string {
    const sig = endLine != null ? `${path}:${startLine}-${endLine}` : path;
    return `\`\`\`file:${sig}\n${content}\n\`\`\``;
}

export function parseFileBlock(
    text: string
): { path: string; content: string; startLine?: number; endLine?: number } | null {
    const m = text.match(/^```file:([^\n]+)\n([\s\S]*?)```$/m);
    if (!m) return null;
    const [, sig, content] = m;
    const rangeMatch = sig?.match(/^(.+):(\d+)-(\d+)$/);
    if (rangeMatch) {
        return {
            path: rangeMatch[1],
            content: content.trim(),
            startLine: +rangeMatch[2],
            endLine: +rangeMatch[3],
        };
    }
    return {path: sig ?? '', content: content.trim()};
}

export function serializeMessage(
    context: Record<string, unknown>,
    files: FileBlockLike[] = []
): string {
    const parts = [`\`\`\`context\n${JSON.stringify(context, null, 0)}\n\`\`\``];
    for (const f of files) {
        parts.push(serializeFileBlock(f.path, f.content, f.startLine, f.endLine));
    }
    return parts.join('\n\n');
}

export function parseMessage(text: string): { context: Record<string, unknown>; files: FileBlockLike[] } | null {
    const contextMatch = text.match(/```context\n([\s\S]*?)```/);
    if (!contextMatch) return null;
    let context: Record<string, unknown>;
    try {
        context = JSON.parse(contextMatch[1].trim());
    } catch (err) {
        console.error('[Protocol] Failed to parse context JSON:', err);
        return null;
    }
    const files: FileBlockLike[] = [];
    const fileRegex = /```file:([^\n]+)\n([\s\S]*?)```/g;
    let match: RegExpExecArray | null;
    while ((match = fileRegex.exec(text)) !== null) {
        const sig = match[1];
        const content = match[2].trim();
        const rangeMatch = sig.match(/^(.+):(\d+)-(\d+)$/);
        if (rangeMatch) {
            files.push({
                path: rangeMatch[1],
                content,
                startLine: +rangeMatch[2],
                endLine: +rangeMatch[3],
            });
        } else {
            files.push({path: sig, content});
        }
    }
    return {context, files};
}

export {VERSION};
