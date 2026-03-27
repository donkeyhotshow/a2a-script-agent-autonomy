/**
 * Dialog / Transform Request Processor
 *
 * Uses transform pipeline: request transforms → LLM → response transforms.
 * Switch: context.transformSchema (e.g. "dialog/3") or execution.action=dialog + result.message.
 */

import * as path from 'path';
import {fileURLToPath} from 'url';
import {logger} from '../../../utils/logger.js';
import {runPromptsTransform} from '../../../transform/index.js';
import {ACTION_TO_SCHEMA} from '../../../config/router-static.js';
import type {RequestContext, ProcessResult} from './request-processor.interfaces.js';
import {BaseRequestProcessor, type RequestType} from './base-processor.js';
import {requestService} from '../request/request.service.js';
import {fetchLlmResponse, pollReadyThenFetch} from '../../../daemon/llm-hub-poll.js';
import type {InterruptDirective, ServerInterruptTraceEvent} from '../../../transform/types.js';
import {validateDialogExecuteShape, shouldEnforceTransformStrictMode} from './validators/transform-execute-validator.js';

type DialogHistoryEntry = { role: string; message: string };

/** Single-key `execute` payloads that must pass through to the client (tool rounds). */
export const DIALOG_TOOL_EXECUTE_KEYS = [
    'rag-search',
    'read-file',
    'write-file',
    'execute-command',
    'list-directory',
    'grep-search',
    'script',
] as const;

export function isDialogToolExecutePayload(execute: Record<string, unknown> | undefined): boolean {
    if (!execute || typeof execute !== 'object') return false;
    const keys = Object.keys(execute).filter((k) => {
        const v = execute[k];
        return v !== undefined && v !== null;
    });
    if (keys.length !== 1) return false;
    return (DIALOG_TOOL_EXECUTE_KEYS as readonly string[]).includes(keys[0]!);
}

function readEnvInt(name: string, defaultValue: number): number {
    const v = process.env[name];
    if (v === undefined || v === '') return defaultValue;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : defaultValue;
}

/** Cap on server-side interrupt iterations (compress / thinking / follow-up LLM). Env: `A2A_MAX_INTERRUPT_TURNS`. */
const MAX_INTERRUPT_TURNS = readEnvInt('A2A_MAX_INTERRUPT_TURNS', 10);

/** Prior turns: flat `history` (invoke/client) or nested `context.history`. */
function getExistingDialogHistory(ctx: Record<string, unknown>): DialogHistoryEntry[] {
    const top = ctx['history'];
    if (Array.isArray(top)) return top as DialogHistoryEntry[];
    const nested = (ctx['context'] as Record<string, unknown> | undefined)?.['history'];
    if (Array.isArray(nested)) return nested as DialogHistoryEntry[];
    return [];
}

/** User line for this step — prefer result.message, then top-level message (not task/session label). */
function getDialogUserMessage(ctx: Record<string, unknown>): string | undefined {
    const r = ctx['result'] as Record<string, unknown> | undefined;
    const fromResult = r?.['message'];
    if (typeof fromResult === 'string' && fromResult.length > 0) return fromResult;
    const msg = ctx['message'];
    if (typeof msg === 'string' && msg.length > 0) return msg;
    return undefined;
}

/** Completed dialog context must not carry llmPromiseId — next invoke would re-enter poll branch. */
function dialogContextWithoutTransientIds(ctx: Record<string, unknown>): Record<string, unknown> {
    const out = {...ctx};
    delete out['llmPromiseId'];
    return out;
}

// Removed parseLlmResponseFields - parsing now handled by transforms

// Removed buildDialogProcessResultFromContext - now using transforms only

function interruptWhenSatisfied(interrupt: InterruptDirective, ctx: Record<string, unknown>): boolean {
    const w = interrupt.when;
    if (!w) return true;
    const len = getExistingDialogHistory(ctx).length;
    if (w.historyMinLength != null && len < w.historyMinLength) return false;
    if (w.historyMaxLength != null && len > w.historyMaxLength) return false;
    return true;
}

/** Skip `compress_history` sidecar when history length ≤ this (0 = only skip empty). Env: `A2A_COMPRESS_HISTORY_MIN_ENTRIES`. */
function compressHistorySkipMaxLength(): number {
    return readEnvInt('A2A_COMPRESS_HISTORY_MIN_ENTRIES', 0);
}

