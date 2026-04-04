import type {InterruptDirective, ServerInterruptTraceEvent} from '../../../transform/types.js';

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
    const nextCtx = { ...ctx };
    const innerCtx = (nextCtx['context'] as Record<string, unknown>) ?? {};
    const wb = (innerCtx['workbench'] as Record<string, unknown>) ?? {};
    const slots = (wb['slots'] as Record<string, unknown>) ?? {};
    nextCtx = {
        ...nextCtx,
        context: { ...innerCtx, workbench: { ...wb, slots: { ...slots, clarify: interrupt.data ?? {} } } }
    };
    trace.push({ kind: 'sidecar_llm', purpose: 'clarify', ok: true, meta: 'slots.clarify' });
    return { nextCtx, continueLoop: false };
}