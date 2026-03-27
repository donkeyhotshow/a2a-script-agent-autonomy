/**
 * Response Path - обработка путей ответа для dialog request processor
 *
 * Функции для восстановления stuck dialog requests и управления путями ответа
 */

import {logger} from '../../../utils/logger.js';
import {getPromptsTransformsPath} from '../../../transform/index.js';
import {GrayRoomOrchestrator} from './gray-room-orchestrator.js';
import {resolveTransformSchema, extractSchemaName} from './normalization.js';
import {recoverLlmPromise} from './llm-orchestration.js';

const DEFAULT_AI_HUB = 'http://localhost:11434';

/**
 * Тип результата для response path операций
 */
export interface ResponsePathResult {
    success: boolean;
    error?: string;
}

/**
 * Восстанавливает stuck dialog request, который имеет llmPromiseId
 * (например, после перезагрузки сервера во время polling)
 */
export async function recoverDialogFromLlmPromise(
    promiseId: string,
    ctx: Record<string, unknown>,
    llmPromiseId: string
): Promise<ResponsePathResult | null> {
    const base = (process.env.AI_HUB_URL || DEFAULT_AI_HUB).replace(/\/$/, '');

    try {
        // 1. Проверяем статус promise
        const responseMd = await recoverLlmPromise(base, llmPromiseId);
        if (!responseMd) {
            logger.warn('[ResponsePath] LLM promise not ready or failed', {llmPromiseId});
            return null;
        }

        // 2. Извлекаем схему из контекста
        const schema = resolveTransformSchema(ctx);
        if (!schema) {
            logger.warn('[ResponsePath] No transformSchema in context');
            return null;
        }

        const schemaName = extractSchemaName(schema);

        // 3. Запускаем gray room loop
        const promptsPath = getPromptsTransformsPath();
        const orchestrator = new GrayRoomOrchestrator({promptsTransformsPath: promptsPath});

        const result = await orchestrator.runLoop(
            ctx,
            schemaName,
            responseMd,
            promiseId,
            true // recovery mode
        );

        return {success: true, ...result};
    } catch (err) {
        logger.error('[ResponsePath] Recovery function failed', err);
        return null;
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
