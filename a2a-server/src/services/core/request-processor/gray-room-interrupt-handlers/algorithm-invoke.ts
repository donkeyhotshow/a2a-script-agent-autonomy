import type {AlgorithmContext, AlgorithmData} from '../../black-room/types.js';
import type {InterruptDirective, ServerInterruptTraceEvent} from '../../../../transform/types.js';
import {BlackRoomOrchestrator} from '../../black-room/black-room-orchestrator.js';
import {mergeSlotIntoWorkbenchContext} from '../gray-room-utils.js';

/**
 * Handle algorithm_invoke interrupt
 * Executes algorithms via Black Room orchestrator
 */
export async function handleAlgorithmInvoke(
    interrupt: InterruptDirective,
    ctx: Record<string, unknown>,
    promiseId: string,
    aiHubUrl: string,
    model: string,
    trace: ServerInterruptTraceEvent[]
): Promise<{ nextCtx: Record<string, unknown>; continueLoop: boolean }> {
    let nextCtx: Record<string, unknown> = { ...ctx };
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
        return { nextCtx, continueLoop: false };
    }

    const startTime = Date.now();
    trace.push({ kind: 'black_room_start', algorithmId, timestamp: new Date().toISOString() });

    try {
        const blackRoom = new BlackRoomOrchestrator({
            aiHubUrl,
            timeoutMs: parseInt(process.env.A2A_BLACK_ROOM_TIMEOUT_MS || '30000', 10),
        });

        const algorithmContext: AlgorithmContext = {
            sessionId: (nextCtx['context'] as any)?.session_id || 'unknown',
            workbench: (nextCtx['context'] as any)?.workbench,
            history: nextCtx['history'] as any[],
            files: (nextCtx['context'] as any)?.files,
            ...nextCtx
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
            const innerCtx = (nextCtx['context'] as Record<string, unknown>) ?? {};
            const wb = (innerCtx['workbench'] as Record<string, unknown>) ?? {};
            const slots = (wb['slots'] as Record<string, unknown>) ?? {};
            const blackRoomSlots = (slots['blackRoomContext'] as Record<string, unknown>) ?? {};
            nextCtx = mergeSlotIntoWorkbenchContext(nextCtx, 'blackRoomContext', {
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
        return { nextCtx, continueLoop: false };
    }
}