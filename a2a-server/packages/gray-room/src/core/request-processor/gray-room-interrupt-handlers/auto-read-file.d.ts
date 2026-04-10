import type { InterruptDirective, ServerInterruptTraceEvent, GrayRoomContext } from '../../../transform/types.js';
import { BaseGrayRoomHandler } from './base-handler.js';
/**
 * Handle auto_read_file interrupt
 * Automatically reads a file and adds its content to context
 */
export declare class HandleAutoReadFile extends BaseGrayRoomHandler {
    protected handleInterrupt(interrupt: InterruptDirective, ctx: GrayRoomContext, promiseId: string, aiHubUrl: string, model: string, trace: ServerInterruptTraceEvent[]): Promise<{
        nextCtx: GrayRoomContext;
        continueLoop: boolean;
    }>;
}
export declare function handleAutoReadFile(interrupt: InterruptDirective, ctx: Record<string, unknown>, promiseId: string, aiHubUrl: string, model: string, trace: ServerInterruptTraceEvent[]): Promise<{
    nextCtx: Record<string, unknown>;
    continueLoop: boolean;
}>;
//# sourceMappingURL=auto-read-file.d.ts.map