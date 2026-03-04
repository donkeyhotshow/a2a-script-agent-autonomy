/**
 * Action response handling: execute actions using action-key shape.
 * 
 * Supports:
 * - script: Execute DSL code via script-runner
 * - read-file: Read file contents
 * - write-file: Write file contents
 * - rag-search: Perform RAG search
 * - execute-command: Execute shell commands
 * - form: Handle form interactions
 * - message: Display messages
 * 
 * All results use action-key shape as per PROTOCOL.md
 */

export interface HandleActionOptions {
    executeScript?: (code: string, input: Record<string, unknown>, context: { 
        workingDir?: string; 
        sessionId?: string; 
        stepId?: string 
    }) => Promise<{ success: boolean; data?: unknown; error?: string }>;
    readFile?: (path: string, options?: { startLine?: number; endLine?: number }) => Promise<{ 
        success: boolean; 
        content?: string; 
        error?: string 
    }>;
    writeFile?: (path: string, content: string, options?: { createDirs?: boolean }) => Promise<{ 
        success: boolean; 
        error?: string 
    }>;
    ragSearch?: (query: string, filters?: Record<string, unknown>, options?: Record<string, unknown>) => Promise<{
        success: boolean;
        results?: Array<Record<string, unknown>>;
        files?: string[];
        error?: string;
    }>;
    executeCommand?: (command: string, options?: { cwd?: string; timeout?: number }) => Promise<{
        success: boolean;
        exitCode?: number;
        stdout?: string;
        stderr?: string;
        error?: string;
    }>;
    sendContinue: (sessionId: string, result: Record<string, unknown>) => Promise<unknown>;
    projectPath?: string;
    sessionId?: string;
}

export interface HandleActionResult {
    handled: boolean;
    actionType?: string;
    result?: Record<string, unknown>;
    nextResponse?: unknown;
    error?: string;
    // UI-related fields for form/message types
    uiNeeded?: boolean;
    formData?: {
        title?: string;
        description?: string;
        choices?: Array<{ id: string; label: string; value?: unknown; description?: string }>;
        input?: Array<{
            name: string;
            type: 'text' | 'textarea' | 'select' | 'checkbox' | 'number';
            label?: string;
            required?: boolean;
            default?: unknown;
            options?: Array<{ value: unknown; label: string }>;
        }>;
    };
    messageData?: {
        content: string;
        role?: 'system' | 'user' | 'assistant';
    };
}

/**
 * Detect the type of response from server.
 * Determines whether the response requires UI interaction (form/message) or client execution.
 * 
 * @returns 'form' - UI needs to show a form with choices/input
 * @returns 'message' - UI needs to display a message
 * @returns 'action' - Client should execute an action (script, read-file, etc.)
 * @returns 'unknown' - Unknown or unsupported response type
 */
export function detectResponseType(response: {
    execute?: Record<string, unknown>;
}): 'form' | 'message' | 'action' | 'unknown' {
    if (!response?.execute) {
        return 'unknown';
    }
    
    const executeKeys = Object.keys(response.execute);
    if (executeKeys.length === 0) {
        return 'unknown';
    }
    
    const firstKey = executeKeys[0];
    
    // UI-only types
    if (firstKey === 'form' || firstKey === 'message') {
        return firstKey;
    }
    
    // Client execution types
    const clientActionTypes = ['script', 'read-file', 'write-file', 'rag-search', 'execute-command'];
    if (clientActionTypes.includes(firstKey)) {
        return 'action';
    }
    
    return 'unknown';
}

/**
 * Extract execute action from response using action-key shape
 */
function extractExecuteAction(response: {
    execute?: Record<string, unknown>;
}): { type: string; payload: unknown } | null {
    if (!response?.execute) return null;
    
    const executeKeys = Object.keys(response.execute);
    if (executeKeys.length === 0) return null;
    
    // Get the first action key (action-key shape)
    const actionType = executeKeys[0];
    const payload = response.execute[actionType];
    
    return { type: actionType, payload };
}

/**
 * Handle script execution
 */
async function handleScriptAction(
    payload: unknown,
    options: HandleActionOptions
): Promise<HandleActionResult> {
    const scriptPayload = payload as { code?: string; input?: Record<string, unknown>; output?: string };
    
    if (!scriptPayload?.code) {
        return { handled: false, error: 'No code in script action' };
    }
    
    if (!options.executeScript) {
        return { handled: false, error: 'executeScript handler not provided' };
    }
    
    try {
        const execResult = await options.executeScript(
            scriptPayload.code,
            scriptPayload.input ?? {},
            {
                workingDir: options.projectPath,
                sessionId: options.sessionId,
                stepId: 'current'
            }
        );
        
        if (!execResult.success && execResult.error) {
            return {
                handled: true,
                actionType: 'script',
                result: {
                    script: {
                        error: execResult.error
                    }
                }
            };
        }
        
        return {
            handled: true,
            actionType: 'script',
            result: {
                script: {
                    output: execResult.data
                }
            }
        };
    } catch (err) {
        return {
            handled: true,
            actionType: 'script',
            result: {
                script: {
                    error: err instanceof Error ? err.message : String(err)
                }
            }
        };
    }
}

