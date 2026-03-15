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

/**
 * action → transformSchema for LLM pipeline.
 */
const ACTION_TO_SCHEMA: Record<string, string> = {
    dialog: 'dialog',
    'auto-ai': 'auto-ai',
    coder: 'coder',
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

async function fetchLlmResponse(base: string, llmPromiseId: string): Promise<string | null> {
    const bodyRes = await fetch(`${base}/promise/${llmPromiseId}/response`);
    if (!bodyRes.ok) return null;
    const chatData = (await bodyRes.json()) as {message?: {content?: string}};
    return chatData?.message?.content ?? null;
}

async function pollReadyThenFetch(base: string, llmPromiseId: string): Promise<string | null> {
    const pollIntervalMs = 500;
    const pollTimeoutMs = 200000;
    const started = Date.now();
    for (;;) {
        const res = await fetch(`${base}/promises/status`);
        if (res.ok) {
            const data = (await res.json()) as {ready?: Array<{promiseId?: string}>};
            if ((data.ready ?? []).some((p) => p.promiseId === llmPromiseId)) {
                return fetchLlmResponse(base, llmPromiseId);
            }
        }
        if (Date.now() - started > pollTimeoutMs) throw new Error('LLM promise timeout');
        await new Promise((r) => setTimeout(r, pollIntervalMs));
    }
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
        const contextOut = (output as Record<string, unknown>)?.context as Record<string, unknown> | undefined;
        
        // Fallback: if execute.message is missing, try to extract from LLM response
        // This works for both JSON and plain text responses from LLM
        let llmMessage: string | undefined;
        let llmForm: Record<string, unknown> | undefined;
        
        // Try to parse LLM response as JSON first
        if (responseMd.trim().startsWith('{')) {
            try {
                const llmJson = JSON.parse(responseMd.trim());
                const llmExecute = llmJson.execute as Record<string, unknown> | undefined;
                // Try multiple paths: llmJson.message, llmJson.execute.message, llmJson.response
                llmMessage = llmJson.message ?? llmJson.response ?? llmExecute?.message;
                llmForm = llmExecute?.form as Record<string, unknown> | undefined;
            } catch (e) {
                // JSON parse failed, try as plain text
                llmMessage = responseMd.trim();
            }
        } else {
            // Not JSON - treat as plain text response from LLM
            llmMessage = responseMd.trim();
        }
        
        // Get existing history from ctx.context
        const ctxContext = ctx['context'] as Record<string, unknown> | undefined;
        const existingHistory = (ctxContext?.history ?? []) as Array<{role: string; message: string}>;
        
        // Get user message from ctx.result
        const ctxResult = ctx['result'] as Record<string, unknown> | undefined;
        const userMessage = ctxResult?.message as string | undefined;
        
        // Get assistant message from LLM response (or from execute if already set)
        const assistantMessage = llmMessage ?? (execute?.message as string | undefined);
        
        // Build new history by appending user and assistant messages
        const newHistory = [...existingHistory];
        if (userMessage) {
            newHistory.push({ role: 'user', message: userMessage });
        }
        if (assistantMessage) {
            newHistory.push({ role: 'assistant', message: assistantMessage });
        }
        
        // If we have a message from LLM or execute, return with history
        if (assistantMessage) {
            return {
                outcome: 'completed',
                message: 'Dialog response',
                context: { ...ctx, history: newHistory },
                execute: {
                    message: assistantMessage,
                    form: llmForm ?? (execute?.form as Record<string, unknown> | undefined) ?? {input: [{name: 'message', type: 'text', label: 'Повідомлення', required: true}]},
                },
            } as ProcessResult;
        }
        
        // Fallback: return with history even if no message (for initial dialog step)
        return {
            outcome: 'completed',
            message: 'Dialog response',
            context: { ...ctx, history: newHistory },
            execute: execute ?? {form: {input: [{name: 'message', type: 'text', label: 'Повідомлення', required: true}]}},
        } as ProcessResult;
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
        const {promiseId, context} = request;
        const ctx = { ...context };
        // Normalize: use task/message as result.message for LLM when result.message missing (e.g. ai_action follow-up)
        const result = (ctx['result'] as Record<string, unknown>) ?? {};
        if (!result.message && (ctx['task'] || ctx['message'])) {
            ctx['result'] = { ...result, message: ctx['task'] ?? ctx['message'] };
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
            const requestMd = (requestTransformResult.files as Record<string, string>)?.['request.md'];
            if (!requestMd) {
                return {outcome: 'failed', error: 'Request transform did not produce request.md'} as ProcessResult;
            }

            // 2. Call LLM via promise flow (ai-integration proxy)
            const chatRes = await fetch(`${base}/api/chat?promise=1`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Server-Promise-Id': promiseId,
                },
                body: JSON.stringify({
                    model,
                    messages: [{role: 'user', content: requestMd}],
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
        
        // Fallback: if execute.message is missing, try to extract from LLM response
        // This mirrors the logic in runResponseTransform
        let llmMessage: string | undefined;
        let llmForm: Record<string, unknown> | undefined;
        
        // Try to parse LLM response as JSON first
        if (responseMd.trim().startsWith('{')) {
            try {
                const llmJson = JSON.parse(responseMd.trim());
                const llmExecute = llmJson.execute as Record<string, unknown> | undefined;
                llmMessage = llmJson.message ?? llmJson.response ?? llmExecute?.message;
                llmForm = llmExecute?.form as Record<string, unknown> | undefined;
            } catch {
                // JSON parse failed, try as plain text
                llmMessage = responseMd.trim();
            }
        } else {
            // Not JSON - treat as plain text response from LLM
            llmMessage = responseMd.trim();
        }
        
        // Get existing history from ctx.context
        const ctxContext = ctx['context'] as Record<string, unknown> | undefined;
        const existingHistory = (ctxContext?.history ?? []) as Array<{role: string; message: string}>;
        
        // Get user message from ctx.result
        const ctxResult = ctx['result'] as Record<string, unknown> | undefined;
        const userMessage = ctxResult?.message as string | undefined;
        
        // Get assistant message from LLM response (or from execute if already set)
        const assistantMessage = llmMessage ?? (execute?.message as string | undefined);
        
        // Build new history by appending user and assistant messages
        const newHistory = [...existingHistory];
        if (userMessage) {
            newHistory.push({ role: 'user', message: userMessage });
        }
        if (assistantMessage) {
            newHistory.push({ role: 'assistant', message: assistantMessage });
        }
        
        // Return with history and proper execute structure
        if (assistantMessage) {
            return {
                outcome: 'completed',
                message: 'Dialog response (recovered)',
                context: { ...ctx, history: newHistory },
                execute: {
                    message: assistantMessage,
                    form: llmForm ?? (execute?.form as Record<string, unknown> | undefined) ?? {input: [{name: 'message', type: 'text', label: 'Повідомлення', required: true}]},
                },
            } as ProcessResult;
        }
        
        // Fallback: return with history even if no message
        return {
            outcome: 'completed',
            message: 'Dialog response (recovered)',
            context: { ...ctx, history: newHistory },
            execute: execute ?? {form: {input: [{name: 'message', type: 'text', label: 'Повідомлення', required: true}]}},
        } as ProcessResult;
    } catch {
        return null;
    }
}
