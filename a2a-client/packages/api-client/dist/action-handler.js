"use strict";
/**
 * Action response handling: run currentStep.code via script-runner and send continue.
 */
Object.defineProperty(exports, "__esModule", {value: true});
exports.handleActionResponse = handleActionResponse;
exports.createExecuteCode = createExecuteCode;

async function handleActionResponse(response, options = {}) {
    const step = response?.action?.currentStep;
    const code = step?.code;
    const sessionId = response?.context?.session_id;
    if (!code || !sessionId || !step?.id) {
        return {handled: false};
    }
    const {executeCode, sendContinue} = options;
    if (typeof executeCode !== 'function' || typeof sendContinue !== 'function') {
        return {handled: false, error: 'executeCode and sendContinue required'};
    }
    const context = {
        sessionId,
        stepId: step.id,
        projectPath: options.projectPath,
        previousOutput: options.previousOutput,
    };
    let stepResult;
    try {
        stepResult = await executeCode(code, context);
    } catch (err) {
        return {handled: true, error: err instanceof Error ? err.message : String(err)};
    }
    const nextResponse = await sendContinue(sessionId, step.id, stepResult);
    return {handled: true, stepResult, nextResponse};
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
