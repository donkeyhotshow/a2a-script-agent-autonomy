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
    
    // Send the task message using canonical protocol
    const messageResponse = await client.request('POST', `/sessions/${sessionId}/message`, {
        context: {
            version: '1.0',
            session_id: sessionId,
            new_task: [task]
        },
        new_task: [task]
    });
    
    const responseData = (messageResponse as { data?: unknown }).data ?? messageResponse;
    
    // Extract context and execute information
    const context = responseData as Record<string, unknown>;
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
    const sessionId = context.session_id as string;
    
    if (!sessionId) {
        throw new Error('No session_id in context');
    }
    
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
    const sessionId = context.session_id as string;
    
    if (!sessionId) {
        throw new Error('No session_id in context');
    }
    
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
    const sessionId = context.session_id as string;
    
    if (!sessionId) {
        throw new Error('No session_id in context');
    }
    
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
export function isCompleted(response: { result?: ActionResultPayload }): boolean {
    return !!(response?.result?.completed || 
              (response?.result && Object.keys(response.result).length === 0));
}

/**
 * Extract final result from response
 */
export function getFinalResult(response: { finalResult?: unknown }): unknown {
    return response?.finalResult;
}
