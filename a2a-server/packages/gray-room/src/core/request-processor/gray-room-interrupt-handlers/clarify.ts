import type {InterruptDirective, ServerInterruptTraceEvent, GrayRoomContext} from '@a2a/server-ai';
import {mergeSlotIntoWorkbenchContext} from '../gray-room-utils.js';
import {BaseGrayRoomHandler} from './base-handler.js';

/**
 * Handle clarify interrupt
 * Adds clarification data to workbench slots
 */
export class HandleClarify extends BaseGrayRoomHandler {
  protected async handleInterrupt(
    interrupt: InterruptDirective,
    ctx: GrayRoomContext,
    promiseId: string,
    aiHubUrl: string,
    model: string,
    trace: ServerInterruptTraceEvent[]
  ): Promise<{ nextCtx: GrayRoomContext; continueLoop: boolean }> {
    const nextCtx = mergeSlotIntoWorkbenchContext(ctx, 'clarify', interrupt.data ?? {});
    trace.push({ kind: 'sidecar_llm', purpose: 'clarify', ok: true, meta: 'slots.clarify' });
    return { nextCtx, continueLoop: false };
  }
}

// Export a function for backward compatibility
export async function handleClarify(
  interrupt: InterruptDirective,
  ctx: Record<string, unknown>,
  promiseId: string,
  aiHubUrl: string,
  model: string,
  trace: ServerInterruptTraceEvent[]
): Promise<{ nextCtx: Record<string, unknown>; continueLoop: boolean }> {
  const handler = new HandleClarify();
  return handler.handle(interrupt, ctx, promiseId, aiHubUrl, model, trace);
}