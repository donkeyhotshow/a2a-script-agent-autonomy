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
import type {RequestContext, ProcessResult} from './request-processor.interfaces.js';
import {BaseRequestProcessor, type RequestType} from './base-processor.js';
import {requestService} from '../request/request.service.js';
import {fetchLlmResponse, pollReadyThenFetch} from '../../../daemon/llm-hub-poll.js';

type DialogHistoryEntry = { role: string; message: string };

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

function parseLlmResponseFields(responseMd: string): {
    llmMessage: string | undefined;
    llmForm: Record<string, unknown> | undefined;
} {
    let llmMessage: string | undefined;
    let llmForm: Record<string, unknown> | undefined;
    if (responseMd.trim().startsWith('{')) {
        try {
            const llmJson = JSON.parse(responseMd.trim()) as Record<string, unknown>;
            const llmExecute = llmJson.execute as Record<string, unknown> | undefined;
            llmMessage = (llmJson.message ?? llmJson.response ?? llmExecute?.message) as string | undefined;
            llmForm = llmExecute?.form as Record<string, unknown> | undefined;
        } catch (e) {
            logger.warn('[DialogRequestProcessor] Failed to parse JSON response, using raw text', e);
            llmMessage = responseMd.trim();
        }
    } else {
        llmMessage = responseMd.trim();
    }
    return {llmMessage, llmForm};
}

function buildDialogProcessResultFromContext(
    ctx: Record<string, unknown>,
    execute: Record<string, unknown> | undefined,
    responseMd: string,
    recovered: boolean
): ProcessResult {
    const {llmMessage, llmForm} = parseLlmResponseFields(responseMd);
    const assistantMessage = llmMessage ?? (execute?.message as string | undefined);
    const existingHistory = getExistingDialogHistory(ctx);
    const userMessage = getDialogUserMessage(ctx);
    const newHistory = [...existingHistory];
    if (userMessage) {
        const last = newHistory[newHistory.length - 1];
        if (!last || last.role !== 'user' || last.message !== userMessage) {
            newHistory.push({role: 'user', message: userMessage});
        }
    }
    if (assistantMessage) {
        newHistory.push({role: 'assistant', message: assistantMessage});
    }
    const defaultForm = {
        input: [{name: 'message', type: 'text', label: 'Повідомлення', required: true}],
    };
    const msg = recovered ? 'Dialog response (recovered)' : 'Dialog response';
    if (assistantMessage) {
        return {
            outcome: 'completed',
            message: msg,
            context: {...ctx, history: newHistory},
            execute: {
                message: assistantMessage,
                form: llmForm ?? (execute?.form as Record<string, unknown> | undefined) ?? defaultForm,
            },
        } as ProcessResult;
    }
    return {
        outcome: 'completed',
        message: msg,
        context: {...ctx, history: newHistory},
        execute: execute ?? {form: defaultForm},
    } as ProcessResult;
}

/**
 * action → transformSchema for LLM pipeline.
 */
const ACTION_TO_SCHEMA: Record<string, string> = {
    dialog: 'dialog',
    'auto-ai': 'auto-ai',
    coder: 'coder',
    'coder-smart': 'coder',
    'coder-smart-v2': 'coder',
    analyze: 'analyze',
    'task-decomposition': 'task-decomposition',
};

const DEFAULT_AI_HUB = 'http://localhost:11435';
const DEFAULT_MODEL = 'qwen3:8b';

function getPromptsTransformsPath(): string {
    const envPath = process.env.PROMPTS_TRANSFORMS_PATH;
    if (envPath) return path.resolve(envPath);
    const dir = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));
    return path.resolve(dir, '../../../../prompts/transforms');
}

async function runResponseTransform(
    promptsPath: string,
    schemaName: string,
    ctx: Record<string, unknown>,
    responseMd: string
): Promise<ProcessResult | null> {
    try {
        const {writeFile, mkdtemp} = await import('fs/promises');
        const {tmpdir} = await import('os');
        const tempDir = await mkdtemp(path.join(tmpdir(), 'a2a-dialog-'));
        await writeFile(path.join(tempDir, 'response.md'), responseMd, 'utf-8');
        const responseData = {context: ctx, llm: {response: responseMd}};
        const responseTransformResult = await runPromptsTransform(
            promptsPath, schemaName, responseData, 'response', {baseDir: tempDir, forceServerTransforms: true}
        );
        const output = responseTransformResult.success ? responseTransformResult.output : responseData;
        const execute = (output as Record<string, unknown>)?.execute as Record<string, unknown> | undefined;
        return buildDialogProcessResultFromContext(ctx, execute, responseMd, false);
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
                const res = await runResponseTransform(this.promptsTransformsPath, schemaName, ctx, responseMd);
                if (res) return res;
                return {outcome: 'failed', error: 'Response transform failed'} as ProcessResult;
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
            const res = await runResponseTransform(this.promptsTransformsPath, schemaName, ctx, responseMd);
            if (res) return res;
            return {outcome: 'failed', error: 'Response transform failed'} as ProcessResult;
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
    _promiseId: string,
    ctx: Record<string, unknown>,
    llmPromiseId: string
): Promise<ProcessResult | null> {
    const base = (process.env.AI_HUB_URL || DEFAULT_AI_HUB).replace(/\/$/, '');
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
        const promptsPath = process.env.PROMPTS_TRANSFORMS_PATH
            ? path.resolve(process.env.PROMPTS_TRANSFORMS_PATH)
            : path.join(process.cwd(), 'prompts', 'transforms');
        const {writeFile, mkdtemp} = await import('fs/promises');
        const {tmpdir} = await import('os');
        const tempDir = await mkdtemp(path.join(tmpdir(), 'a2a-dialog-'));
        await writeFile(path.join(tempDir, 'response.md'), responseMd, 'utf-8');
        const responseData = {context: ctx, llm: {response: responseMd}};
        const responseTransformResult = await runPromptsTransform(
            promptsPath, schemaName, responseData, 'response', {baseDir: tempDir, forceServerTransforms: true}
        );
        const output = responseTransformResult.success ? responseTransformResult.output : responseData;
        const execute = (output as Record<string, unknown>)?.execute as Record<string, unknown> | undefined;
        return buildDialogProcessResultFromContext(ctx, execute, responseMd, true);
    } catch (err) {
        logger.error('Recovery function failed', err);
        return null;
    }
}
