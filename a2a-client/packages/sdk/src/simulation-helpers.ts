/**
 * Simulation-style flow helpers.
 * Task: tasks/client/01-api-client-protocol-and-simulation-alignment.md
 *
 * Implements invokeFirstTask(task, options) → { context, execute.form.choices | pending }
 * Implements sendFormChoice(context, choiceId, extra?) → next response
 * Implements sendMessage(context, message) → next response (AI-Actions)
 * Implements sendClientActionResult(context, actionKey, result) → next response
 *
 * All results use action-key shape as per PROTOCOL.md
 */

// Execute action types
export interface FormChoice {
    id: string;
    label?: string;
    description?: string;
}

export interface FormInput {
    name: string;
    type: 'text' | 'textarea' | 'select' | 'checkbox' | 'number';
    label?: string;
    required?: boolean;
    default?: unknown;
    options?: Array<{ value: unknown; label: string }>;
}

export interface FormAction {
    title?: string;
    description?: string;
    input?: FormInput[];
    choices?: FormChoice[];
}

export interface ScriptAction {
    input?: Record<string, unknown>;
    output?: string;
    code: string;
    timeout?: number;
}

export interface ReadFileAction {
    path: string;
    startLine?: number;
    endLine?: number;
}

export interface WriteFileAction {
    path: string;
    content: string;
    createDirs?: boolean;
}

export interface RagSearchAction {
    query: string;
    filters?: {
        file_types?: string[];
        directories?: string[];
        framework?: string;
        exclude?: string[];
    };
    options?: {
        limit?: number;
        min_score?: number;
        include_context?: boolean;
        highlight_matches?: boolean;
    };
}

export interface ExecuteCommandAction {
    command: string;
    cwd?: string;
    env?: Record<string, string>;
    timeout?: number;
}

export interface ListDirectoryAction {
    path?: string;
    dirPath?: string;
    recursive?: boolean;
    pattern?: string;
}

export interface GrepSearchToolAction {
    pattern: string;
    path?: string;
    glob?: string;
}

export interface FileExistsAction {
    path: string;
}

export interface EditPatchAction {
    path: string;
    patch?: string;
    hunks?: unknown;
}

export interface RunScriptToolAction {
    scriptId: string;
    params?: Record<string, unknown>;
}

export interface MessageAction {
    content: string;
    role?: 'system' | 'user' | 'assistant';
}

// Result types
export interface ScriptResult {
    output?: unknown;
    error?: string;
}

export interface ReadFileResult {
    path: string;
    content?: string;
    error?: string;
}

export interface WriteFileResult {
    path: string;
    success: boolean;
    error?: string;
}

export interface RagSearchResultEntry {
    file: string;
    score: number;
    matches: Array<{
        line_start: number;
        line_end: number;
        content: string;
        highlight: string;
        context_score: number;
    }>;
    metadata: {
        framework: string;
        type: string;
        last_modified: string;
    };
}

export interface RagSearchResultPayload {
    results: RagSearchResultEntry[];
    files: string[];
    query?: string;
}

export interface ExecuteCommandResult {
    command: string;
    exitCode: number;
    stdout: string;
    stderr: string;
}

export interface FormResult {
    choice?: string;
    input?: Record<string, unknown>;
}

/**
 * Action result with action-key shape
 * All results MUST use action-type keys
 */
export interface ActionResultPayload {
    script?: ScriptResult;
    'read-file'?: ReadFileResult;
    'write-file'?: WriteFileResult;
    'rag-search'?: RagSearchResultPayload;
    'execute-command'?: ExecuteCommandResult;
    'list-directory'?: Record<string, unknown>;
    'grep-search'?: Record<string, unknown>;
    'file-exists'?: Record<string, unknown>;
    'edit-patch'?: Record<string, unknown>;
    'run-script'?: Record<string, unknown>;
    form?: FormResult;
    choice?: string;
    message?: string;
    completed?: boolean;
}

/**
 * Execute payload with action-key shape
 * All execute objects MUST use this format
 */
export interface ExecutePayload {
    form?: FormAction;
    script?: ScriptAction;
    'rag-search'?: RagSearchAction;
    'read-file'?: ReadFileAction;
    'write-file'?: WriteFileAction;
    'execute-command'?: ExecuteCommandAction;
    'list-directory'?: ListDirectoryAction;
    'grep-search'?: GrepSearchToolAction;
    'file-exists'?: FileExistsAction;
    'edit-patch'?: EditPatchAction;
    'run-script'?: RunScriptToolAction;
    message?: MessageAction;
}

export interface InvokeFirstTaskOptions {
    projectId?: string;
}

export interface FirstTaskResult {
    context: Record<string, unknown>;
    execute?: ExecutePayload;
    promiseId?: string;
    status?: string;
}

/** Client-like: request(method, path, body) – use ApiClient in real impl */
type ClientLike = { 
    request(method: string, path: string, body: Record<string, unknown> | null): Promise<Record<string, unknown>> 
};

