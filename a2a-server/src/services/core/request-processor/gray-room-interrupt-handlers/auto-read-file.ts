import {executeReadFile} from '../../../../actions/handlers/file-operations.js';
import type {InterruptDirective, ServerInterruptTraceEvent} from '../../../transform/types.js';

/**
 * Handle auto_read_file interrupt
 * Automatically reads a file and adds its content to context
 */
export async function handleAutoReadFile(
    interrupt: InterruptDirective,
    ctx: Record<string, unknown>,
    promiseId: string,
    aiHubUrl: string,
    model: string,
    trace: ServerInterruptTraceEvent[]
): Promise<{ nextCtx: Record<string, unknown>; continueLoop: boolean }> {
    let nextCtx = { ...ctx };
    const fp = (interrupt.data?.filePath || interrupt.data?.path) as string;
    
    if (!fp) {
        trace.push({ kind: 'sidecar_llm', purpose: 'auto_read_file', ok: false, meta: 'missing_path' });
        return { nextCtx, continueLoop: false };
    }
    
    const out = await executeReadFile({ filePath: fp });
    if (out.success && out.content !== undefined) {
        const innerCtx = (nextCtx['context'] as Record<string, unknown>) ?? {};
        const prevFiles = (innerCtx['files'] as Record<string, string>) ?? {};
        nextCtx = { ...nextCtx, context: { ...innerCtx, files: { ...prevFiles, [fp]: out.content } } };
        trace.push({ kind: 'sidecar_llm', purpose: 'auto_read_file', ok: true, meta: fp });
    } else {
        trace.push({ kind: 'sidecar_llm', purpose: 'auto_read_file', ok: false, meta: 'read_failed' });
    }
    
    return { nextCtx, continueLoop: false };
}