/** Attach chronological interrupt / LLM sub-step trace for Web UI (`context.workbench.slots.interruptTrace`). */
function attachInterruptTraceToContext(
    ctx: Record<string, unknown>,
    trace: ServerInterruptTraceEvent[]
): Record<string, unknown> {
    if (trace.length === 0) return ctx;
    const wb = (ctx['workbench'] as Record<string, unknown>) ?? {};
    const slots = (wb['slots'] as Record<string, unknown>) ?? {};
    return {
        ...ctx,
        workbench: {
            ...wb,
            slots: {
                ...slots,
                interruptTrace: trace,
            },
        },
    };
}

function mergeTraceIntoResult(result: ProcessResult, trace: ServerInterruptTraceEvent[]): ProcessResult {
    if (trace.length === 0 || !result.context) return result;
    return {
        ...result,
        context: attachInterruptTraceToContext(result.context as Record<string, unknown>, trace) as ProcessResult['context'],
    };
}

const DEFAULT_AI_HUB = 'http://localhost:11434';
const DEFAULT_MODEL = 'qwen3:8b';

function getPromptsTransformsPath(): string {
    const envPath = process.env.PROMPTS_TRANSFORMS_PATH;
    if (envPath) return path.resolve(envPath);
    const dir = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));
    return path.resolve(dir, '../../../../prompts/transforms');
}


function warnOnInvalidDialogExecute(execute: ProcessResult['execute'] | undefined, source: string): void {
    const issues = validateDialogExecuteShape(execute);
    if (issues.length === 0) return;
    if (shouldEnforceTransformStrictMode()) {
        const codes = issues.map((i) => i.code).join(', ');
        throw new Error(`Dialog transform contract violation (${source}): ${codes}`);
    }
    logger.warn('[DialogRequestProcessor] Transform execute validation warnings', {
        source,
        issues: issues.map((i) => i.code),
    });
}

async function runResponseTransformWithOutput(
    promptsPath: string,
    schemaName: string,
    ctx: Record<string, unknown>,
    responseMd: string,
    recovered: boolean = false
): Promise<{result: ProcessResult; rawOutput: Record<string, unknown>} | null> {
    try {
        const {writeFile, mkdtemp} = await import('fs/promises');
        const {tmpdir} = await import('os');
        const tempDir = await mkdtemp(path.join(tmpdir(), 'a2a-dialog-'));
        await writeFile(path.join(tempDir, 'response.md'), responseMd, 'utf-8');
        const responseData = {context: ctx, llm: {response: responseMd}};
        const responseTransformResult = await runPromptsTransform(
            promptsPath, schemaName, responseData, 'response', {baseDir: tempDir, forceServerTransforms: true}
        );
        if (!responseTransformResult.success) {
            logger.error('[DialogRequestProcessor] Response transform pipeline failed', {
                error: responseTransformResult.error ?? 'unknown',
            });
            return null;
        }
        const output = responseTransformResult.output;
        const rawOutput = output as Record<string, unknown>;

        // Use execute directly from transform output. Dialog chat turns must include `execute.message`.
        const normalizedExecute = rawOutput.execute as ProcessResult['execute'] | undefined;
        const result: ProcessResult = {
            outcome: 'completed',
            context: rawOutput.context as Record<string, unknown> | undefined ?? ctx,
            execute: normalizedExecute,
        };
        warnOnInvalidDialogExecute(result.execute, 'runResponseTransformWithOutput');

        return {
            rawOutput,
            result,
        };
    } catch (err) {
        logger.error('[DialogRequestProcessor] Transform error', { error: err });
        return null;
    }
}

