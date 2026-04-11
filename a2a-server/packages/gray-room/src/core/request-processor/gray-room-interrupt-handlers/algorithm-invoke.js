import { BlackRoomOrchestrator } from '../../black-room/black-room-orchestrator.js';
import { mergeSlotIntoWorkbenchContext } from '../gray-room-utils.js';
import { BaseGrayRoomHandler } from './base-handler.js';
/**
 * Handle algorithm_invoke interrupt
 * Executes algorithms via Black Room orchestrator
 */
export class HandleAlgorithmInvoke extends BaseGrayRoomHandler {
    async handleInterrupt(interrupt, ctx, promiseId, aiHubUrl, model, trace) {
        let nextCtx = { ...ctx };
        const algorithmId = interrupt.algorithmId;
        if (!algorithmId) {
            trace.push({ kind: 'black_room_start', algorithmId: 'unknown', timestamp: new Date().toISOString() });
            trace.push({
                kind: 'black_room_complete',
                algorithmId: 'unknown',
                status: 'failed',
                durationMs: 0,
                error: 'Missing algorithmId'
            });
            return { nextCtx: ctx, continueLoop: false };
        }
        const startTime = Date.now();
        trace.push({ kind: 'black_room_start', algorithmId, timestamp: new Date().toISOString() });
        try {
            const blackRoom = new BlackRoomOrchestrator({
                aiHubUrl,
                timeoutMs: parseInt(process.env.A2A_BLACK_ROOM_TIMEOUT_MS || '30000', 10),
            });
            const algorithmContext = {
                sessionId: ctx.context?.session_id || 'unknown',
                workbench: ctx.context?.workbench,
                history: ctx.history || [],
                files: ctx.context?.files,
                ...ctx
            };
            const algorithmData = interrupt.data || {};
            const result = await blackRoom.executeAlgorithm(algorithmId, algorithmContext, algorithmData);
            trace.push({
                kind: 'black_room_complete',
                algorithmId,
                status: result.status,
                durationMs: Date.now() - startTime,
                tokenCount: result.metrics?.tokensOut,
                error: result.error
            });
            if (result.status === 'completed' && result.output) {
                const innerCtx = ctx.context ?? {};
                const wb = innerCtx.workbench ?? {};
                const slots = wb.slots ?? {};
                const blackRoomSlots = slots.blackRoomContext ?? {};
                nextCtx = mergeSlotIntoWorkbenchContext(ctx, 'blackRoomContext', {
                    ...blackRoomSlots,
                    [algorithmId]: result.output,
                });
            }
            return { nextCtx, continueLoop: false };
        }
        catch (error) {
            const errorMsg = String(error);
            trace.push({
                kind: 'black_room_complete',
                algorithmId,
                status: 'failed',
                durationMs: Date.now() - startTime,
                error: errorMsg
            });
            return { nextCtx: ctx, continueLoop: false };
        }
    }
}
// Export a function for backward compatibility
export async function handleAlgorithmInvoke(interrupt, ctx, promiseId, aiHubUrl, model, trace) {
    const handler = new HandleAlgorithmInvoke();
    return handler.handle(interrupt, ctx, promiseId, aiHubUrl, model, trace);
}
//# sourceMappingURL=algorithm-invoke.js.map