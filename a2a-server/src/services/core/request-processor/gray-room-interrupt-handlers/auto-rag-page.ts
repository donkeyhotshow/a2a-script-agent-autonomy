import {ProgressiveRetriever} from '../../../rag/progressive-retriever.js';
import type {InterruptDirective, ServerInterruptTraceEvent} from '../../../../transform/types.js';
import {type GrayRoomContext} from '../gray-room-utils.js';

/**
 * Handle auto_rag_page interrupt
 * Merges RAG page content into context via ProgressiveRetriever
 */
export async function handleAutoRagPage(
    interrupt: InterruptDirective,
    ctx: Record<string, unknown>,
    promiseId: string,
    aiHubUrl: string,
    model: string,
    trace: ServerInterruptTraceEvent[]
): Promise<{ nextCtx: Record<string, unknown>; continueLoop: boolean }> {
    const nextCtx: GrayRoomContext = { ...ctx };
    const retriever = new ProgressiveRetriever();
    const {nextCtx: afterRag, trace: ragTrace} = await retriever.retrieve(nextCtx, interrupt.data);
    const innerCtx = (afterRag as GrayRoomContext).context ?? {};
    if (ragTrace) trace.push(ragTrace);
    return { nextCtx: { ...afterRag, context: {...innerCtx, _interrupt_reason: interrupt.reason, ...(interrupt.data ?? {})} }, continueLoop: true };
}