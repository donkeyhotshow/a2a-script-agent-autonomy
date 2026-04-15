/**
 * LLM Orchestration - оркестрация LLM вызовов для dialog request processor
 *
 * Функции для вызова LLM через promise flow и обработки ответов
 */

import * as path from 'path';
import {logger} from "@a2a/server-utils/logger";
import {resolveAiHubBaseUrl} from '@a2a/server-utils';
import {mkdtempOsTmp} from '../../../lib/mkdtemp-os-tmp.js';
import {runPromptsTransform} from '../../../transform/src/index.js';
import {
    extractLlmTextFromHubResponseBody,
    initAiHubChatPromise,
    pollReadyThenFetch,
    resolveLlmPromiseRecovery,
} from '@a2a/server-utils';
import {requestService} from '@a2a/server-request';
import {resolveA2aTraceId} from '@a2a/server-utils';
import {resolveMainDialogLlmModelFromEnv} from './llm-model-resolver.js';
import {toInvokeShapeForPromptsTransform} from './normalization.js';

const DEFAULT_MODEL = resolveMainDialogLlmModelFromEnv();

export interface LlmCallOptions {
    promptsTransformsPath: string;
    schemaName: string;
    ctx: Record<string, unknown>;
    promiseId: string;
    base?: string;
    model?: string;
}

export interface LlmCallResult {
    success: boolean;
    responseMd?: string;
    llmPromiseId?: string;
    error?: string;
    /** Execute from request transform (e.g., initial form from dialog-request.json) */
    requestTransformExecute?: Record<string, unknown>;
    /** Context updates from request transform */
    requestTransformContext?: Record<string, unknown>;
}

/**
 * Создает временную директорию для трансформов
 */
export async function createDialogTransformOutputDir(): Promise<string> {
    return mkdtempOsTmp('a2a-dialog-transform-');
}

/**
 * Выполняет request transforms и создает request.md
 */
export async function runRequestTransforms(
    promptsTransformsPath: string,
    schemaName: string,
    ctx: Record<string, unknown>,
    outputDir: string
): Promise<{success: boolean; files?: Record<string, string>; execute?: Record<string, unknown>; context?: Record<string, unknown>; error?: string}> {
    const invokeShape = toInvokeShapeForPromptsTransform(ctx);
    const transformResult = await runPromptsTransform(
        promptsTransformsPath,
        schemaName,
        invokeShape,
        'request',
        {forceServerTransforms: true, outputDir}
    );

    if (!transformResult.success) {
        return {success: false, error: transformResult.error || 'Request transform failed'};
    }

    const files = (transformResult.files as Record<string, string>) || {};
    const requestMd = files['request.md'];

    if (!requestMd) {
        return {success: false, error: 'Request transform did not produce request.md'};
    }

    // Return execute and context from transform output (e.g., dialog-request.json sets initial form)
    const execute = (transformResult.output?.execute as Record<string, unknown>) ?? {};
    const context = (transformResult.output?.context as Record<string, unknown>) ?? {};

    return {success: true, files, execute, context};
}

/**
 * Подготавливает сообщения для LLM из `system.md` / `request.md`.
 * When `systemInstructionOverride` is non-empty, system content is
 * `{override}\n---\n{system.md}` (gray-room parity).
 */
export function prepareLlmMessages(
    files: Record<string, string>,
    systemInstructionOverride?: string
): Array<{role: string; content: string}> {
    const messages: Array<{role: string; content: string}> = [];
    const rawSystem = files['system.md'];
    const systemMdFromDisk = typeof rawSystem === 'string' ? rawSystem : '';
    const override =
        typeof systemInstructionOverride === 'string' && systemInstructionOverride.trim().length > 0
            ? systemInstructionOverride.trim()
            : '';
    const finalSystem = override ? `${override}\n---\n${systemMdFromDisk}` : systemMdFromDisk;
    if (finalSystem.trim().length > 0) {
        messages.push({role: 'system', content: finalSystem});
    }

    const requestMd = files['request.md'];
    if (requestMd) {
        messages.push({role: 'user', content: requestMd});
    }

    return messages;
}

/**
 * Инициализирует LLM promise и получает promiseId
 */
export async function initLlmPromise(
    base: string,
    model: string,
    messages: Array<{role: string; content: string}>,
    promiseId: string,
    a2aTraceId?: string
): Promise<{success: boolean; promiseId?: string; inlineResponseBody?: string; error?: string}> {
    const r = await initAiHubChatPromise(base, promiseId, {model, messages, stream: false}, undefined, a2aTraceId);
    if (r.ok) {
        return {success: true, promiseId: r.llmPromiseId, inlineResponseBody: r.inlineResponseBody};
    }
    if (r.reason === 'missing_llm_promise_id') {
        return {success: false, error: 'No promiseId in LLM response'};
    }
    logger.error('[DialogRequestProcessor] LLM promise init failed', {
        status: r.status,
        error: r.bodyText,
        promise_id: promiseId,
        trace_id: typeof a2aTraceId === 'string' ? a2aTraceId : promiseId,
    });
    return {success: false, error: `LLM error: ${r.status} ${r.bodyText.slice(0, 200)}`};
}

/**
 * Основная функция оркестрации LLM вызова
 * Выполняет: request transforms → LLM call → poll response
 */
