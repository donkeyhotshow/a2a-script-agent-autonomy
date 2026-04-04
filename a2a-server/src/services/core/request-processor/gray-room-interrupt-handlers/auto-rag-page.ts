import {mergeServerRagPageIntoContext} from '../../../rag/auto-rag-page-server.js';
import type {InterruptDirective, ServerInterruptTraceEvent} from '../../../transform/types.js';

/**
 * Handle auto_rag_page interrupt
 * Merges RAG page content into context
 */
export async function handleAutoRagPage(
    interrupt: InterruptDirective,
    ctx: Record<string, unknown>,
    promiseId: string,
    aiHubUrl: string,
    model: string,
    trace: ServerInterruptTraceEvent[]
): Promise<{ nextCtx: Record<string, unknown>; continueLoop: boolean }> {
    const nextCtx = { ...ctx };
    const {nextCtx: afterRag, trace: ragTrace} = await mergeServerRagPageIntoContext(nextCtx, interrupt.data);
    nextCtx = afterRag;
    if (ragTrace) trace.push(ragTrace);
    const innerCtx = (nextCtx['context'] as Record<string, unknown>) ?? {};
    nextCtx = { ...nextCtx, context: {...innerCtx, _interrupt_reason: interrupt.reason, ...(interrupt.data ?? {})} };
    return { nextCtx, continueLoop: true };
}