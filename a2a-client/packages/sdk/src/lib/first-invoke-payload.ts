/**
 * First Client API → A2A invoke body for a new user task (router step `new`).
 * Matches `simulations/agent/1/request.json` pattern: `context.execution` + `result.message`.
 */

import { sanitizeContextForServer } from '../../core/a2a-invoke-builders.mjs';

export const ROUTER_NEW_TASK_EXECUTION = { action: 'task' as const, step: 'new' as const };

export function buildInitialInvokeRequestBody(opts: {
    /** Client storage id — not sent to A2A; kept for SDK routing only. */
    sessionId: string;
    task: string;
    /** Merged into context then stripped of sessionId/projectId/projectRoot before upstream. */
    extraContext?: Record<string, unknown>;
}): {
    context: Record<string, unknown>;
    result: { message: string };
} {
    const rawContext: Record<string, unknown> = {
        execution: { ...ROUTER_NEW_TASK_EXECUTION },
        ...(opts.extraContext || {}),
    };
    return {
        context: sanitizeContextForServer(rawContext),
        result: { message: opts.task },
    };
}

