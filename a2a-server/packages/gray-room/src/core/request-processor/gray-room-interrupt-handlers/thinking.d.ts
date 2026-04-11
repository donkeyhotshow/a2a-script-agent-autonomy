import type { InterruptDirective, ServerInterruptTraceEvent, GrayRoomContext } from '../../../transform/types';
import { BaseGrayRoomHandler } from './base-handler';
/**
 * Handle thinking interrupt
 * Performs step-by-step reasoning about current task state
 */
export declare class HandleThinking extends BaseGrayRoomHandler {
    protected handleInterrupt(interrupt: InterruptDirective, ctx: GrayRoomContext, promiseId: string, aiHubUrl: string, model: string, trace: ServerInterruptTraceEvent[]): Promise<{
        nextCtx: GrayRoomContext;
        continueLoop: boolean;
    }>;
}
export declare function handleThinking(interrupt: InterruptDirective, ctx: Record<string, unknown>, promiseId: string, aiHubUrl: string, model: string, trace: ServerInterruptTraceEvent[]): Promise<{
    nextCtx: Record<string, unknown>;
    continueLoop: boolean;
}>;
//# sourceMappingURL=thinking.d.ts.map