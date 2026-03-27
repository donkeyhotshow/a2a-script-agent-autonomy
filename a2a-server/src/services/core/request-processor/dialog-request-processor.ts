/**
 * Dialog / Transform Request Processor
 *
 * Uses transform pipeline: request transforms → LLM → response transforms.
 * Switch: context.transformSchema (e.g. "dialog/3") or execution.action=dialog + result.message.
 */

import * as path from 'path';
import {fileURLToPath} from 'url';
import {logger} from '../../../utils/logger.js';
import {runPromptsTransform, getPromptsTransformsPath} from '../../../transform/index.js';
import {ACTION_TO_SCHEMA} from '../../../config/router-static.js';
import type {RequestContext, ProcessResult} from './request-processor.interfaces.js';
import {BaseRequestProcessor, type RequestType} from './base-processor.js';
import {requestService} from '../request/request.service.js';
import {fetchLlmResponse, pollReadyThenFetch} from '../../../daemon/llm-hub-poll.js';
import {GrayRoomOrchestrator} from './gray-room-orchestrator.js';

const DEFAULT_AI_HUB = 'http://localhost:11434';
const DEFAULT_MODEL = 'qwen3:8b';

async function createDialogTransformOutputDir(): Promise<string> {
    const {mkdtemp} = await import('fs/promises');
    const {tmpdir} = await import('os');
    return mkdtemp(path.join(tmpdir(), 'a2a-dialog-transform-'));
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
    private grayRoom: GrayRoomOrchestrator;
    private promptsTransformsPath: string;

    constructor(promptsTransformsPath?: string) {
        super('DialogRequestProcessor', {});
        this.promptsTransformsPath = promptsTransformsPath ?? getPromptsTransformsPath();
        this.grayRoom = new GrayRoomOrchestrator({
            promptsTransformsPath: this.promptsTransformsPath
        });
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
                return this.grayRoom.runLoop(
                    ctx,
                    schemaName,
                    responseMd,
                    promiseId,
                    false
                );
            }

            // 1. Request transforms → request.md
            const outputDir = await createDialogTransformOutputDir();
            const requestTransformResult = await runPromptsTransform(
                this.promptsTransformsPath, schemaName, ctx, 'request', {forceServerTransforms: true, outputDir}
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

            // 2. Call LLM via promise flow
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
            return this.grayRoom.runLoop(
                ctx,
                schemaName,
                responseMd,
                promiseId,
                false
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
        const orchestrator = new GrayRoomOrchestrator({ promptsTransformsPath: promptsPath });
        return orchestrator.runLoop(
            ctx,
            schemaName,
            responseMd,
            promiseId,
            true
        );
    } catch (err) {
        logger.error('Recovery function failed', err);
        return null;
    }
}
