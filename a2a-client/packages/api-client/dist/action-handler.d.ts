/**
 * Action response handling: run currentStep.code via script-runner and send continue.
 */
export interface HandleActionOptions {
    executeCode: (code: string, context: Record<string, unknown>) => Promise<unknown>;
    sendContinue: (sessionId: string, stepId: string, stepResult: unknown) => Promise<unknown>;
    projectPath?: string;
    previousOutput?: unknown;
}
export interface HandleActionResult {
    handled: boolean;
    stepResult?: unknown;
    nextResponse?: unknown;
    error?: string;
}
export declare function handleActionResponse(response: {
    action?: {
        currentStep?: {
            id?: string;
            code?: string;
        };
    };
    execute?: {
        script?: {
            code?: string;
        };
    };
    context?: {
        session_id?: string;
    };
}, options?: HandleActionOptions): Promise<HandleActionResult>;
/**
 * Check if response contains execute.form.choices (new protocol format)
 */
export declare function hasFormChoices(response: unknown): boolean;
/**
 * Extract form choices from response (new protocol format)
 */
export declare function extractFormChoices(response: unknown): Array<{
    id: string;
    label: string;
}>;
export type ExecuteScriptFn = (code: string, input: Record<string, unknown>, context: {
    workingDir?: string;
    sessionId?: string;
    stepId?: string;
}) => Promise<{
    success: boolean;
    data?: unknown;
    error?: string;
}>;
/**
 * Create executeCode adapter for @a2a/script-runner executeScript.
 */
export declare function createExecuteCode(executeScript: ExecuteScriptFn): (code: string, context: Record<string, unknown> & {
    projectPath?: string;
    sessionId?: string;
    stepId?: string;
    previousOutput?: unknown;
}) => Promise<unknown>;
