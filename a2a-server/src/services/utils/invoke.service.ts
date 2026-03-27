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
import {requestService} from '../core/request/request.service.js';
import {trackRequestStart} from './pipeline-observability.service.js';

export interface InvokeInput {
    context?: unknown;
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
    sync?: boolean;
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

    const message = input.message ?? input.task ?? (result && typeof result === 'object' ? (result as Record<string, unknown>).message as string : undefined);

    const {promiseId} = await requestService.create({
        clientId,
        context: ctx,
        message: message ?? null,
        codeBlocks: input.code_blocks ?? undefined,
    });
    
    // Track request start for observability
    trackRequestStart(promiseId);

    return {promiseId};
}
