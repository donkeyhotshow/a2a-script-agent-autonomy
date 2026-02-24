/**
 * Action response handling (plan action-upgrade-plan.md).
 * When response.action?.currentStep?.code exists, execute via script-runner and call continue().
 */

/**
 * Handle one action response: run currentStep.code and send continue.
 * @param {Object} response - Server response with context, action
 * @param {Object} options
 * @param {Function} options.executeCode - async (code, context) => stepResult
 * @param {Function} options.sendContinue - async (sessionId, stepId, stepResult) => nextResponse
 * @returns {Promise<{ handled: boolean, stepResult?: *, nextResponse?: Object, error?: string }>}
 */
async function handleActionResponse(response, options = {}) {
  const step = response?.action?.currentStep;
  const code = step?.code;
  const sessionId = response?.context?.session_id;

  if (!code || !sessionId || !step?.id) {
    return { handled: false };
  }

  const { executeCode, sendContinue } = options;
  if (typeof executeCode !== 'function' || typeof sendContinue !== 'function') {
    return { handled: false, error: 'executeCode and sendContinue required' };
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
    return { handled: true, error: err instanceof Error ? err.message : String(err) };
  }

  const nextResponse = await sendContinue(sessionId, step.id, stepResult);
  return { handled: true, stepResult, nextResponse };
}

/**
 * Create executeCode adapter for @a2a/script-runner executeScript.
 * Use when script-runner is available: createExecuteCode(require('@a2a/script-runner').executeScript)
 * @param {Function} executeScript - (code, input, context) => Promise<ScriptResult>
 * @returns {Function} executeCode(code, context) => Promise<stepResult>
 */
function createExecuteCode(executeScript) {
  return async function executeCode(code, context) {
    const result = await executeScript(code, context?.previousOutput ?? {}, {
      workingDir: context?.projectPath,
      sessionId: context?.sessionId,
      stepId: context?.stepId,
    });
    if (result && result.success === false && result.error) {
      throw new Error(result.error);
    }
    return result?.data ?? result;
  };
}

module.exports = {
  handleActionResponse,
  createExecuteCode,
};
