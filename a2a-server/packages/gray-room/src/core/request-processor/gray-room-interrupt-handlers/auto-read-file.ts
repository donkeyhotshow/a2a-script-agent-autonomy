import {executeReadFile} from '@a2a/server-actions';
import type {InterruptDirective, ServerInterruptTraceEvent, GrayRoomContext} from '@a2a/server-transform';
import {BaseGrayRoomHandler} from './base-handler.js';

/**
 * Handle auto_read_file interrupt
 * Automatically reads a file and adds its content to context
 */
export class HandleAutoReadFile extends BaseGrayRoomHandler {
  protected async handleInterrupt(
    interrupt: InterruptDirective,
    ctx: GrayRoomContext,
    promiseId: string,
    aiHubUrl: string,
    model: string,
    trace: ServerInterruptTraceEvent[]
  ): Promise<{ nextCtx: GrayRoomContext; continueLoop: boolean }> {
    const fp = (interrupt.data?.filePath || interrupt.data?.path) as string;

    if (!fp) {
      trace.push({ kind: 'sidecar_llm', purpose: 'auto_read_file', ok: false, meta: 'missing_path' });
      return { nextCtx: ctx, continueLoop: false };
    }

    const out = await executeReadFile({ filePath: fp });
    if (out.success && out.content !== undefined) {
      const innerCtx = ctx.context ?? {};
      const prevFiles = (innerCtx.files as Record<string, string>) ?? {};
      const updatedFiles = { ...prevFiles, [fp]: out.content };
      const updatedContext = { ...innerCtx, files: updatedFiles };
      const updatedNextCtx = { ...ctx, context: updatedContext };
      trace.push({ kind: 'sidecar_llm', purpose: 'auto_read_file', ok: true, meta: fp });
      return { nextCtx: updatedNextCtx, continueLoop: false };
    } else {
      trace.push({ kind: 'sidecar_llm', purpose: 'auto_read_file', ok: false, meta: 'read_failed' });
      return { nextCtx: ctx, continueLoop: false };
    }
  }
}

// Export a function for backward compatibility
export async function handleAutoReadFile(
  interrupt: InterruptDirective,
  ctx: Record<string, unknown>,
  promiseId: string,
  aiHubUrl: string,
  model: string,
  trace: ServerInterruptTraceEvent[]
): Promise<{ nextCtx: Record<string, unknown>; continueLoop: boolean }> {
  const handler = new HandleAutoReadFile();
  return handler.handle(interrupt, ctx, promiseId, aiHubUrl, model, trace);
}