/**
 * Handle read-file action
 */
async function handleReadFileAction(
    payload: unknown,
    options: HandleActionOptions
): Promise<HandleActionResult> {
    const filePayload = payload as { path?: string; startLine?: number; endLine?: number };
    
    if (!filePayload?.path) {
        return { handled: false, error: 'No path in read-file action' };
    }
    
    if (!options.readFile) {
        return { handled: false, error: 'readFile handler not provided' };
    }
    
    try {
        const result = await options.readFile(filePayload.path, {
            startLine: filePayload.startLine,
            endLine: filePayload.endLine
        });
        
        return {
            handled: true,
            actionType: 'read-file',
            result: {
                'read-file': {
                    path: filePayload.path,
                    content: result.success ? result.content : undefined,
                    error: result.error
                }
            }
        };
    } catch (err) {
        return {
            handled: true,
            actionType: 'read-file',
            result: {
                'read-file': {
                    path: filePayload.path,
                    error: err instanceof Error ? err.message : String(err)
                }
            }
        };
    }
}

/**
 * Handle write-file action
 */
async function handleWriteFileAction(
    payload: unknown,
    options: HandleActionOptions
): Promise<HandleActionResult> {
    const filePayload = payload as { path?: string; content?: string; createDirs?: boolean };
    
    if (!filePayload?.path || filePayload.content === undefined) {
        return { handled: false, error: 'No path or content in write-file action' };
    }
    
    if (!options.writeFile) {
        return { handled: false, error: 'writeFile handler not provided' };
    }
    
    try {
        const result = await options.writeFile(filePayload.path, filePayload.content, {
            createDirs: filePayload.createDirs
        });
        
        return {
            handled: true,
            actionType: 'write-file',
            result: {
                'write-file': {
                    path: filePayload.path,
                    success: result.success,
                    error: result.error
                }
            }
        };
    } catch (err) {
        return {
            handled: true,
            actionType: 'write-file',
            result: {
                'write-file': {
                    path: filePayload.path,
                    success: false,
                    error: err instanceof Error ? err.message : String(err)
                }
            }
        };
    }
}

/**
 * Handle rag-search action
 */
async function handleRagSearchAction(
    payload: unknown,
    options: HandleActionOptions
): Promise<HandleActionResult> {
    const searchPayload = payload as { 
        query?: string; 
        filters?: Record<string, unknown>;
        options?: Record<string, unknown>;
    };
    
    if (!searchPayload?.query) {
        return { handled: false, error: 'No query in rag-search action' };
    }
    
    if (!options.ragSearch) {
        return { handled: false, error: 'ragSearch handler not provided' };
    }
    
    try {
        const result = await options.ragSearch(
            searchPayload.query,
            searchPayload.filters,
            searchPayload.options
        );
        
        return {
            handled: true,
            actionType: 'rag-search',
            result: {
                'rag-search': {
                    results: result.success ? result.results : [],
                    files: result.success ? result.files : [],
                    query: searchPayload.query
                }
            }
        };
    } catch (err) {
        return {
            handled: true,
            actionType: 'rag-search',
            result: {
                'rag-search': {
                    results: [],
                    files: [],
                    query: searchPayload.query,
                    error: err instanceof Error ? err.message : String(err)
                }
            }
        };
    }
}

/**
 * Handle execute-command action
 */
async function handleExecuteCommandAction(
    payload: unknown,
    options: HandleActionOptions
): Promise<HandleActionResult> {
    const cmdPayload = payload as { 
        command?: string; 
        cwd?: string;
        env?: Record<string, string>;
        timeout?: number;
    };
    
    if (!cmdPayload?.command) {
        return { handled: false, error: 'No command in execute-command action' };
    }
    
    if (!options.executeCommand) {
        return { handled: false, error: 'executeCommand handler not provided' };
    }
    
    try {
        const result = await options.executeCommand(cmdPayload.command, {
            cwd: cmdPayload.cwd,
            timeout: cmdPayload.timeout
        });
        
        return {
            handled: true,
            actionType: 'execute-command',
            result: {
                'execute-command': {
                    command: cmdPayload.command,
                    exitCode: result.exitCode ?? (result.success ? 0 : 1),
                    stdout: result.stdout ?? '',
                    stderr: result.stderr ?? ''
                }
            }
        };
    } catch (err) {
        return {
            handled: true,
            actionType: 'execute-command',
            result: {
                'execute-command': {
                    command: cmdPayload.command,
                    exitCode: 1,
                    stdout: '',
                    stderr: err instanceof Error ? err.message : String(err)
                }
            }
        };
    }
}

