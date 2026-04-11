/**
 * When the LLM re-emits the initial Agent Mode form (`step: request`) after prior assistant
 * turns, drivers (Task Monitor strict completion) treat `step=request` as "nudge with /next"
 * and loop. Replace with a neutral in-flight step + `execute.message`.
 */

import {logger} from "@a2a/server-utils/logger"';
import type {ProcessResult} from './request-processor.interfaces';
import type {RequestContextBlock} from '../../types/index';
import {isAgentSchemaName, lastAssistantMessageFromContext} from '../../../lib/agent-utils.ts';


function countAssistantTurns(history: unknown): number {
    if (!Array.isArray(history)) {
        return 0;
    }
    return history.filter(
        (row) =>
            row &&
            typeof row === 'object' &&
            !Array.isArray(row) &&
            (row as Record<string, unknown>)['role'] === 'assistant'
    ).length;
}

/**
 * @returns true if `result` was mutated
 */
export function normalizeAgentSpuriousRequestAfterPipeline(
    result: ProcessResult,
    schemaName: string
): boolean {
    if (!isAgentSchemaName(schemaName) || result.outcome === 'failed') {
        return false;
    }
    const ctx = result.context as Record<string, unknown> | undefined;
    if (!ctx || typeof ctx !== 'object') {
        return false;
    }
    const exec = ctx['execution'];
    if (!exec || typeof exec !== 'object' || Array.isArray(exec)) {
        return false;
    }
    const exRec = exec as Record<string, unknown>;
    if (exRec['step'] !== 'request') {
        return false;
    }
    const execute = result.execute as Record<string, unknown> | undefined;
    if (!execute || typeof execute !== 'object' || execute['form'] == null) {
        return false;
    }
    const form = execute['form'] as Record<string, unknown>;
    const title = form['title'];
    const desc = form['description'];
    const isInitialAgentForm =
        title === 'Agent Mode' ||
        desc === 'Enter your task for the agent' ||
        title === 'Ваш запит' ||
        (typeof desc === 'string' &&
            desc.includes('Монорепо a2a-script-agent') &&
            desc.includes('agent-coder-smart'));
    if (!isInitialAgentForm) {
        return false;
    }
    const assistantTurns = countAssistantTurns(ctx['history']);
    if (assistantTurns < 2) {
        return false;
    }
    const summary = lastAssistantMessageFromContext(ctx) || 'Continuing the current task.';
    ctx['execution'] = {...exRec, step: 'processing'};
    result.execute = {message: summary};
    result.context = ctx as unknown as RequestContextBlock;
    logger.warn(
        '[AgentSpuriousRequest] step=request + Agent Mode form after prior assistant turn(s); coerced to processing + execute.message',
        {assistantTurns, preview: summary.slice(0, 100)}
    );
    return true;
}