function resolveTransformSchema(ctx: Record<string, unknown>): string | null {
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

function extractInterrupt(output: Record<string, unknown>): InterruptDirective | null {
    const raw = output['interrupt'];
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const d = raw as Record<string, unknown>;
    if (typeof d.reason !== 'string') return null;
    return d as unknown as InterruptDirective;
}

async function applyInterrupt(
    interrupt: InterruptDirective,
    ctx: Record<string, unknown>,
    _promptsPath: string,
    base: string,
    model: string,
    promiseId: string,
    trace: ServerInterruptTraceEvent[]
): Promise<{ nextCtx: Record<string, unknown>; continueLoop: boolean }> {
    const { reason, context: extraCtx, data } = interrupt;
    let nextCtx = extraCtx ? { ...ctx, ...extraCtx } : { ...ctx };

    if (reason === 'compress_history') {
        console.log('[DialogInterrupt] Processing compress_history interrupt');
        const history = getExistingDialogHistory(nextCtx);
        if (!Array.isArray(history) || history.length === 0) {
            trace.push({
                kind: 'sidecar_llm',
                purpose: 'compress_history',
                ok: true,
                meta: 'skipped_empty_history',
            });
            return { nextCtx, continueLoop: false };
        }
        const skipMax = compressHistorySkipMaxLength();
        if (skipMax > 0 && history.length <= skipMax) {
            trace.push({
                kind: 'sidecar_llm',
                purpose: 'compress_history',
                ok: true,
                meta: `skipped_short_history_<=${skipMax}`,
            });
            return { nextCtx, continueLoop: false };
        }
        const compressPrompt = [
            'Compress the following conversation history into 3–7 short entries (JSON array of {"role":"system"|"assistant"|"user","message":"..."}).',
            'Preserve enough detail to continue the task: user goal, constraints, unresolved steps, file paths touched, last assistant intent.',
            'Omit redundant tool chatter if the same facts live in scratchpad or context.files summaries.',
            'Do not drop the user task or any requirement needed to finish the job.',
            'Respond with ONLY the JSON array, no prose.',
            '',
            'History:',
            JSON.stringify(history, null, 2)
        ].join('\n');
        try {
            const chatRes = await fetch(`${base}/api/chat?promise=1`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Server-Promise-Id': `${promiseId}-compress` },
                body: JSON.stringify({ model, messages: [{ role: 'user', content: compressPrompt }], stream: false }),
            });
            if (chatRes.status === 202) {
                const initData = (await chatRes.json()) as { promiseId?: string };
                if (initData?.promiseId) {
                    const compressed = await pollReadyThenFetch(base, initData.promiseId);
                    if (compressed) {
                        try {
                            const parsed = JSON.parse(compressed.trim()) as unknown[];
                            if (Array.isArray(parsed)) {
                                const innerCtx = (nextCtx['context'] as Record<string, unknown>) ?? {};
                                nextCtx = {
                                    ...nextCtx,
                                    history: parsed,
                                    context: {...innerCtx, history: parsed},
                                };
                                logger.info('[Interrupt:compress_history] History compressed', {
                                    from: history.length,
                                    to: parsed.length,
                                });
                                trace.push({
                                    kind: 'sidecar_llm',
                                    purpose: 'compress_history',
                                    ok: true,
                                    meta: `from=${history.length} to=${parsed.length}`,
                                });
                            } else {
                                trace.push({
                                    kind: 'sidecar_llm',
                                    purpose: 'compress_history',
                                    ok: false,
                                    meta: 'not_array',
                                });
                            }
                        } catch {
                            trace.push({
                                kind: 'sidecar_llm',
                                purpose: 'compress_history',
                                ok: false,
                                meta: 'parse_failed',
                            });
                        }
                    } else {
                        trace.push({
                            kind: 'sidecar_llm',
                            purpose: 'compress_history',
                            ok: false,
                            meta: 'empty_response',
                        });
                    }
                }
            }
        } catch (err) {
            logger.warn('[Interrupt:compress_history] Failed, keeping original history', { error: String(err) });
            trace.push({
                kind: 'sidecar_llm',
                purpose: 'compress_history',
                ok: false,
                meta: 'fetch_error',
            });
        }
        return { nextCtx, continueLoop: false };
    }

    if (reason === 'thinking') {
        let thinkingTraced = false;
        const thinkingPrompt = [
            'Think step by step about the current task state. Be concise.',
            'Return JSON: {"thinking": "your reasoning", "next_action": "what to do next"}',
            '',
            'Context:',
            JSON.stringify(nextCtx['context'] ?? {}, null, 2)
        ].join('\n');
        try {
            const chatRes = await fetch(`${base}/api/chat?promise=1`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Server-Promise-Id': `${promiseId}-think` },
                body: JSON.stringify({ model, messages: [{ role: 'user', content: thinkingPrompt }], stream: false }),
            });
            if (chatRes.status === 202) {
                const initData = (await chatRes.json()) as { promiseId?: string };
                if (initData?.promiseId) {
                    const thinkMd = await pollReadyThenFetch(base, initData.promiseId);
                    if (thinkMd) {
                        try {
                            const parsed = JSON.parse(thinkMd.trim()) as Record<string, unknown>;
                            const innerCtx = nextCtx['context'] as Record<string, unknown>;
                            const wb = (innerCtx['workbench'] as Record<string, unknown>) ?? {};
                            const slots = (wb['slots'] as Record<string, unknown>) ?? {};
                            nextCtx = {
                                ...nextCtx,
                                context: {
                                    ...innerCtx,
                                    workbench: { ...wb, slots: { ...slots, thinking: parsed } }
                                }
                            };
                            trace.push({
                                kind: 'sidecar_llm',
                                purpose: 'thinking',
                                ok: true,
                                meta: 'workbench.slots.thinking',
                            });
                        } catch {
                            trace.push({
                                kind: 'sidecar_llm',
                                purpose: 'thinking',
                                ok: false,
                                meta: 'parse_failed',
                            });
                        }
                        thinkingTraced = true;
                    } else {
                        trace.push({
                            kind: 'sidecar_llm',
                            purpose: 'thinking',
                            ok: false,
                            meta: 'empty_response',
                        });
                        thinkingTraced = true;
                    }
                }
            }
        } catch (err) {
            logger.warn('[Interrupt:thinking] Failed', { error: String(err) });
            trace.push({kind: 'sidecar_llm', purpose: 'thinking', ok: false, meta: 'fetch_error'});
            thinkingTraced = true;
        }
        if (!thinkingTraced) {
            trace.push({kind: 'sidecar_llm', purpose: 'thinking', ok: false, meta: 'no_promise_init'});
        }
        return { nextCtx, continueLoop: true };
    }

    if (reason === 'auto_rag_page') {
        // Signal to continue the main LLM loop with accumulated RAG context
        // Actual RAG execution happens client-side; interrupt here means
        // "re-run LLM with current context after client returns rag result"
        // For server-side: just mark that we should continue the loop
        const innerCtx = nextCtx['context'] as Record<string, unknown>;
        nextCtx = { ...nextCtx, context: { ...innerCtx, _interrupt_reason: reason, ...(data ?? {}) } };
        return { nextCtx, continueLoop: true };
    }

    // Unknown reason — log and stop loop
    logger.warn('[Interrupt] Unknown reason, stopping loop', { reason });
    return { nextCtx, continueLoop: false };
}

