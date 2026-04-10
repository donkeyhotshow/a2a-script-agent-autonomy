import { ProgressiveRetriever } from '../../rag/progressive-retriever.js';
import { BaseGrayRoomHandler } from './base-handler.js';
/**
 * Handle auto_rag_page interrupt
 * Merges RAG page content into context via ProgressiveRetriever
 */
export class HandleAutoRagPage extends BaseGrayRoomHandler {
    async handleInterrupt(interrupt, ctx, promiseId, aiHubUrl, model, trace) {
        const retriever = new ProgressiveRetriever();
        const { nextCtx: afterRag, trace: ragTrace } = await retriever.retrieve(ctx, interrupt.data);
        const innerCtx = afterRag.context ?? {};
        if (ragTrace)
            trace.push(ragTrace);
        return {
            nextCtx: { ...afterRag, context: { ...innerCtx, _interrupt_reason: interrupt.reason, ...(interrupt.data ?? {}) } },
            continueLoop: true
        };
    }
}
// Export a function for backward compatibility
export async function handleAutoRagPage(interrupt, ctx, promiseId, aiHubUrl, model, trace) {
    const handler = new HandleAutoRagPage();
    return handler.handle(interrupt, ctx, promiseId, aiHubUrl, model, trace);
}
//# sourceMappingURL=auto-rag-page.js.map