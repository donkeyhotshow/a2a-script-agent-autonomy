import type {InterruptDirective, ServerInterruptTraceEvent} from '../../../../transform/types.js';
import {mergeSlotIntoWorkbenchContext} from '../gray-room-utils.js';

/**
 * Handle clarify interrupt
 * Adds clarification data to workbench slots
 */
export async function handleClarify(
    interrupt: InterruptDirective,
    ctx: Record<string, unknown>,
    promiseId: string,
    aiHubUrl: string,
    model: string,
    trace: ServerInterruptTraceEvent[]
): Promise<{ nextCtx: Record<string, unknown>; continueLoop: boolean }> {
    const nextCtx = mergeSlotIntoWorkbenchContext({...ctx}, 'clarify', interrupt.data ?? {});
    trace.push({ kind: 'sidecar_llm', purpose: 'clarify', ok: true, meta: 'slots.clarify' });
    return { nextCtx, continueLoop: false };
}