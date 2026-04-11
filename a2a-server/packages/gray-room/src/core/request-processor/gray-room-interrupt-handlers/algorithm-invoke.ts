import type {AlgorithmContext, AlgorithmData} from '../../black-room/types';
import type {InterruptDirective, ServerInterruptTraceEvent, GrayRoomContext} from '../../../transform/types';
import {BlackRoomOrchestrator} from '../../black-room/black-room-orchestrator';
import {mergeSlotIntoWorkbenchContext} from '../gray-room-utils';
import {BaseGrayRoomHandler} from './base-handler';

/**
 * Handle algorithm_invoke interrupt
 * Executes algorithms via Black Room orchestrator
 */
export class HandleAlgorithmInvoke extends BaseGrayRoomHandler {
  protected async handleInterrupt(
    interrupt: InterruptDirective,
    ctx: GrayRoomContext,
    promiseId: string,
    aiHubUrl: string,
    model: string,
    trace: ServerInterruptTraceEvent[]
  ): Promise<{ nextCtx: GrayRoomContext; continueLoop: boolean }> {
    let nextCtx: GrayRoomContext = { ...ctx };
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

        const algorithmContext: AlgorithmContext = {
            sessionId: (ctx.context?.session_id as string) || 'unknown',
            workbench: ctx.context?.workbench,
            history: ctx.history || [],
            files: ctx.context?.files,
            ...ctx
        };

        const algorithmData: AlgorithmData = interrupt.data || {};

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
            const wb = (innerCtx.workbench as Record<string, unknown>) ?? {};
            const slots = (wb.slots as Record<string, unknown>) ?? {};
            const blackRoomSlots = (slots.blackRoomContext as Record<string, unknown>) ?? {};
            nextCtx = mergeSlotIntoWorkbenchContext(ctx, 'blackRoomContext', {
                ...blackRoomSlots,
                [algorithmId]: result.output,
            });
        }

        return { nextCtx, continueLoop: false };
    } catch (error) {
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
export async function handleAlgorithmInvoke(
  interrupt: InterruptDirective,
  ctx: Record<string, unknown>,
  promiseId: string,
  aiHubUrl: string,
  model: string,
  trace: ServerInterruptTraceEvent[]
): Promise<{ nextCtx: Record<string, unknown>; continueLoop: boolean }> {
  const handler = new HandleAlgorithmInvoke();
  return handler.handle(interrupt, ctx, promiseId, aiHubUrl, model, trace);
}