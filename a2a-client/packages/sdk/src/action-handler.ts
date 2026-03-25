/**
 * Action response handling: execute actions using action-key shape.
 * 
 * Supports:
 * - script: Execute DSL code via script-runner
 * - read-file: Read file contents
 * - write-file: Write file contents
 * - rag-search: Perform RAG search
 * - execute-command: Execute shell commands
 * - list-directory, grep-search, file-exists, edit-patch, run-script: workspace tools (optional callbacks)
 * - form: Handle form interactions
 * - message: Display messages
 * 
 * All results use action-key shape as per PROTOCOL.md
 */

import type { HandleActionOptions, HandleActionResult } from './types.js';

export type { HandleActionOptions, HandleActionResult } from './types.js';

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
    
    const clientActionTypes = [
        'script',
        'read-file',
        'write-file',
        'rag-search',
        'execute-command',
        'list-directory',
        'grep-search',
        'file-exists',
        'edit-patch',
        'run-script',
    ];
    if (clientActionTypes.includes(firstKey)) {
        return 'action';
    }
    
    return 'unknown';
}

/**
 * Extract execute action from response using action-key shape
 */
export function extractExecuteAction(response: {
    execute?: Record<string, unknown>;
}): { type: string; payload: unknown } | null {
    if (!response?.execute) return null;
    
    const executeKeys = Object.keys(response.execute);
    if (executeKeys.length === 0) return null;
    
    // Guard: ensure exactly one action key in execute (golden simulation contract)
    if (executeKeys.length !== 1) {
        return { type: 'invalid', payload: { error: `Execute must contain exactly one action key, found ${executeKeys.length}: ${JSON.stringify(executeKeys)}` } };
    }
    
    // Get the first action key (action-key shape)
    const actionType = executeKeys[0];
    const payload = response.execute[actionType];
    
    return { type: actionType, payload };
}

// Import action handlers
import {
    handleScriptAction,
    handleReadFileAction,
    handleWriteFileAction,
    handleExecuteCommandAction,
    handleRagSearchAction,
    handleFormAction,
    handleMessageAction,
    handleListDirectoryAction,
    handleGrepWorkspaceAction,
    handleFileExistsAction,
    handleEditPatchAction,
    handleRunRegisteredScriptAction,
} from './action-handlers/index.js';

/**
 * Handle execute action using action-key shape
 */
export async function handleExecuteAction(
    response: { execute?: Record<string, unknown> },
    options: HandleActionOptions
): Promise<HandleActionResult> {
    const action = extractExecuteAction(response);
    if (!action) {
        return { handled: false, error: 'No execute action found' };
    }
    
    // Guard: ensure exactly one action key in execute (golden simulation contract)
    if (response.execute && Object.keys(response.execute).length !== 1) {
        const keys = Object.keys(response.execute);
        return { 
            handled: false, 
            error: `Execute must contain exactly one action key, found ${keys.length}: ${JSON.stringify(keys)}` 
        };
    }
    
    let result: HandleActionResult;
    
    // Handle invalid action type from guard in extractExecuteAction
    if (action.type === 'invalid') {
        return { 
            handled: false, 
            error: (action.payload as { error?: string })?.error || 'Invalid execute shape' 
        };
    }
    
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
        case 'list-directory':
            result = await handleListDirectoryAction(action.payload, options);
            break;
        case 'grep-search':
            result = await handleGrepWorkspaceAction(action.payload, options);
            break;
        case 'file-exists':
            result = await handleFileExistsAction(action.payload, options);
            break;
        case 'edit-patch':
            result = await handleEditPatchAction(action.payload, options);
            break;
        case 'run-script':
            result = await handleRunRegisteredScriptAction(action.payload, options);
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
