import type { InterruptDirective, ServerInterruptTraceEvent, GrayRoomContext } from '../../../transform/types';
import { BaseGrayRoomHandler } from './base-handler';
/**
 * Handle compress_history interrupt
 * Compresses conversation history into 3-7 short entries
 */
export declare class HandleCompressHistory extends BaseGrayRoomHandler {
    protected handleInterrupt(interrupt: InterruptDirective, ctx: GrayRoomContext, promiseId: string, aiHubUrl: string, model: string, trace: ServerInterruptTraceEvent[]): Promise<{
        nextCtx: GrayRoomContext;
        continueLoop: boolean;
    }>;
}
export declare function handleCompressHistory(interrupt: InterruptDirective, ctx: Record<string, unknown>, promiseId: string, aiHubUrl: string, model: string, trace: ServerInterruptTraceEvent[]): Promise<{
    nextCtx: Record<string, unknown>;
    continueLoop: boolean;
}>;
//# sourceMappingURL=compress-history.d.ts.map