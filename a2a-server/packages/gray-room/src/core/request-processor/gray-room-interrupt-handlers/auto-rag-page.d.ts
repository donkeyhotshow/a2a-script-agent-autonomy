import type { InterruptDirective, ServerInterruptTraceEvent, GrayRoomContext } from '../../../transform/types.js';
import { BaseGrayRoomHandler } from './base-handler.js';
/**
 * Handle auto_rag_page interrupt
 * Merges RAG page content into context via ProgressiveRetriever
 */
export declare class HandleAutoRagPage extends BaseGrayRoomHandler {
    protected handleInterrupt(interrupt: InterruptDirective, ctx: GrayRoomContext, promiseId: string, aiHubUrl: string, model: string, trace: ServerInterruptTraceEvent[]): Promise<{
        nextCtx: GrayRoomContext;
        continueLoop: boolean;
    }>;
}
export declare function handleAutoRagPage(interrupt: InterruptDirective, ctx: Record<string, unknown>, promiseId: string, aiHubUrl: string, model: string, trace: ServerInterruptTraceEvent[]): Promise<{
    nextCtx: Record<string, unknown>;
    continueLoop: boolean;
}>;
//# sourceMappingURL=auto-rag-page.d.ts.map