/**
 * Normalization - обработка входных данных для dialog request processor
 *
 * Функции нормализации контекста и извлечения схемы трансформации
 */

import {ACTION_TO_SCHEMA} from '../../../config/router-static.js';

/**
 * Resolve transformSchema из контекста запроса
 * Приоритет: transformSchema → execution.action + result.message
 */
export function resolveTransformSchema(ctx: Record<string, unknown>): string | null {
    const schema = ctx['transformSchema'] as string | undefined;
    if (schema && typeof schema === 'string') return schema;
    const exec = ctx['execution'] as Record<string, unknown> | undefined;
    const action = (exec?.action ?? ctx['action']) as string | undefined;
    const hasMessage = (ctx['result'] as Record<string, unknown>)?.message ?? ctx['task'] ?? ctx['message'];
    if (action && hasMessage && ACTION_TO_SCHEMA[action]) {
        return ACTION_TO_SCHEMA[action];
    }
    return null;
}

/**
 * Нормализует контекст: добавляет message в result если отсутствует
 * Используется для случаев когда LLM вызывается повторно (ai_action follow-up)
 */
export function normalizeContext(
    ctx: Record<string, unknown>,
    requestMessage?: string
): Record<string, unknown> {
    const normalizedCtx = {...ctx} as Record<string, unknown>;
    let result = (normalizedCtx['result'] as Record<string, unknown>) ?? {};

    // Использовать requestMessage как result.message если result.message отсутствует
    if (!result.message && requestMessage) {
        result = {...result, message: requestMessage};
        normalizedCtx['result'] = result;
    }

    // Использовать task/message как result.message для LLM когда result.message все еще отсутствует
    if (!result.message && (normalizedCtx['task'] || normalizedCtx['message'])) {
        normalizedCtx['result'] = {...result, message: normalizedCtx['task'] ?? normalizedCtx['message']};
    }

    return normalizedCtx;
}

/**
 * Извлекает schemaName из полного имени схемы (например "dialog/3" → "dialog")
 */
export function extractSchemaName(schema: string): string {
    return schema.split('/')[0] || 'dialog';
}
