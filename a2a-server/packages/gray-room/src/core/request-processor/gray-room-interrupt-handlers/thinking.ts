import {resolveGrayRoomLlmModelFromContext} from '../../../../../server/src/request-processor/llm-model-resolver.js';
import {
    extractLlmTextFromHubResponseBody,
    initAiHubChatPromise,
    pollReadyThenFetch,
} from '@a2a/server-daemon';
import {logger, tryParseJsonFromLlmText, resolveA2aTraceId} from '@a2a/server-utils';
import {mergeSlotIntoWorkbenchContext} from '../gray-room-utils.js';
import type {InterruptDirective, ServerInterruptTraceEvent, GrayRoomContext} from '@a2a/server-ai';
import {BaseGrayRoomHandler} from './base-handler.js';

/**
 * Handle thinking interrupt
 * Performs step-by-step reasoning about current task state
 */
export class HandleThinking extends BaseGrayRoomHandler {
  protected async handleInterrupt(
    interrupt: InterruptDirective,
    ctx: GrayRoomContext,
    promiseId: string,
    aiHubUrl: string,
    model: string,
    trace: ServerInterruptTraceEvent[]
  ): Promise<{ nextCtx: GrayRoomContext; continueLoop: boolean }> {
    let nextCtx: GrayRoomContext = { ...ctx };
    const thinkingPrompt = [
        'Think step by step about the current task state. Be concise.',
        'Return JSON: {"thinking": "your reasoning", "next_action": "what to do next"}',
        '',
        'Context:',
        JSON.stringify(nextCtx['context'] ?? {}, null, 2)
    ].join('\n');
    
    try {
        const sidecarModel = resolveGrayRoomLlmModelFromContext(nextCtx, model);
        const chatInit = await initAiHubChatPromise(
            aiHubUrl,
            `${promiseId}-think`,
            {
                model: sidecarModel,
                messages: [{ role: 'user', content: thinkingPrompt }],
                stream: false,
            },
            undefined,
            resolveA2aTraceId(nextCtx as Record<string, unknown>, promiseId),
        );
        if (chatInit.ok) {
            const thinkRaw =
                chatInit.inlineResponseBody ?? (await pollReadyThenFetch(aiHubUrl, chatInit.llmPromiseId));
            const thinkMd = thinkRaw ? extractLlmTextFromHubResponseBody(thinkRaw) : null;
            if (thinkMd) {
                const parsed = tryParseJsonFromLlmText(thinkMd);
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                    nextCtx = mergeSlotIntoWorkbenchContext(nextCtx, 'thinking', parsed);
                    trace.push({ kind: 'sidecar_llm', purpose: 'thinking', ok: true, meta: 'slots.thinking' });
                } else {
                    trace.push({ kind: 'sidecar_llm', purpose: 'thinking', ok: false, meta: 'unparseable_json' });
                }
            }
        }
    } catch (err) {
        logger.warn('[GrayRoom:thinking] Failed', { error: String(err) });
        trace.push({ kind: 'sidecar_llm', purpose: 'thinking', ok: false, meta: 'error' });
    }
    
    return { nextCtx, continueLoop: true };
  }
}

// Export a function for backward compatibility
export async function handleThinking(
  interrupt: InterruptDirective,
  ctx: Record<string, unknown>,
  promiseId: string,
  aiHubUrl: string,
  model: string,
  trace: ServerInterruptTraceEvent[]
): Promise<{ nextCtx: Record<string, unknown>; continueLoop: boolean }> {
  const handler = new HandleThinking();
  return handler.handle(interrupt, ctx, promiseId, aiHubUrl, model, trace);
}