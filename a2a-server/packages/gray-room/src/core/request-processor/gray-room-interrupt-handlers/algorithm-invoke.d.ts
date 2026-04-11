import type { InterruptDirective, ServerInterruptTraceEvent, GrayRoomContext } from '../../../transform/types';
import { BaseGrayRoomHandler } from './base-handler';
/**
 * Handle algorithm_invoke interrupt
 * Executes algorithms via Black Room orchestrator
 */
export declare class HandleAlgorithmInvoke extends BaseGrayRoomHandler {
    protected handleInterrupt(interrupt: InterruptDirective, ctx: GrayRoomContext, promiseId: string, aiHubUrl: string, model: string, trace: ServerInterruptTraceEvent[]): Promise<{
        nextCtx: GrayRoomContext;
        continueLoop: boolean;
    }>;
}
export declare function handleAlgorithmInvoke(interrupt: InterruptDirective, ctx: Record<string, unknown>, promiseId: string, aiHubUrl: string, model: string, trace: ServerInterruptTraceEvent[]): Promise<{
    nextCtx: Record<string, unknown>;
    continueLoop: boolean;
}>;
//# sourceMappingURL=algorithm-invoke.d.ts.map