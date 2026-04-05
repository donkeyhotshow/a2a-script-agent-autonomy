/**
 * Invoke Service
 * Parses context and creates requests. Routes → services; protocol used here.
 *
 * Supports new protocol format:
 * - execute.form.choices (first response)
 * - execute.script (step execution)
 * - result with action-key shape
 *
 * SYNC/ASYNC Handling:
 * - Simple tasks (no LLM required) are processed synchronously, returning execute immediately
 * - Complex tasks (LLM required) return promiseId for async processing
 */

import {parseContextBlock} from '../../protocol/context-parser.js';
import type {ContextBlock, FileBlock} from '../../types/index.js';
import {CURRENT_PROTOCOL_VERSION} from '../../protocol/versioning/protocol-versions.js';
import {
    requestService,
    type RequestResult,
    humanizeUpstreamErrorMessage,
} from '../core/request/request.service.js';
import {processRequestByPromiseId} from '../core/request-processor/request-processor.service.js';
import {resolveExecution, resolveResultObject} from '../core/request-processor/normalization.js';
import {ACTION_TO_SCHEMA} from '../../config/router-static.js';
import {trackRequestStart} from './pipeline-observability.service.js';
import {randomUUID} from 'node:crypto';

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
    sync?: boolean;  // force synchronous processing for testing/simulations
}

export interface InvokeResult {
    promiseId?: string;
    execute?: Record<string, unknown>;
    context?: Record<string, unknown>;
    message?: string;
    sync?: boolean;
}

async function waitTerminalRequest(promiseId: string, maxMs: number): Promise<RequestResult | null> {
    const deadline = Date.now() + maxMs;
    while (Date.now() < deadline) {
        const row = await requestService.getResult(promiseId);
        // Storage may not be visible for a tick after create — retry instead of aborting sync chain.
        if (!row) {
            await new Promise((r) => setTimeout(r, 30));
            continue;
        }
        if (row.status === 'completed' || row.status === 'failed') {
            return row;
        }
        if (row.status === 'pending') {
            await processRequestByPromiseId(promiseId);
        } else {
            await new Promise((r) => setTimeout(r, 30));
        }
    }
    return null;
}

/**
 * Sanitize context for client response - remove internal/server-only fields
 */
function sanitizeClientContext(ctx: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
    if (!ctx || typeof ctx !== 'object' || Array.isArray(ctx)) {
        return ctx;
    }

    // Fields to remove from client response (internal/server-only)
    const internalFields = new Set([
        'session_id',      // Server-side session ID
        'result',          // Intermediate processing state
        'choice_id',       // Duplicate of execution.action
        'transformSchema', // Internal routing field
        'message',         // Duplicate of task
        'llmPromiseId',    // Internal LLM tracking
        'hubLlmResubmitCount', // Internal hub resubmit guard
        'llmModel',        // Internal LLM config
        'ai_action',       // Internal flag
        'previousChoice',  // Internal routing
        'operationHistory', // Internal debug
        'form_submission', // Internal form state
        'form_data',       // Internal form state
        'form_id',         // Internal form state
        'selected_choice', // Internal form state
    ]);

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(ctx)) {
        if (internalFields.has(key)) {
            continue;
        }

        // Clean up history - remove system messages that are internal
        if (key === 'history' && Array.isArray(value)) {
            sanitized[key] = value.filter((entry: unknown) => {
                if (typeof entry !== 'object' || entry === null) return true;
                const role = (entry as Record<string, unknown>)?.role;
                // Keep only user and assistant messages, filter system/debug
                return role === 'user' || role === 'assistant';
            });
            continue;
        }

        sanitized[key] = value;
    }

    return sanitized;
}

function syncFailureUserMessage(terminal: RequestResult): string | undefined {
    const pr = terminal.result as Record<string, unknown> | undefined;
    if (typeof pr?.error === 'string') {
        return humanizeUpstreamErrorMessage(pr.error);
    }
    const te = terminal.error as Record<string, unknown> | null | undefined;
    if (te && typeof te.message === 'string') {
        return humanizeUpstreamErrorMessage(te.message);
    }
    return undefined;
}