/** After primary LLM response: response transform, optional interrupt chain (extra LLM turns server-side). */
async function processDialogResponseWithInterruptLoop(
    promptsPath: string,
    schemaName: string,
    ctx: Record<string, unknown>,
    responseMd: string,
    recovered: boolean,
    promiseId: string,
    base: string,
    model: string
): Promise<ProcessResult> {
    let workingCtx = ctx;
    let md = responseMd;
    let isRecovered = recovered;
    let interruptBudget = MAX_INTERRUPT_TURNS;
    const trace: ServerInterruptTraceEvent[] = [];
    let turn = 0;

    while (true) {
        trace.push({
            kind: 'llm_output',
            phase: turn === 0 ? 'primary' : 'follow_up',
            chars: md.length,
        });
        logger.info('[Dialog] LLM responseMd', {md: md.substring(0, 500)});
        const pair = await runResponseTransformWithOutput(
            promptsPath, schemaName, workingCtx, md, isRecovered
        );
        logger.info('[Dialog] Transform result', {execute: pair?.result?.execute});
        isRecovered = false;
        if (!pair) {
            return {outcome: 'failed', error: 'Response transform failed'} as ProcessResult;
        }
        const {result, rawOutput} = pair;
        const interrupt = extractInterrupt(rawOutput);
        trace.push({
            kind: 'response_transform',
            interruptReason: interrupt?.reason,
        });
        if (!interrupt) {
            return mergeTraceIntoResult(result, trace);
        }

        if (!interruptWhenSatisfied(interrupt, workingCtx)) {
            trace.push({
                kind: 'interrupt_skipped',
                reason: interrupt.reason,
                detail: 'when_clause_not_met',
            });
            return mergeTraceIntoResult(result, trace);
        }

        if (interruptBudget <= 0) {
            const c = result.context as Record<string, unknown>;
            return mergeTraceIntoResult(
                {...result, context: {...c, interrupt_truncated: true}} as ProcessResult,
                trace
            );
        }
        interruptBudget--;

        const {nextCtx, continueLoop} = await applyInterrupt(
            interrupt, workingCtx, promptsPath, base, model, promiseId, trace
        );
        trace.push({
            kind: 'interrupt_handler',
            reason: interrupt.reason,
            continueLoop,
            note: interrupt.reason === 'auto_rag_page' ? 'merge_context_reenter' : undefined,
        });

        if (!continueLoop) {
            // Transform already processed the response; finalize using the same
            // transform-owned execute shape. Dialog chat turns must include `execute.message`.
            const normalizedExecute = rawOutput.execute as ProcessResult['execute'] | undefined;
            const res: ProcessResult = {
                outcome: 'completed',
                context: rawOutput.context as Record<string, unknown> | undefined ?? nextCtx,
                execute: normalizedExecute,
            };
            warnOnInvalidDialogExecute(res.execute, 'interruptLoop.finalize');
            return mergeTraceIntoResult(res, trace);
        }

        workingCtx = nextCtx;

        const requestTransformResult = await runPromptsTransform(
            promptsPath, schemaName, workingCtx, 'request', {forceServerTransforms: true}
        );
        if (!requestTransformResult.success) {
            return {
                outcome: 'failed',
                error: requestTransformResult.error || 'Request transform failed (interrupt loop)',
            } as ProcessResult;
        }
        trace.push({kind: 'request_rebuild'});
        const files = (requestTransformResult.files as Record<string, string>) || {};
        const requestMd = files['request.md'];
        if (!requestMd) {
            return {
                outcome: 'failed',
                error: 'Request transform did not produce request.md (interrupt loop)',
            } as ProcessResult;
        }

        const systemMd = files['system.md'];
        const messages: Array<{role: string; content: string}> = [];
        if (typeof systemMd === 'string' && systemMd.trim().length > 0) {
            messages.push({role: 'system', content: systemMd});
        }
        messages.push({role: 'user', content: requestMd});

        const subHeader = `${promiseId}-intr-${interruptBudget}`;
        const chatRes = await fetch(`${base}/api/chat?promise=1`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Server-Promise-Id': subHeader,
            },
            body: JSON.stringify({
                model,
                messages,
                stream: false,
            }),
        });
        if (chatRes.status !== 202) {
            const errText = await chatRes.text();
            logger.error('[DialogRequestProcessor] LLM promise init failed (interrupt loop)', {
                status: chatRes.status,
                error: errText,
            });
            return {
                outcome: 'failed',
                error: `LLM error (interrupt loop): ${chatRes.status} ${errText.slice(0, 200)}`,
            } as ProcessResult;
        }
        const initData = (await chatRes.json()) as {promiseId?: string};
        const subLlmId = initData?.promiseId;
        if (!subLlmId) {
            return {outcome: 'failed', error: 'No promiseId in LLM response (interrupt loop)'} as ProcessResult;
        }
        const nextMd = await pollReadyThenFetch(base, subLlmId);
        if (!nextMd) {
            return {outcome: 'failed', error: 'LLM response fetch failed (interrupt loop)'} as ProcessResult;
        }
        md = nextMd;
        turn++;
    }
}