/**
 * Handle form action (UI only - no client execution needed)
 * Returns data needed for UI to render form, and acknowledges to server
 */
function handleFormAction(
    payload: unknown,
    options: HandleActionOptions
): HandleActionResult {
    const formPayload = payload as {
        title?: string;
        description?: string;
        choices?: Array<{ id: string; label: string; value?: unknown; description?: string }>;
        input?: Array<{
            name: string;
            type: 'text' | 'textarea' | 'select' | 'checkbox' | 'number';
            label?: string;
            required?: boolean;
            default?: unknown;
            options?: Array<{ value: unknown; label: string }>;
        }>;
    };
    
    // Prepare UI data
    const formData = {
        title: formPayload?.title,
        description: formPayload?.description,
        choices: formPayload?.choices,
        input: formPayload?.input
    };
    
    // Always acknowledge to server (handled: true means we processed it)
    // UI will be notified via uiNeeded flag
    return {
        handled: true,
        actionType: 'form',
        uiNeeded: true,
        formData,
        result: {
            form: {
                acknowledged: true,
                hasChoices: !!(formPayload?.choices && formPayload.choices.length > 0),
                hasInput: !!(formPayload?.input && formPayload.input.length > 0)
            }
        }
    };
}

/**
 * Handle message action (UI only - no client execution needed)
 * Returns message data for UI display, and acknowledges to server
 */
function handleMessageAction(
    payload: unknown,
    options: HandleActionOptions
): HandleActionResult {
    const msgPayload = payload as { content?: string; role?: string };
    
    const messageData = {
        content: msgPayload?.content ?? '',
        role: msgPayload?.role as 'system' | 'user' | 'assistant' | undefined
    };
    
    // Always acknowledge to server (handled: true means we processed it)
    // UI will be notified via uiNeeded flag
    return {
        handled: true,
        actionType: 'message',
        uiNeeded: true,
        messageData,
        result: {
            message: {
                acknowledged: true,
                content: msgPayload?.content ?? ''
            }
        }
    };
}

/**
 * Main handler for execute actions using action-key shape.
 * Dispatches to appropriate handler based on action type.
 */
export { detectResponseType };
export { extractExecuteAction };
export async function handleExecuteAction(
    response: {
        execute?: Record<string, unknown>;
        context?: { session_id?: string };
    },
    options: HandleActionOptions
): Promise<HandleActionResult> {
    const action = extractExecuteAction(response);
    
    if (!action) {
        return { handled: false, error: 'No execute action found' };
    }
    
    // Set session ID from context if available
    if (response.context?.session_id && !options.sessionId) {
        options.sessionId = response.context.session_id;
    }
    
    let result: HandleActionResult;
    
    switch (action.type) {
        case 'script':
            result = await handleScriptAction(action.payload, options);
            break;
        case 'read-file':
            result = await handleReadFileAction(action.payload, options);
            break;
        case 'write-file':
            result = await handleWriteFileAction(action.payload, options);
            break;
        case 'rag-search':
            result = await handleRagSearchAction(action.payload, options);
            break;
        case 'execute-command':
            result = await handleExecuteCommandAction(action.payload, options);
            break;
        case 'form':
            result = handleFormAction(action.payload, options);
            break;
        case 'message':
            result = handleMessageAction(action.payload, options);
            break;
        default:
            return { 
                handled: false, 
                error: `Unknown action type: ${action.type}` 
            };
    }
    
    // If action was handled and sendContinue is provided, send result to server
    if (result.handled && result.result && options.sendContinue) {
        try {
            const nextResponse = await options.sendContinue(
                options.sessionId || '',
                result.result
            );
            result.nextResponse = nextResponse;
        } catch (err) {
            result.error = `Failed to send result: ${err instanceof Error ? err.message : String(err)}`;
        }
    }
    
    return result;
}

/**
 * Legacy compatibility: handleActionResponse (deprecated, use handleExecuteAction)
 * @deprecated Use handleExecuteAction instead
 */