export async function executeLlmCall(options: LlmCallOptions): Promise<LlmCallResult> {
    const {
        promptsTransformsPath,
        schemaName,
        ctx,
        promiseId,
        base,
        model = DEFAULT_MODEL
    } = options;

    const normalizedBase = resolveAiHubBaseUrl(base);
    const traceId = resolveA2aTraceId(ctx, promiseId);

    try {
        await requestService.patchRequestContext(promiseId, {requestPhase: 'llm_request_transform'});
        logger.info('[DialogRequestProcessor] llm.request_transform.start', {
            evt: 'llm.request_transform.start',
            trace_id: traceId,
            promise_id: promiseId,
            schema: schemaName,
            request_phase: 'llm_request_transform',
        });

        // 1. Request transforms → request.md
        const outputDir = await createDialogTransformOutputDir();
        const transformResult = await runRequestTransforms(
            promptsTransformsPath, schemaName, ctx, outputDir
        );

        // Store request transform results for fallback (used when LLM unavailable or transform failed)
        const requestTransformExecute = transformResult.execute;
        const requestTransformContext = transformResult.context;

        if (!transformResult.success || !transformResult.files) {
            await requestService.patchRequestContext(promiseId, {requestPhase: 'llm_error'});
            const te = transformResult.error;
            return {
                success: false,
                error: typeof te === 'string' ? te : te,
                requestTransformExecute,
                requestTransformContext,
            };
        }

        logger.info('[DialogRequestProcessor] llm.request_transform.end', {
            evt: 'llm.request_transform.end',
            trace_id: traceId,
            promise_id: promiseId,
            schema: schemaName,
            request_phase: 'llm_request_transform',
        });

        // 2. Prepare messages
        const messages = prepareLlmMessages(transformResult.files);
        await requestService.patchRequestContext(promiseId, {requestPhase: 'llm_hub_submit'});

        const messagesBytes = messages.reduce((n, m) => n + (typeof m.content === 'string' ? m.content.length : 0), 0);
        logger.info('[DialogRequestProcessor] llm.hub.submit', {
            evt: 'llm.hub.submit',
            trace_id: traceId,
            promise_id: promiseId,
            schema: schemaName,
            request_phase: 'llm_hub_submit',
            attrs: {model, messages_bytes: messagesBytes},
        });

        // 3. Call LLM via promise flow
        const initResult = await initLlmPromise(normalizedBase, model, messages, promiseId, traceId);
        if (!initResult.success) {
            await requestService.patchRequestContext(promiseId, {requestPhase: 'llm_error'});
            const ie = initResult.error;
            return {
                success: false,
                error: typeof ie === 'string' ? ie : ie,
                requestTransformExecute,
                requestTransformContext,
            };
        }

        const llmPromiseId = initResult.promiseId!;

        // 4. Store promise ID
        await requestService.updateLlmPromiseId(promiseId, llmPromiseId);
        logger.info('[DialogRequestProcessor] Polling promise', {
            llmPromiseId,
            trace_id: traceId,
            promise_id: promiseId,
        });

        // 5. Poll for response (or use hub inline body on disk-cache hit)
        const rawResponseMd =
            initResult.inlineResponseBody ??
            (await pollReadyThenFetch(normalizedBase, llmPromiseId, {
                a2aPromiseId: promiseId,
            }));
        if (!rawResponseMd?.trim()) {
            await requestService.patchRequestContext(promiseId, {requestPhase: 'llm_error'});
            // Return request transform execute as fallback (allows form display even without LLM)
            return {
                success: false,
                error: 'LLM response fetch failed',
                requestTransformExecute,
                requestTransformContext,
            };
        }
        // Disk-cache 200 returns full provider JSON; unwrap choices[0].message.content before response transforms.
        const responseMd = extractLlmTextFromHubResponseBody(rawResponseMd);
        if (!responseMd?.trim()) {
            await requestService.patchRequestContext(promiseId, {requestPhase: 'llm_error'});
            return {
                success: false,
                error: 'LLM response fetch failed',
                requestTransformExecute,
                requestTransformContext,
            };
        }

        await requestService.patchRequestContext(promiseId, {requestPhase: 'llm_response_ready'});
        logger.info('[DialogRequestProcessor] llm.hub.response_ready', {
            evt: 'llm.hub.response_ready',
            trace_id: traceId,
            promise_id: promiseId,
            llm_promise_id: llmPromiseId,
            schema: schemaName,
            request_phase: 'llm_response_ready',
        });
        return {success: true, responseMd, llmPromiseId, requestTransformExecute, requestTransformContext};
    } catch (err) {
        logger.error('[DialogRequestProcessor] LLM call failed', {
            error: String(err),
            trace_id: traceId,
            promise_id: promiseId,
        });
        await requestService.patchRequestContext(promiseId, {requestPhase: 'llm_error'});
        const raw = err instanceof Error ? err.message : String(err);
        return {
            success: false,
            error: raw,
        };
    }
}

/**
 * Восстанавливает LLM promise (для случаев после перезагрузки сервера)
 */
export async function recoverLlmPromise(
    base: string,
    llmPromiseId: string
): Promise<string | null> {
    try {
        const r = await resolveLlmPromiseRecovery(base, llmPromiseId);
        return r.kind === 'ready' ? r.responseMd : null;
    } catch (err) {
        logger.error('LLM promise recovery failed', err);
        return null;
    }
}