export class DialogRequestProcessor extends BaseRequestProcessor {
    private promptsTransformsPath: string;

    constructor(promptsTransformsPath?: string) {
        super('DialogRequestProcessor', {});
        this.promptsTransformsPath = promptsTransformsPath ?? getPromptsTransformsPath();
    }

    canProcess(request: RequestContext): boolean {
        return resolveTransformSchema(request.context) !== null;
    }

    getRequestType(): RequestType {
        return 'dialog';
    }

    protected async doProcess(request: RequestContext): Promise<ProcessResult> {
        const {promiseId, context, message: requestMessage} = request;
        const ctx = {...context} as Record<string, unknown>;
        let result = (ctx['result'] as Record<string, unknown>) ?? {};
        if (!result.message && requestMessage) {
            result = {...result, message: requestMessage};
            ctx['result'] = result;
        }
        // Normalize: use task/message as result.message for LLM when result.message still missing (e.g. ai_action follow-up)
        if (!result.message && (ctx['task'] || ctx['message'])) {
            ctx['result'] = {...result, message: ctx['task'] ?? ctx['message']};
        }
        const schema = resolveTransformSchema(ctx);
        if (!schema) {
            return {outcome: 'failed', error: 'transformSchema required'} as ProcessResult;
        }
        const schemaName = schema.split('/')[0] || 'dialog';
        const aiHubUrl = process.env.AI_HUB_URL || DEFAULT_AI_HUB;
        const model = process.env.OLLAMA_MODEL || DEFAULT_MODEL;

        logger.info('[DialogRequestProcessor] Processing', {promiseId});

        const base = aiHubUrl.replace(/\/$/, '');
        const existingLlmId = ctx['llmPromiseId'] as string | undefined;

        try {
            if (existingLlmId) {
                const responseMd = await pollReadyThenFetch(base, existingLlmId);
                if (!responseMd) return {outcome: 'failed', error: 'LLM poll/fetch failed'} as ProcessResult;
                return processDialogResponseWithInterruptLoop(
                    this.promptsTransformsPath,
                    schemaName,
                    ctx,
                    responseMd,
                    false,
                    promiseId,
                    base,
                    model
                );
            }

            // 1. Request transforms → request.md (use server-transforms; dialog-request.json is form-only)
            const requestTransformResult = await runPromptsTransform(
                this.promptsTransformsPath, schemaName, ctx, 'request', {forceServerTransforms: true}
            );
            if (!requestTransformResult.success) {
                return {outcome: 'failed', error: requestTransformResult.error || 'Request transform failed'} as ProcessResult;
            }
            const files = (requestTransformResult.files as Record<string, string>) || {};
            const requestMd = files['request.md'];
            if (!requestMd) {
                return {outcome: 'failed', error: 'Request transform did not produce request.md'} as ProcessResult;
            }

            const systemMd = files['system.md'];
            const messages: Array<{role: string; content: string}> = [];
            if (typeof systemMd === 'string' && systemMd.trim().length > 0) {
                messages.push({role: 'system', content: systemMd});
            }
            messages.push({role: 'user', content: requestMd});

            // 2. Call LLM via promise flow (ai-integration proxy)
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
                return {outcome: 'failed', error: `LLM error: ${chatRes.status} ${errText.slice(0, 200)}`} as ProcessResult;
            }
            const initData = (await chatRes.json()) as {promiseId?: string; status?: string};
            const llmPromiseId = initData?.promiseId;
            if (!llmPromiseId) {
                return {outcome: 'failed', error: 'No promiseId in LLM response'} as ProcessResult;
            }
            await requestService.updateLlmPromiseId(promiseId, llmPromiseId);
            logger.info('[DialogRequestProcessor] Polling promise', {llmPromiseId});

            const responseMd = await pollReadyThenFetch(base, llmPromiseId);
            if (!responseMd) {
                return {outcome: 'failed', error: 'LLM response fetch failed'} as ProcessResult;
            }
            return processDialogResponseWithInterruptLoop(
                this.promptsTransformsPath,
                schemaName,
                ctx,
                responseMd,
                false,
                promiseId,
                base,
                model
            );
        } catch (err) {
            logger.error('[DialogRequestProcessor] Failed', {error: String(err)});
            return {
                outcome: 'failed',
                error: err instanceof Error ? err.message : String(err),
            } as ProcessResult;
        }
    }
}