export async function handleActionResponse(
    response: {
        action?: { currentStep?: { id?: string; code?: string } };
        execute?: { script?: { code?: string } };
        context?: { session_id?: string };
    },
    options: HandleActionOptions = {} as HandleActionOptions
): Promise<HandleActionResult> {
    // Support both new execute.script format and legacy action.currentStep format
    const stepInfo = extractStepInfo(response);
    
    if (!stepInfo || !stepInfo.code || !stepInfo.sessionId) {
        // Try new format
        return handleExecuteAction(response, options);
    }

    if (!options.executeScript || typeof options.sendContinue !== 'function') {
        return { handled: false, error: 'executeScript and sendContinue required' };
    }

    const context = {
        sessionId: stepInfo.sessionId,
        stepId: stepInfo.stepId,
        projectPath: options.projectPath
    };

    let stepResult: unknown;
    try {
        const execResult = await options.executeScript(stepInfo.code, {}, {
            workingDir: options.projectPath,
            sessionId: stepInfo.sessionId,
            stepId: stepInfo.stepId
        });
        
        if (!execResult.success && execResult.error) {
            throw new Error(execResult.error);
        }
        stepResult = execResult.data;
    } catch (err) {
        return { handled: true, error: err instanceof Error ? err.message : String(err) };
    }

    const result = {
        script: {
            output: stepResult
        }
    };

    const nextResponse = await options.sendContinue(stepInfo.sessionId, result);
    return { handled: true, result, nextResponse };
}

/**
 * Extract step info from response (supports both legacy action.currentStep and new execute.script formats)
 * @deprecated Used for legacy compatibility only
 */
function extractStepInfo(response: {
    action?: { currentStep?: { id?: string; code?: string } };
    execute?: { script?: { code?: string } };
    context?: { session_id?: string };
}): { stepId: string; code: string; sessionId: string } | null {
    // New format: execute.script
    if (response?.execute?.script?.code) {
        const stepId = response.action?.currentStep?.id || 'current';
        return {
            stepId,
            code: response.execute.script.code,
            sessionId: response.context?.session_id || ''
        };
    }
    
    // Legacy format: action.currentStep
    const step = response?.action?.currentStep;
    if (step?.code && response?.context?.session_id) {
        return {
            stepId: step.id || 'current',
            code: step.code,
            sessionId: response.context.session_id
        };
    }
    
    return null;
}

/**
 * Check if response contains execute.form.choices (new protocol format)
 */
export function hasFormChoices(response: unknown): boolean {
    return !!(response && typeof response === 'object' && 'execute' in response && 
        (response as { execute?: { form?: { choices?: unknown } } }).execute?.form?.choices);
}

/**
 * Extract form choices from response (new protocol format)
 */
export function extractFormChoices(response: unknown): Array<{ id: string; label: string }> {
    if (!response || typeof response !== 'object') return [];
    const exec = (response as { execute?: { form?: { choices?: unknown } } }).execute;
    if (!exec?.form?.choices) return [];
    return exec.form.choices as Array<{ id: string; label: string }>;
}

export type ExecuteScriptFn = (
    code: string,
    input: Record<string, unknown>,
    context: { workingDir?: string; sessionId?: string; stepId?: string }
) => Promise<{ success: boolean; data?: unknown; error?: string }>;

/**
 * Create executeScript adapter for @a2a/script-runner executeScript.
 */
export function createExecuteScript(executeScript: ExecuteScriptFn) {
    return async function(
        code: string,
        input: Record<string, unknown>,
        context: { 
            workingDir?: string; 
            sessionId?: string; 
            stepId?: string;
        }
    ): Promise<{ success: boolean; data?: unknown; error?: string }> {
        return executeScript(code, input, context);
    };
}

// Legacy compatibility exports
export type ExecuteCodeFn = (
    code: string,
    context: Record<string, unknown> & {
        projectPath?: string;
        sessionId?: string;
        stepId?: string;
        previousOutput?: unknown;
    }
) => Promise<unknown>;

/**
 * Create executeCode adapter for @a2a/script-runner executeScript (legacy).
 * @deprecated Use createExecuteScript instead
 */
export function createExecuteCode(executeScript: ExecuteScriptFn): ExecuteCodeFn {
    return async function executeCode(
        code: string,
        context: Record<string, unknown> & {
            projectPath?: string;
            sessionId?: string;
            stepId?: string;
            previousOutput?: unknown;
        }
    ): Promise<unknown> {
        const result = await executeScript(code, (context?.previousOutput ?? {}) as Record<string, unknown>, {
            workingDir: context?.projectPath,
            sessionId: context?.sessionId,
            stepId: context?.stepId,
        });
        if (result?.success === false && result?.error) {
            throw new Error(result.error);
        }
        return result?.data ?? result;
    };
}
