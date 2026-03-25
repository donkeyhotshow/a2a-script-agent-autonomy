/**
 * First Client API → A2A invoke body for a new user task (router step `new`).
 * Matches `simulations/agent/1/request.json` pattern: `context.execution` + `result.message`.
 */

export const ROUTER_NEW_TASK_EXECUTION = { action: 'task' as const, step: 'new' as const };

export function buildInitialInvokeRequestBody(opts: {
    sessionId: string;
    task: string;
    /** Merged after execution + session_id (e.g. version). */
    extraContext?: Record<string, unknown>;
}): {
    context: Record<string, unknown>;
    result: { message: string };
} {
    return {
        context: {
            version: '2.0',
            session_id: opts.sessionId,
            execution: { ...ROUTER_NEW_TASK_EXECUTION },
            ...(opts.extraContext || {}),
        },
        result: { message: opts.task },
    };
}
