/**
 * Invoke Service
 * Parses context and creates requests. Routes → services; protocol used here.
 */

import {parseContextBlock} from '../protocol/context-parser.js';
import type {ContextBlock, FileBlock} from '../types/index.js';
import {requestService} from './request.service.js';

export interface InvokeInput {
    context?: unknown;
    task?: string;  // Top-level task field for action_proposal
    message?: string;
    action?: string;  // action type: task_request, approve_action, step_result
    selectedAction?: { actionId: string };  // for approve_action
    stepId?: string;  // for step_result
    stepResult?: unknown;  // for step_result
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
            version: '1.0',
            session_id: 'stateless',
        };
    }

    // Add task to context if provided (top-level field for action_proposal)
    if (input.task) {
        (context as Record<string, unknown>)['task'] = input.task;
    }

    // Add action fields to context
    if (input.action) {
        (context as Record<string, unknown>)['action'] = input.action;
    }
    if (input.selectedAction) {
        (context as Record<string, unknown>)['selectedAction'] = input.selectedAction;
    }
    if (input.stepId) {
        (context as Record<string, unknown>)['stepId'] = input.stepId;
    }
    if (input.stepResult !== undefined) {
        (context as Record<string, unknown>)['stepResult'] = input.stepResult;
    }

    const {promiseId} = await requestService.create({
        clientId,
        context: context as Record<string, unknown>,
        message: input.message ?? input.task ?? null,
        codeBlocks: input.code_blocks ?? undefined,
    });

    return {promiseId};
}
