import {ProgressiveRetriever} from '../../../rag/progressive-retriever.js';
import type {InterruptDirective, ServerInterruptTraceEvent, GrayRoomContext} from '../../../../transform/types.js';
import {BaseGrayRoomHandler} from './base-handler.js';

/**
 * Handle auto_rag_page interrupt
 * Merges RAG page content into context via ProgressiveRetriever
 */
export class HandleAutoRagPage extends BaseGrayRoomHandler {
  protected async handleInterrupt(
    interrupt: InterruptDirective,
    ctx: GrayRoomContext,
    promiseId: string,
    aiHubUrl: string,
    model: string,
    trace: ServerInterruptTraceEvent[]
  ): Promise<{ nextCtx: GrayRoomContext; continueLoop: boolean }> {
    const retriever = new ProgressiveRetriever();
    const {nextCtx: afterRag, trace: ragTrace} = await retriever.retrieve(ctx, interrupt.data);
    const innerCtx = (afterRag as GrayRoomContext).context ?? {};
    if (ragTrace) trace.push(ragTrace);
    return { 
      nextCtx: { ...afterRag, context: {...innerCtx, _interrupt_reason: interrupt.reason, ...(interrupt.data ?? {})} }, 
      continueLoop: true 
    };
  }
}

// Export a function for backward compatibility
export async function handleAutoRagPage(
  interrupt: InterruptDirective,
  ctx: Record<string, unknown>,
  promiseId: string,
  aiHubUrl: string,
  model: string,
  trace: ServerInterruptTraceEvent[]
): Promise<{ nextCtx: Record<string, unknown>; continueLoop: boolean }> {
  const handler = new HandleAutoRagPage();
  return handler.handle(interrupt, ctx, promiseId, aiHubUrl, model, trace);
}