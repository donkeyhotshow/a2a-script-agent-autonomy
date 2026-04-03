/**
 * LLM Orchestration - оркестрация LLM вызовов для dialog request processor
 *
 * Функции для вызова LLM через promise flow и обработки ответов
 */

import * as path from 'path';
import {logger} from '../../../utils/logger.js';
import {runPromptsTransform} from '../../../transform/index.js';
import {fetchLlmResponse, pollReadyThenFetch} from '../../../daemon/llm-hub-poll.js';
import {requestService} from '../request/request.service.js';
import {
    isManualLlmModeEnabled,
    storePendingManualLlm,
    buildManualLlmWaitingExecute,
    type PendingManualLlm,
} from '../request/manual-llm.service.js';

const DEFAULT_AI_HUB = 'http://localhost:11434';
const DEFAULT_MODEL = 'glm-4.7-flash';

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
    /** When manual LLM mode: execute payload for client (messages preview, submit URL). */
    manualExecute?: Record<string, unknown>;
    manualWait?: boolean;
}

/**
 * Создает временную директорию для трансформов
 */
export async function createDialogTransformOutputDir(): Promise<string> {
    const {mkdtemp} = await import('fs/promises');
    const {tmpdir} = await import('os');
    return mkdtemp(path.join(tmpdir(), 'a2a-dialog-transform-'));
}

/**
 * Выполняет request transforms и создает request.md
 */
export async function runRequestTransforms(
    promptsTransformsPath: string,
    schemaName: string,
    ctx: Record<string, unknown>,
    outputDir: string
): Promise<{success: boolean; files?: Record<string, string>; error?: string}> {
    // Most server processors persist a "flat" context object (execution/task/history at root).
    // Prompts/transforms expect an invoke-shaped payload with `context` + top-level `result`
    // so that `result.message` can be folded into history before prompt render.
    const invokeShape: Record<string, unknown> =
        ctx && typeof ctx === 'object' && !Array.isArray(ctx) && 'context' in ctx
            ? ctx
            : {
                  context: ctx,
                  task: (ctx['task'] as string | undefined) ?? (ctx['message'] as string | undefined),
                  message: ctx['message'],
                  result: (ctx['result'] as Record<string, unknown> | undefined) ?? {},
              };
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

    return {success: true, files};
}

/**
 * Подготавливает сообщения для LLM из трансформов
 */
export function prepareLlmMessages(files: Record<string, string>): Array<{role: string; content: string}> {
    const messages: Array<{role: string; content: string}> = [];
    const systemMd = files['system.md'];

    if (typeof systemMd === 'string' && systemMd.trim().length > 0) {
        messages.push({role: 'system', content: systemMd});
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
    promiseId: string
): Promise<{success: boolean; promiseId?: string; error?: string}> {
    const chatRes = await fetch(`${base}/api/chat?promise=1`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Server-Promise-Id': promiseId,
        },
        body: JSON.stringify({
            model,
            messages,
            stream: false,
        }),
    });

    if (chatRes.status !== 202) {
        const errText = await chatRes.text();
        logger.error('[DialogRequestProcessor] LLM promise init failed', {status: chatRes.status, error: errText});
        return {success: false, error: `LLM error: ${chatRes.status} ${errText.slice(0, 200)}`};
    }

    const initData = (await chatRes.json()) as {promiseId?: string; status?: string};
    const llmPromiseId = initData?.promiseId;

    if (!llmPromiseId) {
        return {success: false, error: 'No promiseId in LLM response'};
    }

    return {success: true, promiseId: llmPromiseId};
}

/**
 * Основная функция оркестрации LLM вызова
 * Выполняет: request transforms → [manual check] → LLM call → poll response
 *
 * When A2A_MANUAL_LLM_MODE=1: pauses after request transforms and stores
 * the prepared messages for operator to submit LLM response manually.
 */
export async function executeLlmCall(options: LlmCallOptions): Promise<LlmCallResult> {
    const {
        promptsTransformsPath,
        schemaName,
        ctx,
        promiseId,
        base = DEFAULT_AI_HUB,
        model = DEFAULT_MODEL
    } = options;

    const normalizedBase = base.replace(/\/$/, '');

    try {
        // 1. Request transforms → request.md
        const outputDir = await createDialogTransformOutputDir();
        const transformResult = await runRequestTransforms(
            promptsTransformsPath, schemaName, ctx, outputDir
        );

        if (!transformResult.success || !transformResult.files) {
            return {success: false, error: transformResult.error};
        }

        // 2. Prepare messages
        const messages = prepareLlmMessages(transformResult.files);

        // 3. MANUAL MODE CHECK: pause here if manual LLM mode enabled
        if (isManualLlmModeEnabled()) {
            logger.warn('[ManualLlm] MANUAL MODE ACTIVE — pausing for operator input (no live LLM call)', {
                promiseId,
                schemaName,
            });

            // Store pending manual LLM data
            const pending: PendingManualLlm = {
                promiseId,
                messages,
                schemaName,
                ctxSnapshot: JSON.parse(JSON.stringify(ctx)), // deep clone
                outputDir,
                createdAt: new Date(),
            };
            storePendingManualLlm(pending);

            // Build special execute that tells client we're waiting
            const manualExecute = buildManualLlmWaitingExecute(promiseId, messages);

            // Status + persistence: request-processor.service (outcome waiting_manual_llm)

            return {
                success: true,
                responseMd: '',
                llmPromiseId: `manual_${promiseId}`,
                manualWait: true,
                manualExecute,
            };
        }

        // 4. Call LLM via promise flow (normal mode)
        const initResult = await initLlmPromise(normalizedBase, model, messages, promiseId);
        if (!initResult.success) {
            return {success: false, error: initResult.error};
        }

        const llmPromiseId = initResult.promiseId!;

        // 5. Store promise ID
        await requestService.updateLlmPromiseId(promiseId, llmPromiseId);
        logger.info('[DialogRequestProcessor] Polling promise', {llmPromiseId});

        // 6. Poll for response
        const responseMd = await pollReadyThenFetch(normalizedBase, llmPromiseId);
        if (!responseMd) {
            return {success: false, error: 'LLM response fetch failed'};
        }

        return {success: true, responseMd, llmPromiseId};
    } catch (err) {
        logger.error('[DialogRequestProcessor] LLM call failed', {error: String(err)});
        return {
            success: false,
            error: err instanceof Error ? err.message : String(err)
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
        const normalizedBase = base.replace(/\/$/, '');
        const res = await fetch(`${normalizedBase}/promises/status`);

        if (!res.ok) return null;

        const data = (await res.json()) as {ready?: Array<{promiseId?: string}>};
        if (!(data.ready ?? []).some((p) => p.promiseId === llmPromiseId)) return null;

        const responseMd = await fetchLlmResponse(normalizedBase, llmPromiseId);
        return responseMd;
    } catch (err) {
        logger.error('LLM promise recovery failed', err);
        return null;
    }
}