/**
 * First request with task string, return context + execute.form.choices or pending
 */
export async function invokeFirstTask(
    client: ClientLike,
    task: string,
    options?: InvokeFirstTaskOptions
): Promise<FirstTaskResult> {
    // Create a new session
    const sessionResponse = await client.request('POST', '/sessions', {
        project_id: options?.projectId || 'default'
    });
    
    const sessionData = (sessionResponse as { data?: unknown }).data ?? sessionResponse;
    const sessionId = (sessionData as { session_id?: string }).session_id;
    
    if (!sessionId) {
        throw new Error('Failed to create session: no session_id returned');
    }
    
    // Send the task message using canonical protocol (v2.0)
    const messageResponse = await client.request('POST', `/sessions/${sessionId}/message`, {
        context: {
            version: '2.0',
            // session_id is a technical field, not part of protocol
            // session_id: sessionId,
            new_task: [task]
        },
        new_task: [task]
    });
    
    const responseData = (messageResponse as { data?: unknown }).data ?? messageResponse;
    
    // Handle different response structures:
    // 1. { success: true, data: { context: {...} } } - API wrapper with nested data
    // 2. { context: {...} } - direct context response
    // 3. { data: { context: {...} } } - double nested
    let context: Record<string, unknown>;
    
    if (responseData && typeof responseData === 'object') {
        const respObj = responseData as Record<string, unknown>;
        if ('context' in respObj) {
            // Format: { context: {...} }
            context = respObj.context as Record<string, unknown>;
        } else if ('data' in respObj) {
            // Format: { data: { context: {...} } }
            const innerData = respObj.data as Record<string, unknown>;
            context = (innerData.context as Record<string, unknown>) ?? respObj;
        } else {
            // Format: direct context object
            context = respObj;
        }
    } else {
        context = responseData as Record<string, unknown>;
    }
    const execute = (context.execute as ExecutePayload) ?? undefined;
    
    // Check for promiseId (indicates pending response)
    const promiseId = context.promiseId ? String(context.promiseId) : undefined;
    const status = context.status ? String(context.status) : undefined;
    
    const result: FirstTaskResult = {
        context,
        execute,
        promiseId,
        status
    };
    
    return result;
}

/**
 * Send result.choice for form, return next response
 * Uses action-key shape
 */
export async function sendFormChoice(
    client: ClientLike,
    context: Record<string, unknown>,
    choiceId: string,
    extra?: Record<string, unknown>
): Promise<Record<string, unknown>> {
    // session_id is a technical field, not part of protocol
    // const sessionId = context.session_id as string;
    
    // if (!sessionId) {
    //     throw new Error('No session_id in context');
    // }
    
    // Build result with action-key shape
    const result: ActionResultPayload = {
        choice: choiceId,
        ...extra
    };
    
    const response = await client.request('POST', `/sessions/${sessionId}/message`, {
        context: {
            ...context,
            result
        },
        result
    });
    
    const responseData = (response as { data?: unknown }).data ?? response;
    
    return responseData as Record<string, unknown>;
}

/**
 * Send result.message for AI-Actions dialog step
 * Uses action-key shape
 */
export async function sendMessage(
    client: ClientLike,
    context: Record<string, unknown>,
    message: string
): Promise<Record<string, unknown>> {
    // session_id is a technical field, not part of protocol
    // const sessionId = context.session_id as string;
    
    // if (!sessionId) {
    //     throw new Error('No session_id in context');
    // }
    
    // Build result with action-key shape
    const result: ActionResultPayload = {
        message
    };
    
    const response = await client.request('POST', `/sessions/${sessionId}/message`, {
        context: {
            ...context,
            result
        },
        result
    });
    
    const responseData = (response as { data?: unknown }).data ?? response;
    
    return responseData as Record<string, unknown>;
}

/**
 * Send client action result with action-key shape
 * 
 * Example:
 *   sendClientActionResult(client, context, 'read-file', { path: 'file.txt', content: 'hello' })
 *   sendClientActionResult(client, context, 'script', { output: result })
 *   sendClientActionResult(client, context, 'rag-search', { results: [...], files: [...] })
 */
export async function sendClientActionResult<T extends keyof ActionResultPayload>(
    client: ClientLike,
    context: Record<string, unknown>,
    actionKey: T,
    actionResult: ActionResultPayload[T]
): Promise<Record<string, unknown>> {
    // session_id is a technical field, not part of protocol
    // const sessionId = context.session_id as string;
    
    // if (!sessionId) {
    //     throw new Error('No session_id in context');
    // }
    
    // Build result with action-key shape
    const result: ActionResultPayload = {
        [actionKey]: actionResult
    } as ActionResultPayload;
    
    const response = await client.request('POST', `/sessions/${sessionId}/message`, {
        context: {
            ...context,
            result
        },
        result
    });
    
    const responseData = (response as { data?: unknown }).data ?? response;
    
    return responseData as Record<string, unknown>;
}

