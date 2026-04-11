import type { InterruptDirective, ServerInterruptTraceEvent } from '../../../transform/types';
import type { GrayRoomContext } from '../gray-room-utils';
/**
 * Base class for gray room interrupt handlers to eliminate duplication
 */
export declare abstract class BaseGrayRoomHandler {
    /**
     * Handle the interrupt - to be implemented by subclasses
     */
    protected abstract handleInterrupt(interrupt: InterruptDirective, ctx: GrayRoomContext, promiseId: string, aiHubUrl: string, model: string, trace: ServerInterruptTraceEvent[]): Promise<{
        nextCtx: GrayRoomContext;
        continueLoop: boolean;
    }>;
    /**
     * Template method that handles the common logic
     */
    handle(interrupt: InterruptDirective, ctx: Record<string, unknown>, promiseId: string, aiHubUrl: string, model: string, trace: ServerInterruptTraceEvent[]): Promise<{
        nextCtx: Record<string, unknown>;
        continueLoop: boolean;
    }>;
}
//# sourceMappingURL=base-handler.d.ts.map