/**
 * Normalization - обработка входных данных для dialog request processor
 *
 * Функции нормализации контекста и извлечения схемы трансформации
 */

import {ACTION_TO_SCHEMA} from '../../../config/router-static.js';

/**
 * Flat server context → invoke-shaped payload for `runPromptsTransform(..., 'request', ...)`.
 * When `context` is already nested, returns `ctx` unchanged.
 */
export function toInvokeShapeForPromptsTransform(ctx: Record<string, unknown>): Record<string, unknown> {
    if (!ctx || typeof ctx !== 'object' || Array.isArray(ctx)) {
        return {context: {}, task: undefined, message: undefined, result: {}};
    }
    const inner = ctx['context'];
    const hasUsableNestedContext =
        inner != null && typeof inner === 'object' && !Array.isArray(inner);
    if (ctx && typeof ctx === 'object' && !Array.isArray(ctx) && hasUsableNestedContext) {
        return ctx;
    }
    const { context: _ignoredContext, ...rest } = ctx;
    return {
        context: rest,
        task: (rest['task'] as string | undefined) ?? (rest['message'] as string | undefined),
        message: rest['message'],
        result: (rest['result'] as Record<string, unknown> | undefined) ?? {},
    };
}

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
        if (Object.keys(root as Record<string, unknown>).length > 0) {
            return root as Record<string, unknown>;
        }
    }
    const inner = ctx['context'] as Record<string, unknown> | undefined;
    const nested = inner?.['execution'];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
        return nested as Record<string, unknown>;
    }
    return undefined;
}

/**
 * Merge `result` from root and from `context.result` (nested envelope).
 * Root wins on key conflicts (invoke puts `result` at root). Merging avoids losing `choice`
 * when only one side holds it.
 */
export function resolveResultObject(ctx: Record<string, unknown>): Record<string, unknown> | undefined {
    const inner = ctx['context'] as Record<string, unknown> | undefined;
    const nested = inner?.['result'];
    const root = ctx['result'];
    const nestedObj =
        nested && typeof nested === 'object' && !Array.isArray(nested) ? (nested as Record<string, unknown>) : {};
    const rootObj =
        root && typeof root === 'object' && !Array.isArray(root) ? (root as Record<string, unknown>) : {};
    const merged = {...nestedObj, ...rootObj};
    return Object.keys(merged).length > 0 ? merged : undefined;
}

export function resolveTransformSchema(ctx: Record<string, unknown>): string | null {
    const schema = ctx['transformSchema'] as string | undefined;
    if (schema && typeof schema === 'string') return schema;
    const exec = resolveExecution(ctx);
    const action = (exec?.action ?? ctx['action']) as string | undefined;
    const res = resolveResultObject(ctx);
    const step = exec?.step as string | undefined;
    /** Raw invoke / tests: `execution.step === 'init'` + root `task` is session metadata, not a user line — still need dialog schema for the initial form (no LLM). */
    const dialogInitColdStart =
        action === 'dialog' && step === 'init' && !res?.message && ACTION_TO_SCHEMA['dialog'];
    if (dialogInitColdStart) {
        return ACTION_TO_SCHEMA['dialog'];
    }
    const hasMessage = res?.message ?? ctx['task'] ?? ctx['message'];
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
    let result = resolveResultObject(normalizedCtx) ?? {};
    const cid = normalizedCtx['choice_id'];
    const sel = normalizedCtx['selected_choice'];
    if (!result.choice && typeof cid === 'string' && cid.length > 0) {
        result = {...result, choice: cid};
    } else if (!result.choice && typeof sel === 'string' && sel.length > 0) {
        result = {...result, choice: sel};
    }

    // Использовать requestMessage как result.message если result.message отсутствует
    if (!result.message && requestMessage) {
        result = {...result, message: requestMessage};
        normalizedCtx['result'] = result;
    }

    // Использовать task/message как result.message для LLM когда result.message все еще отсутствует
    const execForPromote = resolveExecution(normalizedCtx);
    const skipPromoteTaskToMessage =
        execForPromote?.action === 'dialog' && execForPromote?.step === 'init';
    if (
        !result.message &&
        (normalizedCtx['task'] || normalizedCtx['message']) &&
        !skipPromoteTaskToMessage
    ) {
        result = {...result, message: normalizedCtx['task'] ?? normalizedCtx['message']};
        normalizedCtx['result'] = result;
    } else if (Object.keys(result).length > 0) {
        normalizedCtx['result'] = result;
    }

    applyRouterPipelineChoice(normalizedCtx);

    foldRootIntoNestedContext(normalizedCtx);

    return normalizedCtx;
}

/**
 * After router form: `result.choice` is dialog|agent|task-decomposition — fold into execution so
 * dialog processor + resolveTransformSchema see a normal LLM pipeline action (not action=task, step=router).
 */
function applyRouterPipelineChoice(ctx: Record<string, unknown>): void {
    const exec = resolveExecution(ctx);
    const res = resolveResultObject(ctx) ?? {};
    const choice = typeof res['choice'] === 'string' ? res['choice'] : undefined;
    if (exec?.['step'] !== 'router' || !choice || !ACTION_TO_SCHEMA[choice]) {
        return;
    }
    const newExec = {...exec, action: choice, step: 'start'};
    ctx['execution'] = newExec;
    // Do not reuse an LLM promise from a prior hop (e.g. router classification); recovery would fail
    // and re-emit the router form or error. New pipeline starts fresh.
    delete ctx['llmPromiseId'];
    const nested = ctx['context'];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
        (nested as Record<string, unknown>)['execution'] = newExec;
        delete (nested as Record<string, unknown>)['llmPromiseId'];
    }
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
