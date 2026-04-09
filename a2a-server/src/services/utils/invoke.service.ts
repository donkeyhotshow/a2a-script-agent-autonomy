/**
 * Invoke Service
 * Parses context and creates requests. Routes → services; protocol used here.
 *
 * Supports new protocol format:
 * - execute.form.choices (first response)
 * - execute.script (step execution)
 * - result with action-key shape
 *
 * ASYNC-only: POST /api/v1/invoke always returns promiseId; clients poll GET …/requests/:id/result.
 */

import type {FileBlock} from '../../types/index.js';
import {requestService} from '../core/request/request.service.js';
import {resolveExecution, resolveResultObject} from '../core/request-processor/normalization.js';
import {ACTION_TO_SCHEMA} from '../../config/router-static.js';
import {trackRequestStart} from './pipeline-observability.service.js';

/**
 * Router beat + `result.choice` → dialog|agent|task-decomposition: set `transformSchema` on the
 * invoke context so `resolveTransformSchema` succeeds after normalization. Routing still goes
 * through the action processor first (`exec.step === router` + pipeline choice → `handleRouterChoice`).
 */
function applyRouterTransformSchemaHint(ctx: Record<string, unknown>): void {
    const ex = resolveExecution(ctx);
    const res = resolveResultObject(ctx);
    const choice = typeof res?.choice === 'string' ? res.choice : undefined;
    if (
        ex?.['step'] === 'router' &&
        choice &&
        ACTION_TO_SCHEMA[choice]
    ) {
        ctx['transformSchema'] = ACTION_TO_SCHEMA[choice];
    }
}

export interface InvokeInput {
    context?: unknown;
    /** Overrides LLM model for this invoke (stored on context as `llmModel` for dialog / gray room). */
    llmModel?: string;
    task?: string;  // Top-level task field for action_proposal
    message?: string;
    action?: string;  // action type: task_request, approve_action, step_result, action_selection
    selectedAction?: { actionId: string };  // for approve_action / action_selection
    stepId?: string;  // for step_result
    stepResult?: unknown;  // result with action-key shape: { "script": {...}, "read-file": {...} }
    result?: Record<string, unknown>;  // action-key result: { choice: "..." } or { message: "..." }
    code_blocks?: FileBlock[];
}

export interface InvokeResult {
    promiseId?: string;
}

/** Client API / storage identifiers — not part of LLM or stateless invoke contract; strip so prompts never see them. */
function stripClientStorageIdsFromContext(ctx: Record<string, unknown>): void {
    // session_id is server-internal and must be ignored from client input.
    delete ctx['session_id'];
    // Protocol versioning is not part of the wire contract.
    delete ctx['version'];
    delete ctx['projectId'];
    delete ctx['projectRoot'];
    delete ctx['sessionId'];
    const nested = ctx['context'];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
        const n = nested as Record<string, unknown>;
        delete n['session_id'];
        delete n['version'];
        delete n['projectId'];
        delete n['projectRoot'];
        delete n['sessionId'];
    }
}

export async function invoke(clientId: string, input: InvokeInput): Promise<InvokeResult> {
    const ctx: Record<string, unknown> =
        input.context && typeof input.context === 'object' && !Array.isArray(input.context)
            ? {...(input.context as Record<string, unknown>)}
            : {};

    // Add task to context if provided (top-level field for action_proposal)
    if (input.task) {
        ctx['task'] = input.task;
    }

    // Add action fields to context
    if (input.action) {
        ctx['action'] = input.action;
    }
    if (input.selectedAction) {
        ctx['selectedAction'] = input.selectedAction;
    }
    if (input.stepId) {
        ctx['stepId'] = input.stepId;
    }
    if (input.stepResult !== undefined) {
        ctx['stepResult'] = input.stepResult;
    }

    // Add result from action-key submission (choice, message, etc.)
    // Support both context.result and top-level input.result (SDK sends result at top level)
    // FIX: input.result (new) should override input.context.result (old)
    const result = input.result ?? (input.context as Record<string, unknown>)?.result;
    if (result && typeof result === 'object') {
        ctx['result'] = result;
        // Also extract specific fields for processor compatibility
        if ((result as Record<string, unknown>).choice) {
            ctx['choice_id'] = (result as Record<string, unknown>).choice;
        }
        // Parse result.message: current user line. For dialog, keep context.task as the session task (first line).
        const msg = (result as Record<string, unknown>).message;
        if (msg && typeof msg === 'string') {
            ctx['message'] = msg;
            const exec = ctx['execution'] as {action?: string} | undefined;
            const existingTask = ctx['task'];
            const isDialog = exec?.action === 'dialog';
            if (!(isDialog && typeof existingTask === 'string' && existingTask.trim().length > 0)) {
                ctx['task'] = msg;
            }
        }
    }

    applyRouterTransformSchemaHint(ctx);

    stripClientStorageIdsFromContext(ctx);

    const topLlm =
        typeof input.llmModel === 'string' && input.llmModel.trim()
            ? input.llmModel.trim()
            : undefined;
    if (topLlm) {
        ctx['llmModel'] = topLlm;
    }

    const resultMessage =
        result && typeof result === 'object' && typeof (result as Record<string, unknown>).message === 'string'
            ? ((result as Record<string, unknown>).message as string)
            : undefined;
    const message = input.message ?? resultMessage ?? input.task;

    const {promiseId} = await requestService.create({
        clientId,
        context: ctx,
        message: message ?? undefined,
        codeBlocks: input.code_blocks ?? undefined,
    });
    
    // Track request start for observability
    trackRequestStart(promiseId);

    return {promiseId};
}
