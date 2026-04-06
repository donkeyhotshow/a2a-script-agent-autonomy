import {resolveGrayRoomLlmModelFromContext} from '../llm-model-resolver.js';
import type {InterruptDirective, ServerInterruptTraceEvent} from '../../../../transform/types.js';
import {type GrayRoomContext} from '../gray-room-utils.js';

/**
 * Handle compress_history interrupt
 * Compresses conversation history into 3-7 short entries
 */
import { AgentSwing } from '../../agent-swing.js';
import { pollReadyThenFetch } from '../../../../daemon/llm-hub-poll.js';
import { logger } from '../../../../utils/logger.js';

export async function handleCompressHistory(
    interrupt: InterruptDirective,
    ctx: Record<string, unknown>,
    promiseId: string,
    aiHubUrl: string,
    model: string,
    trace: ServerInterruptTraceEvent[]
): Promise<{ nextCtx: Record<string, unknown>; continueLoop: boolean }> {
    let nextCtx: GrayRoomContext = { ...ctx };
    const history = nextCtx.history || nextCtx.context?.history || [];
    
    if (!Array.isArray(history) || history.length === 0) {
        trace.push({ kind: 'sidecar_llm', purpose: 'compress_history', ok: true, meta: 'skipped_empty_history' });
        return { nextCtx, continueLoop: false };
    }
    
    try {
        const swing = new AgentSwing();
        const result = await swing.compressWithLookahead(
            history, 
            nextCtx, 
            promiseId, 
            aiHubUrl, 
            model, 
            pollReadyThenFetch
        );
        
        const innerCtx = nextCtx.context ?? {};
        nextCtx = { ...nextCtx, history: result.best_history, context: {...innerCtx, history: result.best_history} };
        trace.push({
            kind: 'sidecar_llm',
            purpose: 'compress_history',
            ok: true,
            meta: `from=${history.length} to=${result.best_history.length} score=${result.score.toFixed(2)} options=${result.options_considered}`
        });
    } catch (err) {
        logger.warn('[GrayRoom:compress_history] AgentSwing Failed', { error: String(err) });
        trace.push({ kind: 'sidecar_llm', purpose: 'compress_history', ok: false, meta: 'error' });
    }
    
    return { nextCtx, continueLoop: false };
}