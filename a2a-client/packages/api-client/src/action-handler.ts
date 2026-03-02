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

/**
 * Extract step info from response (supports both legacy action.currentStep and new execute.script formats)
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
            sessionId: response.context?.session_id || '',
        };
    }
    
    // Legacy format: action.currentStep
    const step = response?.action?.currentStep;
    if (step?.code && response?.context?.session_id) {
        return {
            stepId: step.id || 'current',
            code: step.code,
            sessionId: response.context.session_id,
        };
    }
    
    return null;
}

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
        return {handled: false};
    }

    const {executeCode, sendContinue} = options;
    if (typeof executeCode !== 'function' || typeof sendContinue !== 'function') {
        return {handled: false, error: 'executeCode and sendContinue required'};
    }

    const context: Record<string, unknown> = {
        sessionId: stepInfo.sessionId,
        stepId: stepInfo.stepId,
        projectPath: options.projectPath,
        previousOutput: options.previousOutput,
    };

    let stepResult: unknown;
    try {
        stepResult = await executeCode(stepInfo.code, context);
    } catch (err) {
        return {handled: true, error: err instanceof Error ? err.message : String(err)};
    }

    const nextResponse = await sendContinue(stepInfo.sessionId, stepInfo.stepId, stepResult);
    return {handled: true, stepResult, nextResponse};
}

/**
 * Check if response contains execute.form.choices (new protocol format)
 */
export function hasFormChoices(response: unknown): boolean {
    return !!(response && typeof response === 'object' && 'execute' in response && 
        (response as {execute?: {form?: {choices?: unknown}}}).execute?.form?.choices);
}

/**
 * Extract form choices from response (new protocol format)
 */
export function extractFormChoices(response: unknown): Array<{id: string; label: string}> {
    if (!response || typeof response !== 'object') return [];
    const exec = (response as {execute?: {form?: {choices?: unknown}}}).execute;
    if (!exec?.form?.choices) return [];
    return exec.form.choices as Array<{id: string; label: string}>;
}

export type ExecuteScriptFn = (
    code: string,
    input: Record<string, unknown>,
    context: { workingDir?: string; sessionId?: string; stepId?: string }
) => Promise<{ success: boolean; data?: unknown; error?: string }>;

/**
 * Create executeCode adapter for @a2a/script-runner executeScript.
 */
export function createExecuteCode(executeScript: ExecuteScriptFn) {
    return async function executeCode(
        code: string,
        context: Record<string, unknown> & {
            projectPath?: string;
            sessionId?: string;
            stepId?: string;
            previousOutput?: unknown
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
