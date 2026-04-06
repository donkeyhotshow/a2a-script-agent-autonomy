/**
 * Dialog / Transform Request Processor
 *
 * Uses transform pipeline: request transforms → LLM → response transforms.
 * Switch: context.transformSchema (e.g. "dialog/3") or execution.action=dialog + result.message.
 *
 * Модульная структура:
 * - normalization.ts - нормализация входных данных
 * - llm-orchestration.ts - оркестрация LLM вызовов
 * - response-path.ts - обработка путей ответа
 */

import {logger} from '../../../utils/logger.js';
import {resolveAiHubBaseUrl} from '../../../utils/ai-hub-url.js';
import {getPromptsTransformsPath} from '../../../transform/index.js';
import type {RequestContextBlock} from '../../../types/index.js';
import type {RequestContext, ProcessResult} from './request-processor.interfaces.js';
import {BaseRequestProcessor, type RequestType} from './base-processor.js';
import {
    GrayRoomOrchestrator,
} from './gray-room-orchestrator.js';
import {
    isDialogToolExecutePayload
} from './gray-room-utils.js';
import {
    readDialogHubLlmResubmitMax,
    readGrayRoomInterruptBudget,
    shouldUseGrayRoom
} from './gray-room-trigger.js';
import {
    resolveTransformSchema,
    normalizeContext,
    extractSchemaName,
    resolveResultObject,
} from './normalization.js';
import {tryParseJsonFromLlmText} from '../../../utils/strip-markdown-json-fence.js';
import {resolveLlmModelFromContext} from './llm-model-resolver.js';
import {requestService} from '../request/request.service.js';
import {CognitionBase} from '../cognition-base.js';
import {EpisodicMemory} from '../../memory/episodic-memory.js';
import {globalDesignReasoner} from '../hierarchical-design-reasoner.js';

export {isDialogToolExecutePayload};
export {resolveTransformSchema, normalizeContext, extractSchemaName};

// Re-export из llm-orchestration
export {
    createDialogTransformOutputDir,
    runRequestTransforms,
    prepareLlmMessages,
    initLlmPromise,
    executeLlmCall,
    recoverLlmPromise,
    type LlmCallOptions,
    type LlmCallResult
} from './llm-orchestration.js';

// Re-export из response-path
export {
    recoverDialogFromLlmPromise,
    canRecoverFromLlmPromise,
    getLlmPromiseId,
    type ResponsePathResult,
    type RecoverDialogOutcome,
} from './response-path.js';

function dialogFailedWithContext(ctx: Record<string, unknown>, error: string): ProcessResult {
    return {
        outcome: 'failed',
        error,
        context: ctx as unknown as RequestContextBlock,
    };
}

function isDialogExecuteMissingOrEmpty(execute: ProcessResult['execute']): boolean {
    if (execute == null || typeof execute !== 'object') {
        return true;
    }
    const ex = execute as Record<string, unknown>;
    return Object.keys(ex).filter((k) => ex[k] != null).length === 0;
}

function lastAssistantMessageFromContext(context: Record<string, unknown> | undefined): string | undefined {
    const h = context?.['history'];
    if (!Array.isArray(h)) {
        return undefined;
    }
    for (let i = h.length - 1; i >= 0; i--) {
        const row = h[i];
        if (!row || typeof row !== 'object' || Array.isArray(row)) {
            continue;
        }
        const r = row as Record<string, unknown>;
        if (r['role'] === 'assistant' && typeof r['message'] === 'string' && r['message'].trim()) {
            return r['message'].trim();
        }
    }
    return undefined;
}

function extractDialogFallbackAssistantText(responseMd: string): string {
    const trimmed = (responseMd || '').trim();
    if (!trimmed) {
        return 'The model returned no visible text (empty response). Check LLM hub / model settings.';
    }
    const parsed = tryParseJsonFromLlmText(trimmed);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const p = parsed as Record<string, unknown>;
        const ex = p['execute'];
        if (ex && typeof ex === 'object' && !Array.isArray(ex)) {
            const msg = (ex as Record<string, unknown>)['message'];
            if (typeof msg === 'string' && msg.trim()) {
                return msg.trim();
            }
        }
        const topMsg = p['message'];
        if (typeof topMsg === 'string' && topMsg.trim()) {
            return topMsg.trim();
        }
    }
    const lines = trimmed.split(/\r?\n/).map((l) => l.trim());
    const first = lines.find((l) => l.length > 0);
    return first ?? trimmed.slice(0, 500);
}

/**
 * Gray-room response transform can yield context patches without `execute`, which breaks the Client API
 * (persisted server-response.json is context-only). For dialog schema, synthesize a standard continue form.
 */
