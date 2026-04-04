import {resolveGrayRoomLlmModelFromContext} from '../llm-model-resolver.js';
import type {InterruptDirective, ServerInterruptTraceEvent} from '../../../transform/types.js';

/**
 * Handle thinking interrupt
 * Performs step-by-step reasoning about current task state
 */
export async function handleThinking(
    interrupt: InterruptDirective,
    ctx: Record<string, unknown>,
    promiseId: string,
    aiHubUrl: string,
    model: string,
    trace: ServerInterruptTraceEvent[]
): Promise<{ nextCtx: Record<string, unknown>; continueLoop: boolean }> {
    let nextCtx = { ...ctx };
    const thinkingPrompt = [
        'Think step by step about the current task state. Be concise.',
        'Return JSON: {"thinking": "your reasoning", "next_action": "what to do next"}',
        '',
        'Context:',
        JSON.stringify(nextCtx['context'] ?? {}, null, 2)
    ].join('\n');
    
    try {
        const sidecarModel = resolveGrayRoomLlmModelFromContext(nextCtx, model);
        const chatRes = await fetch(`${aiHubUrl}/api/chat?promise=1`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Server-Promise-Id': `${promiseId}-think` },
            body: JSON.stringify({ model: sidecarModel, messages: [{ role: 'user', content: thinkingPrompt }], stream: false }),
        });
        
        if (chatRes.status === 202) {
            const initData = (await chatRes.json()) as { promiseId?: string };
            if (initData?.promiseId) {
                const thinkMd = await pollReadyThenFetch(aiHubUrl, initData.promiseId);
                if (thinkMd) {
                    const parsed = JSON.parse(thinkMd.trim());
                    const innerCtx = nextCtx['context'] as Record<string, unknown>;
                    const wb = (innerCtx['workbench'] as Record<string, unknown>) ?? {};
                    const slots = (wb['slots'] as Record<string, unknown>) ?? {};
                    nextCtx = {
                        ...nextCtx,
                        context: { ...innerCtx, workbench: { ...wb, slots: { ...slots, thinking: parsed } } }
                    };
                    trace.push({ kind: 'sidecar_llm', purpose: 'thinking', ok: true, meta: 'slots.thinking' });
                }
            }
        }
    } catch (err) {
        console.warn('[GrayRoom:thinking] Failed', { error: String(err) });
        trace.push({ kind: 'sidecar_llm', purpose: 'thinking', ok: false, meta: 'error' });
    }
    
    return { nextCtx, continueLoop: true };
}

/**
 * Mock function for pollReadyThenFetch - in real implementation this would be imported
 */
async function pollReadyThenFetch(aiHubUrl: string, promiseId: string): Promise<string | null> {
    // This is a placeholder - the actual implementation would be imported from daemon/llm-hub-poll.js
    // For now, we'll return null to indicate this needs proper implementation
    return null;
}