async function runSyncInvokeChain(rootPromiseId: string): Promise<InvokeResult> {
    let current = rootPromiseId;
    const hopMax = 16;
    const waitMs = 120_000;

    for (let hop = 0; hop < hopMax; hop++) {
        const terminal = await waitTerminalRequest(current, waitMs);
        if (!terminal) {
            return {promiseId: rootPromiseId};
        }

        const pr = terminal.result as Record<string, unknown> | undefined;

        if (terminal.status === 'failed') {
            // Failed outcomes should NOT include execute - only outcome, error, context
            return {
                sync: true,
                outcome: 'failed',
                error: terminal.error || 'Request processing failed',
                context: sanitizeClientContext(pr?.context as Record<string, unknown>),
            };
        }

        const follow =
            pr && typeof pr['followUpRequestId'] === 'string'
                ? (pr['followUpRequestId'] as string)
                : '';
        if (follow) {
            current = follow;
            continue;
        }

        const ex = pr?.execute as Record<string, unknown> | undefined;
        // Server NEVER returns execute.wait — client detects async (no sync flag)
        // and renders waiting UI based on promise status polling.
        return {
            sync: true,
            execute: ex && typeof ex === 'object' ? ex : {},
            context: sanitizeClientContext(pr?.context as Record<string, unknown>),
        };
    }

    return {promiseId: rootPromiseId};
}

function ensureContextSessionId(ctx: Record<string, unknown>): string {
    const current = typeof ctx['session_id'] === 'string' ? ctx['session_id'].trim() : '';
    if (current && current.toLowerCase() !== 'stateless') {
        ctx['session_id'] = current;
        return current;
    }
    const generated = `srv_sess_${randomUUID()}`;
    ctx['session_id'] = generated;
    return generated;
}

/** Client API / storage identifiers — not part of LLM or stateless invoke contract; strip so prompts never see them. */
function stripClientStorageIdsFromContext(ctx: Record<string, unknown>): void {
    delete ctx['projectId'];
    delete ctx['projectRoot'];
    delete ctx['sessionId'];
    const nested = ctx['context'];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
        const n = nested as Record<string, unknown>;
        delete n['projectId'];
        delete n['projectRoot'];
        delete n['sessionId'];
    }
}

export async function invoke(clientId: string, input: InvokeInput): Promise<InvokeResult> {
    let context: ContextBlock;
    if (input.context) {
        // `server-invoke-request.schema.json` does not require `context.session_id` from clients/tests,
        // but our internal `parseContextBlock` requires it. Default to stateless when missing.
        const raw = input.context as unknown;
        if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
            const r = raw as Record<string, unknown>;
            if (typeof r['session_id'] !== 'string' || r['session_id'].trim().length === 0) {
                context = parseContextBlock({...r, session_id: 'stateless'});
            } else {
                context = parseContextBlock(r);
            }
        } else {
            context = parseContextBlock(input.context);
        }
    } else {
        context = {
            version: CURRENT_PROTOCOL_VERSION,
            session_id: 'stateless',
        };
    }

    // Используем промежуточный объект для избежания ошибок типизации
    const ctx: Record<string, unknown> = context as unknown as Record<string, unknown>;

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
        // Parse task from result.message for action processor (Client API sends result.message)
        const msg = (result as Record<string, unknown>).message;
        if (msg && typeof msg === 'string') {
            ctx['message'] = msg;
            ctx['task'] = msg;
        }
    }

    applyRouterTransformSchemaHint(ctx);

    ensureContextSessionId(ctx);
    stripClientStorageIdsFromContext(ctx);

    const topLlm =
        typeof input.llmModel === 'string' && input.llmModel.trim()
            ? input.llmModel.trim()
            : undefined;
    if (topLlm) {
        ctx['llmModel'] = topLlm;
    }

    const message = input.message ?? input.task ?? (result && typeof result === 'object' ? (result as Record<string, unknown>).message as string : undefined);

    const {promiseId} = await requestService.create({
        clientId,
        context: ctx,
        message: message ?? undefined,
        codeBlocks: input.code_blocks ?? undefined,
    });
    
    // Track request start for observability
    trackRequestStart(promiseId);

    const explicitSync = input.sync === true;
    const explicitAsync = input.sync === false;
    const envDefaultSync =
        process.env.DEFAULT_SYNC_MODE === '1' || process.env.DEFAULT_SYNC_MODE === 'true';
    const useSync = explicitSync || (envDefaultSync && !explicitAsync);

    if (useSync) {
        return runSyncInvokeChain(promiseId);
    }

    return {promiseId};
}