function ensureDialogExecuteWhenMissing(
    result: ProcessResult,
    schemaName: string,
    responseMd: string
): void {
    if (schemaName !== 'dialog') {
        return;
    }
    if (result.outcome === 'failed') {
        return;
    }
    if (!isDialogExecuteMissingOrEmpty(result.execute)) {
        return;
    }

    const ctx = result.context as Record<string, unknown> | undefined;
    let text = lastAssistantMessageFromContext(ctx);
    if (!text) {
        text = extractDialogFallbackAssistantText(responseMd);
    }

    const baseCtx: Record<string, unknown> =
        ctx && typeof ctx === 'object' && !Array.isArray(ctx) ? {...ctx} : {};
    const hist: unknown[] = Array.isArray(baseCtx['history']) ? [...(baseCtx['history'] as unknown[])] : [];
    const hasAssistant = hist.some(
        (row) =>
            row &&
            typeof row === 'object' &&
            !Array.isArray(row) &&
            (row as Record<string, unknown>)['role'] === 'assistant'
    );
    if (!hasAssistant && text) {
        hist.push({role: 'assistant', message: text});
        baseCtx['history'] = hist;
    }

    result.context = baseCtx as RequestContextBlock;
    result.execute = {
        form: {
            title: 'Dialog',
            description: text,
            input: [
                {
                    name: 'message',
                    type: 'text',
                    label: 'Message',
                    required: false,
                },
            ],
        },
    };

    logger.warn('[DialogRequestProcessor] Dialog gray-room result had no execute; applied fallback form', {
        preview: text.slice(0, 120),
    });
}

export class DialogRequestProcessor extends BaseRequestProcessor {
    private grayRoom: GrayRoomOrchestrator;
    private promptsTransformsPath: string;