export const dialogRequestProcessor = new DialogRequestProcessor();

/**
 * Recover a stuck dialog request that has llmPromiseId (e.g. after server restart during polling).
 * Fetches result from proxy and runs response transform.
 */
export async function recoverDialogFromLlmPromise(
    promiseId: string,
    ctx: Record<string, unknown>,
    llmPromiseId: string
): Promise<ProcessResult | null> {
    const base = (process.env.AI_HUB_URL || DEFAULT_AI_HUB).replace(/\/$/, '');
    const model = process.env.OLLAMA_MODEL || DEFAULT_MODEL;
    try {
        const res = await fetch(`${base}/promises/status`);
        if (!res.ok) return null;
        const data = (await res.json()) as {ready?: Array<{promiseId?: string}>};
        if (!(data.ready ?? []).some((p) => p.promiseId === llmPromiseId)) return null;
        const responseMd = await fetchLlmResponse(base, llmPromiseId);
        if (!responseMd) return null;
        const schema = resolveTransformSchema(ctx);
        if (!schema) return null;
        const schemaName = schema.split('/')[0] || 'dialog';
        const promptsPath = getPromptsTransformsPath();
        return processDialogResponseWithInterruptLoop(
            promptsPath,
            schemaName,
            ctx,
            responseMd,
            true,
            promiseId,
            base,
            model
        );
    } catch (err) {
        logger.error('Recovery function failed', err);
        return null;
    }
}
