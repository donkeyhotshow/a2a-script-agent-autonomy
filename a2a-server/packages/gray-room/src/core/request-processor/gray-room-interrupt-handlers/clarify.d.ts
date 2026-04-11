import type { InterruptDirective, ServerInterruptTraceEvent, GrayRoomContext } from '../../../transform/types';
import { BaseGrayRoomHandler } from './base-handler';
/**
 * Handle clarify interrupt
 * Adds clarification data to workbench slots
 */
export declare class HandleClarify extends BaseGrayRoomHandler {
    protected handleInterrupt(interrupt: InterruptDirective, ctx: GrayRoomContext, promiseId: string, aiHubUrl: string, model: string, trace: ServerInterruptTraceEvent[]): Promise<{
        nextCtx: GrayRoomContext;
        continueLoop: boolean;
    }>;
}
export declare function handleClarify(interrupt: InterruptDirective, ctx: Record<string, unknown>, promiseId: string, aiHubUrl: string, model: string, trace: ServerInterruptTraceEvent[]): Promise<{
    nextCtx: Record<string, unknown>;
    continueLoop: boolean;
}>;
//# sourceMappingURL=clarify.d.ts.map