    constructor(promptsTransformsPath?: string) {
        super('DialogRequestProcessor', {});
        this.promptsTransformsPath = promptsTransformsPath ?? getPromptsTransformsPath();
        this.grayRoom = new GrayRoomOrchestrator({
            promptsTransformsPath: this.promptsTransformsPath,
            maxInterruptTurns: readGrayRoomInterruptBudget()
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
        const {executeLlmCall} = await import('./llm-orchestration.js');

        const ctx = normalizeContext(context, requestMessage);
        if (context.session_id) {
            ctx.session_id = context.session_id;
        }
        const grayRoomChain = shouldUseGrayRoom(ctx).shouldTrigger;
        const schema = resolveTransformSchema(ctx);

        if (!schema) {
            return dialogFailedWithContext(ctx, 'transformSchema required');
        }

        const schemaName = extractSchemaName(schema);
        const aiHubUrl = resolveAiHubBaseUrl();
        const model = resolveLlmModelFromContext(ctx);

        logger.info('[DialogRequestProcessor] Processing', {promiseId});

        let allowContextAugment = true;

        try {
            // Check for dialog INITIAL request (no history yet) to return form directly without LLM
            // For follow-up requests (history exists), we MUST call LLM to get assistant response
            const hasHistory = Array.isArray(ctx['history']) && ctx['history'].length > 0;
            if (schemaName === 'dialog' && !hasHistory && !resolveResultObject(ctx)?.message) {
                return {
                    outcome: 'success',
                    execute: {
                        form: {
                            input: [
                                {
                                    name: 'task',
                                    type: 'text',
                                    label: 'Enter your task',
                                    required: true
                                }
                            ]
                        }
                    },
                    context: ctx as RequestContextBlock
                };
            }

            const existingLlmId = ctx['llmPromiseId'] as string | undefined;
            if (existingLlmId) {
                const {recoverDialogFromLlmPromise} = await import('./response-path.js');
                const recoveryOutcome = await recoverDialogFromLlmPromise(promiseId, ctx, existingLlmId);

                if (recoveryOutcome.tag === 'pending') {
                    return dialogFailedWithContext(ctx, 'LLM promise still pending');
                }
                if (recoveryOutcome.tag === 'failed') {
                    return dialogFailedWithContext(ctx, recoveryOutcome.error || 'LLM recovery failed');
                }
                if (recoveryOutcome.tag === 'resubmit') {
                    const cnt = await requestService.incrementHubLlmResubmitCount(promiseId);
                    const maxR = readDialogHubLlmResubmitMax();
                    if (cnt > maxR) {
                        return dialogFailedWithContext(
                            ctx,
                            `LLM hub promise lost after ${maxR} resubmit(s); start a new turn or check AI hub`
                        );
                    }
                    await requestService.clearLlmPromiseId(promiseId);
                    delete ctx['llmPromiseId'];
                    allowContextAugment = false;
                } else if (recoveryOutcome.tag === 'done') {
                    const r = recoveryOutcome.result;
                    if (r.context && typeof r.context === 'object' && !Array.isArray(r.context)) {
                        const sessionIdValue = ctx['session_id'];
                        if (sessionIdValue && typeof sessionIdValue === 'string') {
                            r.context = {...r.context, session_id: sessionIdValue};
                        }
                    }
                    return r;
                }
            }

            if (!ctx['llmPromiseId']) {
                if (allowContextAugment) {
                // Внедрение априорных знаний через CognitionBase (ADR-0062)
                try {
                    const cognition = new CognitionBase();
                    const episodic = new EpisodicMemory();
                    const topic = (ctx['task'] as string) || (ctx['message'] as string) || 'general';
                    const sessionId = (ctx['session_id'] as string) || 'startup';
                    
                    const priors = await cognition.injectPriors(
                        topic,
                        sessionId,
                        { query: async () => [] }, // LessonStore stub
                        { query: async () => [] }, // PatternStore stub
                        episodic
                    );
                    
                    const priorStr = cognition.formatForContext(priors);
                    if (priorStr && typeof ctx['message'] === 'string') {
                        ctx['message'] = ctx['message'] + '\n\n' + priorStr;
                    }
                } catch (err) {
                    logger.warn('[DialogRequestProcessor] CognitionBase injection failed', { error: String(err) });
                }

                // -- HIERARCHICAL DESIGN RESONER (ADR-0061) --
                const taskText = (ctx['task'] as string) || (ctx['message'] as string) || '';
                const isUITask = /ui|component|style|design|vue|react|html|css|layout|aesthetic|premium/i.test(taskText);
                if (isUITask) {
                    try {
                        const manifesto = await globalDesignReasoner.generateManifesto(taskText, ctx);
                        ctx['message'] = `[DESIGN_MANIFESTO_INJECTED]\n${manifesto.raw_manifesto}\n\n[USER_TASK]\n${ctx['message']}`;
                        logger.info('[DialogRequestProcessor] Design manifesto injected into message');
                    } catch (err) {
                        logger.warn('[DialogRequestProcessor] DesignReasoner failed', { error: String(err) });
                    }
                }
                }

                const llmResult = await executeLlmCall({
                    promptsTransformsPath: this.promptsTransformsPath,
                    schemaName,
                    ctx,
                    promiseId,
                    base: aiHubUrl,
                    model,
                });

                if (!llmResult.success || !llmResult.responseMd) {
                    // For initial dialog (no history), use request transform execute as fallback (initial form)
                    // For follow-up (has history), do NOT return form - return error or async pending
                    const hasHistoryForFallback = Array.isArray(ctx['history']) && ctx['history'].length > 0;
                    if (
                        !hasHistoryForFallback &&
                        llmResult.requestTransformExecute &&
                        Object.keys(llmResult.requestTransformExecute).length > 0
                    ) {
                        return {
                            outcome: 'success',
                            execute: llmResult.requestTransformExecute,
                            context: {
                                ...ctx,
                                ...((llmResult.requestTransformContext as Record<string, unknown>) ?? {}),
                            } as unknown as RequestContextBlock,
                        };
                    }
                    return dialogFailedWithContext(ctx, llmResult.error || 'LLM call failed');
                }

                const grayRoomResult = await this.grayRoom.runLoop(
                    ctx,
                    schemaName,
                    llmResult.responseMd,
                    promiseId,
                    false,
                    grayRoomChain
                );

                if (
                    grayRoomResult.context &&
                    typeof grayRoomResult.context === 'object' &&
                    !Array.isArray(grayRoomResult.context)
                ) {
                    const sessionIdValue = ctx['session_id'];
                    if (sessionIdValue && typeof sessionIdValue === 'string') {
                        grayRoomResult.context = {
                            ...grayRoomResult.context,
                            session_id: sessionIdValue,
                        };
                    }
                }

                ensureDialogExecuteWhenMissing(grayRoomResult, schemaName, llmResult.responseMd);

                return grayRoomResult;
            }

            return dialogFailedWithContext(ctx, 'Unexpected dialog state (llmPromiseId still set)');
        } catch (err) {
            logger.error('[DialogRequestProcessor] Failed', {error: String(err)});
            return dialogFailedWithContext(
                ctx,
                err instanceof Error ? err.message : String(err)
            );
        }
    }
}

export const dialogRequestProcessor = new DialogRequestProcessor();
