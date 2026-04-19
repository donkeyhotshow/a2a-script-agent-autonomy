/**
 * Response Path - обработка путей ответа для dialog request processor
 *
 * Функции для восстановления stuck dialog requests и управления путями ответа
 */

import {logger, resolveAiHubBaseUrl, resolveLlmPromiseRecovery} from '@a2a/server-utils';
import {getPromptsTransformsPath} from '@a2a/server-ai';
import {GrayRoomOrchestrator} from '../../../gray-room/src/core/request-processor/gray-room-orchestrator.js';
import {readGrayRoomInterruptBudget, shouldUseGrayRoom} from '../../../gray-room/src/core/request-processor/gray-room-trigger.js';
import {resolveTransformSchema, extractSchemaName} from './normalization.js';
import type {ProcessResult} from './request-processor.interfaces.js';

/**
 * Тип результата для response path операций (legacy — см. RecoverDialogOutcome)
 */
export interface ResponsePathResult {
    success: boolean;
    error?: string;
}

/** Outcome of trying to finish dialog work for a stored hub `llmPromiseId`. */
export type RecoverDialogOutcome =
    | {tag: 'done'; result: ProcessResult}
    | {tag: 'pending'}
    | {tag: 'resubmit'; reason: string}
    | {tag: 'failed'; error: string};

/**
 * Восстанавливает stuck dialog request, который имеет llmPromiseId
 * (например, после перезагрузки сервера во время polling).
 * `resubmit` — запись на хабе потеряна / ошибка; вызывающий очищает `llmPromiseId` и делает новый LLM вызов.
 */
export async function recoverDialogFromLlmPromise(
    promiseId: string,
    ctx: Record<string, unknown>,
    llmPromiseId: string
): Promise<RecoverDialogOutcome> {
    const base = resolveAiHubBaseUrl();

    try {
        const hub = await resolveLlmPromiseRecovery(base, llmPromiseId);
        if (hub.kind === 'pending') {
            return {tag: 'pending'};
        }
        if (hub.kind === 'resubmit') {
            logger.info('[ResponsePath] Hub LLM promise unusable — recommend resubmit', {
                llmPromiseId,
                reason: hub.reason,
            });
            return {tag: 'resubmit', reason: hub.reason};
        }
        if (hub.kind === 'unavailable') {
            logger.warn('[ResponsePath] Hub LLM promise check failed', {llmPromiseId, reason: hub.reason});
            return {tag: 'failed', error: hub.reason};
        }

        const responseMd = hub.responseMd;

        const schema = resolveTransformSchema(ctx);
        if (!schema) {
            logger.warn('[ResponsePath] No transformSchema in context');
            return {tag: 'failed', error: 'No transformSchema in context'};
        }

        const schemaName = extractSchemaName(schema);

        const promptsPath = getPromptsTransformsPath();
        const orchestrator = new GrayRoomOrchestrator({
            promptsTransformsPath: promptsPath,
            maxInterruptTurns: readGrayRoomInterruptBudget(),
        });

        const result = await orchestrator.runLoop(
            ctx,
            schemaName,
            responseMd,
            promiseId,
            true, // recovery mode
            shouldUseGrayRoom(ctx).shouldTrigger
        );

        return {tag: 'done', result};
    } catch (err) {
        logger.error('[ResponsePath] Recovery function failed', err);
        return {tag: 'failed', error: err instanceof Error ? err.message : String(err)};
    }
}

/**
 * Проверяет, возможно ли восстановление для данного контекста
 */
export function canRecoverFromLlmPromise(ctx: Record<string, unknown>): boolean {
    const llmPromiseId = ctx['llmPromiseId'] as string | undefined;
    const hasSchema = resolveTransformSchema(ctx) !== null;
    return !!llmPromiseId && hasSchema;
}

/**
 * Получает llmPromiseId из контекста если доступно
 */
export function getLlmPromiseId(ctx: Record<string, unknown>): string | undefined {
    return ctx['llmPromiseId'] as string | undefined;
}
