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

export async function handleActionResponse(
  response: {
    action?: { currentStep?: { id?: string; code?: string } };
    context?: { session_id?: string };
  },
  options: HandleActionOptions = {} as HandleActionOptions
): Promise<HandleActionResult> {
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

  const context: Record<string, unknown> = {
    sessionId,
    stepId: step.id,
    projectPath: options.projectPath,
    previousOutput: options.previousOutput,
  };

  let stepResult: unknown;
  try {
    stepResult = await executeCode(code, context);
  } catch (err) {
    return { handled: true, error: err instanceof Error ? err.message : String(err) };
  }

  const nextResponse = await sendContinue(sessionId, step.id, stepResult);
  return { handled: true, stepResult, nextResponse };
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
    context: Record<string, unknown> & { projectPath?: string; sessionId?: string; stepId?: string; previousOutput?: unknown }
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
