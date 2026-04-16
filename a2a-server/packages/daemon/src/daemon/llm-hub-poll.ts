/**
 * Background polling: A2A Server → AI Hub (LLM proxy).
 * Core logic lives in `@a2a/server-utils`; this module adds optional A2A request context patches via `@a2a/server-request`.
 */

import { requestService } from "@a2a/server-request";
import {
    AI_HUB_JSON_HEADERS,
    extractLlmTextFromHubResponseBody,
    fetchLlmResponse,
    initAiHubChatPromise,
    parseHubCompatChatResponseBody,
    pollReadyThenFetch as pollReadyThenFetchCore,
    resolveLlmPromiseRecovery,
    type AiHubChatPromiseBody,
    type AiHubChatRequestBody,
    type InitAiHubChatPromiseResult,
    type LlmPromiseRecoveryKind,
    type PollReadyThenFetchOpts,
} from "@a2a/server-utils";

export {
    AI_HUB_JSON_HEADERS,
    parseHubCompatChatResponseBody,
    extractLlmTextFromHubResponseBody,
    fetchLlmResponse,
    resolveLlmPromiseRecovery,
    initAiHubChatPromise,
    type AiHubChatRequestBody,
    type AiHubChatPromiseBody,
    type InitAiHubChatPromiseResult,
    type LlmPromiseRecoveryKind,
};

export type LlmPollOpts = PollReadyThenFetchOpts & {
    /** A2A request `promiseId` — context gets `requestPhase: llm_waiting` on each poll tick. */
    a2aPromiseId?: string;
};

export async function pollReadyThenFetch(
    base: string,
    llmPromiseId: string,
    opts?: LlmPollOpts
): Promise<string | null> {
    const a2aPromiseId = opts?.a2aPromiseId;
    return pollReadyThenFetchCore(base, llmPromiseId, {
        responseMode: opts?.responseMode,
        onPollTick:
            typeof a2aPromiseId === 'string' && a2aPromiseId.trim() !== ''
                ? async () => {
                      await requestService.patchRequestContext(a2aPromiseId, {
                          requestPhase: 'llm_waiting',
                      });
                  }
                : undefined,
    });
}
