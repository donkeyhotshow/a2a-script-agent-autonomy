/**
 * Invoke Service
 * Parses context and creates requests. Routes → services; protocol used here.
 * 
 * Supports new protocol format:
 * - execute.form.choices (first response)
 * - execute.script (step execution)
 * - result with action-key shape
 */

import {parseContextBlock} from '../../protocol/context-parser.js';
import type {ContextBlock, FileBlock, ResultCommand} from '../../types/index.js';
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
    code_blocks?: FileBlock[];
}

export interface InvokeResult {
    promiseId: string;
}

export async function invoke(clientId: string, input: InvokeInput): Promise<InvokeResult> {
    let context: ContextBlock;
    if (input.context) {
        context = parseContextBlock(input.context);
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

    const message = input.message ?? input.task;

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
