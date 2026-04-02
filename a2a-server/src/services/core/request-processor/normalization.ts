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
/**
 * `execution` may appear on the invoke context root or under `context.execution` (nested envelope).
 * Prefer root when both exist (matches Client API → invoke shape).
 */
export function resolveExecution(ctx: Record<string, unknown>): Record<string, unknown> | undefined {
    const root = ctx['execution'];
    if (root && typeof root === 'object' && !Array.isArray(root)) {
        return root as Record<string, unknown>;
    }
    const inner = ctx['context'] as Record<string, unknown> | undefined;
    const nested = inner?.['execution'];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
        return nested as Record<string, unknown>;
    }
    return undefined;
}

export function resolveTransformSchema(ctx: Record<string, unknown>): string | null {
    const schema = ctx['transformSchema'] as string | undefined;
    if (schema && typeof schema === 'string') return schema;
    const exec = resolveExecution(ctx);
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

    foldRootIntoNestedContext(normalizedCtx);

    return normalizedCtx;
}

/**
 * When both a root `context` object and root `execution` / `history` exist, copy missing fields into
 * `context` so nested readers (legacy tests, gray-room hints) stay aligned without stripping root keys.
 */
function foldRootIntoNestedContext(ctx: Record<string, unknown>): void {
    const nested = ctx['context'];
    if (!nested || typeof nested !== 'object' || Array.isArray(nested)) {
        return;
    }
    const patch: Record<string, unknown> = {...(nested as Record<string, unknown>)};
    let changed = false;

    const rootExec = ctx['execution'];
    if (rootExec && typeof rootExec === 'object' && !Array.isArray(rootExec)) {
        const cur = patch['execution'];
        if (!cur || typeof cur !== 'object' || Array.isArray(cur)) {
            patch['execution'] = rootExec;
            changed = true;
        }
    }

    const rootHist = ctx['history'];
    if (Array.isArray(rootHist) && rootHist.length > 0) {
        const nh = patch['history'];
        if (!Array.isArray(nh) || nh.length === 0) {
            patch['history'] = rootHist;
            changed = true;
        }
    }

    if (changed) {
        ctx['context'] = patch;
    }
}

/**
 * Извлекает schemaName из полного имени схемы (например "dialog/3" → "dialog")
 */
export function extractSchemaName(schema: string): string {
    return schema.split('/')[0] || 'dialog';
}

/**
 * History length for `interrupt.when` and gray-room policy.
 * Invoke payloads may carry `history` on the root or under `context`.
 */
export function resolveHistoryLength(ctx: Record<string, unknown>): number {
    const root = ctx['history'];
    if (Array.isArray(root)) {
        return root.length;
    }
    const inner = ctx['context'] as Record<string, unknown> | undefined;
    const nested = inner?.['history'];
    return Array.isArray(nested) ? nested.length : 0;
}
