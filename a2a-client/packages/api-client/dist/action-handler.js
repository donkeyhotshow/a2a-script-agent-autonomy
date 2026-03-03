"use strict";
/**
 * Action response handling: run currentStep.code via script-runner and send continue.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleActionResponse = handleActionResponse;
exports.hasFormChoices = hasFormChoices;
exports.extractFormChoices = extractFormChoices;
exports.createExecuteCode = createExecuteCode;
/**
 * Extract step info from response (supports both legacy action.currentStep and new execute.script formats)
 */
function extractStepInfo(response) {
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
async function handleActionResponse(response, options = {}) {
    // Support both new execute.script format and legacy action.currentStep format
    const stepInfo = extractStepInfo(response);
    if (!stepInfo || !stepInfo.code || !stepInfo.sessionId) {
        return { handled: false };
    }
    const { executeCode, sendContinue } = options;
    if (typeof executeCode !== 'function' || typeof sendContinue !== 'function') {
        return { handled: false, error: 'executeCode and sendContinue required' };
    }
    const context = {
        sessionId: stepInfo.sessionId,
        stepId: stepInfo.stepId,
        projectPath: options.projectPath,
        previousOutput: options.previousOutput,
    };
    let stepResult;
    try {
        stepResult = await executeCode(stepInfo.code, context);
    }
    catch (err) {
        return { handled: true, error: err instanceof Error ? err.message : String(err) };
    }
    const nextResponse = await sendContinue(stepInfo.sessionId, stepInfo.stepId, stepResult);
    return { handled: true, stepResult, nextResponse };
}
/**
 * Check if response contains execute.form.choices (new protocol format)
 */
function hasFormChoices(response) {
    return !!(response && typeof response === 'object' && 'execute' in response &&
        response.execute?.form?.choices);
}
/**
 * Extract form choices from response (new protocol format)
 */
function extractFormChoices(response) {
    if (!response || typeof response !== 'object')
        return [];
    const exec = response.execute;
    if (!exec?.form?.choices)
        return [];
    return exec.form.choices;
}
/**
 * Create executeCode adapter for @a2a/script-runner executeScript.
 */
function createExecuteCode(executeScript) {
    return async function executeCode(code, context) {
        const result = await executeScript(code, (context?.previousOutput ?? {}), {
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
