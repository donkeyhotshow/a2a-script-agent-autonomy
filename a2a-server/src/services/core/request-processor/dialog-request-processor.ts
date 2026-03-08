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

        try {
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
            const base = aiHubUrl.replace(/\/$/, '');
            const chatRes = await fetch(`${base}/api/chat?promise=1`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
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
            logger.info('[DialogRequestProcessor] Polling promise', {llmPromiseId});

            const pollIntervalMs = 500;
            const pollTimeoutMs = 200000;
            const started = Date.now();
            let statusRes: Response;
            let statusData: {status?: string; error?: string};
            for (;;) {
                statusRes = await fetch(`${base}/promise/${llmPromiseId}`);
                statusData = (await statusRes.json()) as {status?: string; error?: string};
                if (statusData.status === 'done') break;
                if (statusData.status === 'error') {
                    return {outcome: 'failed', error: statusData.error ?? 'LLM promise error'} as ProcessResult;
                }
                if (Date.now() - started > pollTimeoutMs) {
                    return {outcome: 'failed', error: 'LLM promise timeout'} as ProcessResult;
                }
                await new Promise((r) => setTimeout(r, pollIntervalMs));
            }

            const bodyRes = await fetch(`${base}/promise/${llmPromiseId}/response`);
            if (!bodyRes.ok) {
                return {outcome: 'failed', error: `LLM response fetch failed: ${bodyRes.status}`} as ProcessResult;
            }
            const chatData = (await bodyRes.json()) as {message?: {content?: string}};
            const responseMd = chatData?.message?.content ?? '';

            // 3. Temp dir for response transform (response.md must be in baseDir for parse-json-from-md)
            const {writeFile, mkdtemp} = await import('fs/promises');
            const {tmpdir} = await import('os');
            const tempDir = await mkdtemp(path.join(tmpdir(), 'a2a-dialog-'));
            await writeFile(path.join(tempDir, 'response.md'), responseMd, 'utf-8');

            // 4. Response transforms → execute + context (use server-transforms for parse-json-from-md)
            const responseData = {context: ctx, llm: {response: responseMd}};
            const responseTransformResult = await runPromptsTransform(
                this.promptsTransformsPath, schemaName, responseData, 'response', {baseDir: tempDir, forceServerTransforms: true}
            );
            const output = responseTransformResult.success ? responseTransformResult.output : responseData;

            const execute = (output as Record<string, unknown>)?.execute as Record<string, unknown> | undefined;
            const contextOut = (output as Record<string, unknown>)?.context as Record<string, unknown> | undefined;

            return {
                outcome: 'completed',
                message: 'Dialog response',
                context: contextOut ?? ctx,
                execute:
                    execute ??
                    ({
                        form: {
                            input: [{name: 'message', type: 'text', label: 'Повідомлення', required: true}],
                        },
                    } as Record<string, unknown>),
            } as ProcessResult;
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
