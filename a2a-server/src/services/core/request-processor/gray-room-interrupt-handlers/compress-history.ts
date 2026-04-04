import {resolveGrayRoomLlmModelFromContext} from '../llm-model-resolver.js';
import type {InterruptDirective, ServerInterruptTraceEvent} from '../../../transform/types.js';

/**
 * Handle compress_history interrupt
 * Compresses conversation history into 3-7 short entries
 */
export async function handleCompressHistory(
    interrupt: InterruptDirective,
    ctx: Record<string, unknown>,
    promiseId: string,
    aiHubUrl: string,
    model: string,
    trace: ServerInterruptTraceEvent[]
): Promise<{ nextCtx: Record<string, unknown>; continueLoop: boolean }> {
    let nextCtx = { ...ctx };
    const history = (nextCtx['history'] as any[]) || (nextCtx['context'] as any)?.history || [];
    
    if (!Array.isArray(history) || history.length === 0) {
        trace.push({ kind: 'sidecar_llm', purpose: 'compress_history', ok: true, meta: 'skipped_empty_history' });
        return { nextCtx, continueLoop: false };
    }
    
    const compressPrompt = [
        'Compress the following conversation history into 3–7 short entries (JSON array of {"role":"system"|"assistant"|"user","message":"..."}).',
        'Preserve enough detail to continue the task: user goal, constraints, unresolved steps, file paths touched, last assistant intent.',
        'Respond with ONLY the JSON array, no prose.',
        '',
        'History:',
        JSON.stringify(history, null, 2)
    ].join('\n');

    try {
        const sidecarModel = resolveGrayRoomLlmModelFromContext(nextCtx, model);
        const chatRes = await fetch(`${aiHubUrl}/api/chat?promise=1`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Server-Promise-Id': `${promiseId}-compress` },
            body: JSON.stringify({ model: sidecarModel, messages: [{ role: 'user', content: compressPrompt }], stream: false }),
        });
        
        if (chatRes.status === 202) {
            const initData = (await chatRes.json()) as { promiseId?: string };
            if (initData?.promiseId) {
                const compressed = await pollReadyThenFetch(aiHubUrl, initData.promiseId);
                if (compressed) {
                    const parsed = JSON.parse(compressed.trim());
                    if (Array.isArray(parsed)) {
                        const innerCtx = (nextCtx['context'] as Record<string, unknown>) ?? {};
                        nextCtx = { ...nextCtx, history: parsed, context: {...innerCtx, history: parsed} };
                        trace.push({ kind: 'sidecar_llm', purpose: 'compress_history', ok: true, meta: `from=${history.length} to=${parsed.length}` });
                    }
                }
            }
        }
    } catch (err) {
        console.warn('[GrayRoom:compress_history] Failed', { error: String(err) });
        trace.push({ kind: 'sidecar_llm', purpose: 'compress_history', ok: false, meta: 'error' });
    }
    
    return { nextCtx, continueLoop: false };
}

/**
 * Mock function for pollReadyThenFetch - in real implementation this would be imported
 */
async function pollReadyThenFetch(aiHubUrl: string, promiseId: string): Promise<string | null> {
    // This is a placeholder - the actual implementation would be imported from daemon/llm-hub-poll.js
    // For now, we'll return null to indicate this needs proper implementation
    return null;
}