/**
 * Check if response has form choices
 */
export function hasFormChoices(response: { execute?: ExecutePayload }): boolean {
    return !!(response?.execute?.form?.choices && response.execute.form.choices.length > 0);
}

/**
 * Extract form choices from response
 */
export function getFormChoices(response: { execute?: ExecutePayload }): FormChoice[] {
    return response?.execute?.form?.choices ?? [];
}

/**
 * Check if response has an execute action
 */
export function hasExecuteAction(response: { execute?: ExecutePayload }): boolean {
    return !!response?.execute && Object.keys(response.execute).length > 0;
}

/**
 * Get the execute action type from response
 */
export function getExecuteActionType(response: { execute?: ExecutePayload }): keyof ExecutePayload | null {
    if (!response?.execute) return null;
    const keys = Object.keys(response.execute) as (keyof ExecutePayload)[];
    return keys.length > 0 ? keys[0] : null;
}

/**
 * Check if response indicates completion
 */
export function isCompleted(response: {
    result?: ActionResultPayload;
    context?: { execution?: { status?: string } };
    execute?: { completed?: boolean };
}): boolean {
    if (response?.result?.completed) return true;
    if (response?.execute?.completed) return true;
    if (response?.context?.execution?.status === 'completed') return true;
    return !!(response?.result && Object.keys(response.result).length === 0);
}

/**
 * Final result structure from server response
 * @see docs/new-request-flow/PROTOCOL.md#завершение-финальный-результат
 */
export interface FinalResult {
    action: string;
    summary: Record<string, unknown>;
}

/**
 * Optional metadata when the step is complete (from top-level `result`).
 */
export function getFinalResult(response: {
    result?: Record<string, unknown>;
    context?: { execution?: { action?: string } };
}): FinalResult | null {
    const r = response?.result;
    if (!r || typeof r !== 'object' || r.completed !== true) return null;
    const { completed: _c, ...summary } = r;
    if (Object.keys(summary).length === 0) return null;
    return {
        action: String(response.context?.execution?.action ?? 'task'),
        summary: summary as Record<string, unknown>,
    };
}

/**
 * Extract execution info from context
 */
export function getExecution(
    response: { context?: Record<string, unknown> }
): { action: string; step: string; status?: string; progress?: number } | null {
    const execution = response?.context?.execution as Record<string, unknown> | undefined;
    if (!execution) return null;
    return {
        action: String(execution.action ?? ''),
        step: String(execution.step ?? ''),
        status: execution.status as string | undefined,
        progress: execution.progress as number | undefined,
    };
}

// ============================================
// History management functions
// @see docs/new-request-flow/PROTOCOL.md#context-fields-system-managed
// ============================================

export interface HistoryEntry {
    action: string;
    step: string;
    result?: unknown;
    timestamp: string;
}

/**
 * Add an entry to the execution history in context
 */
export function addToHistory(
    context: Record<string, unknown>,
    action: string,
    step: string,
    result?: unknown
): Record<string, unknown> {
    const history = (context.history as HistoryEntry[]) ?? [];
    const newEntry: HistoryEntry = {
        action,
        step,
        result,
        timestamp: new Date().toISOString(),
    };
    return {
        ...context,
        history: [...history, newEntry],
    };
}

/**
 * Get execution history from context
 */
export function getHistory(context: Record<string, unknown>): HistoryEntry[] {
    return (context.history as HistoryEntry[]) ?? [];
}

// ============================================
// Actions vs AI-Actions helpers
// @see docs/new-request-flow/PROTOCOL.md#два-типа-действий-actions-vs-ai-actions
// ============================================

/**
 * Determine if the response is for an AI-Action (LLM-controlled)
 * AI-Actions typically have step = 'request' or include availableSteps
 */
export function isAiAction(response: { context?: Record<string, unknown> }): boolean {
    const execution = response?.context?.execution as Record<string, unknown> | undefined;
    if (!execution) return false;
    
    const step = String(execution.step ?? '');
    // AI-Actions typically use 'request' as the step
    if (step === 'llm-request') return true;
    
    // Check for availableSteps (present in AI-Actions)
    const availableSteps = execution.availableSteps as string[] | undefined;
    if (availableSteps && availableSteps.length > 0) return true;
    
    return false;
}

/**
 * Get action type: 'action' (server-controlled) or 'ai-action' (LLM-controlled)
 */
export function getActionType(response: { context?: Record<string, unknown> }): 'action' | 'ai-action' | null {
    const execution = response?.context?.execution as Record<string, unknown> | undefined;
    if (!execution) return null;
    
    if (isAiAction(response)) {
        return 'ai-action';
    }
    return 'action';
}

/**
 * Get available steps for AI-Actions
 */
export function getAvailableSteps(response: { context?: Record<string, unknown> }): string[] {
    const execution = response?.context?.execution as Record<string, unknown> | undefined;
    if (!execution) return [];
    return (execution.availableSteps as string[]) ?? [];
}
