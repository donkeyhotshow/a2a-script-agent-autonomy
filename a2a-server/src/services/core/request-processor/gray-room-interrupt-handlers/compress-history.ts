import {resolveGrayRoomLlmModelFromContext} from '../llm-model-resolver.js';
import type {InterruptDirective, ServerInterruptTraceEvent} from '../../../transform/types.js';

/**
 * Handle compress_history interrupt
 * Compresses conversation history into 3-7 short entries
 */
import { AgentSwing } from '../../agent-swing.js';
import { pollReadyThenFetch } from '../../../../daemon/llm-hub-poll.js';

export async function handleCompressHistory(
    interrupt: InterruptDirective,
    ctx: Record<string, unknown>,
    promiseId: string,
    aiHubUrl: string,
    model: string,
    trace: ServerInterruptTraceEvent[]
): Promise<{ nextCtx: Record<string, unknown>; continueLoop: boolean }> {
    let nextCtx = { ...ctx };
    const history = (nextCtx['history'] as any[]) || (nextCtx['context'] as any)?.history || [];
    
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
        
        const innerCtx = (nextCtx['context'] as Record<string, unknown>) ?? {};
        nextCtx = { ...nextCtx, history: result.best_history, context: {...innerCtx, history: result.best_history} };
        trace.push({ 
            kind: 'sidecar_llm', 
            purpose: 'compress_history_swing', 
            ok: true, 
            meta: `from=${history.length} to=${result.best_history.length} score=${result.score.toFixed(2)} options=${result.options_considered}` 
        });
    } catch (err) {
        console.warn('[GrayRoom:compress_history] AgentSwing Failed', { error: String(err) });
        trace.push({ kind: 'sidecar_llm', purpose: 'compress_history', ok: false, meta: 'error' });
    }
    
    return { nextCtx, continueLoop: false };
}

/**
 * Mock function for pollReadyThenFetch - in real implementation this would be imported
 */
async function pollReadyThenFetch(aiHubUrl: string, promiseId: string): Promise<string | null> {
    // This is a placeholder - the actual implementation would be imported from daemon/llm-hub-poll.js
    // For now, we'll return null to indicate this needs proper implementation
    return null;
}