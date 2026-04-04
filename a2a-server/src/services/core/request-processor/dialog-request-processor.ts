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
    readGrayRoomInterruptBudget,
    shouldUseGrayRoom
} from './gray-room-trigger.js';
import {resolveTransformSchema, normalizeContext, extractSchemaName, resolveResultObject} from './normalization.js';
import {resolveLlmModelFromContext} from './llm-model-resolver.js';
import {CognitionBase} from './cognition-base.js';
import {EpisodicMemory} from '../memory/episodic-memory.js';
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
    type ResponsePathResult
} from './response-path.js';

const DEFAULT_AI_HUB = 'http://localhost:11434';

function dialogFailedWithContext(ctx: Record<string, unknown>, error: string): ProcessResult {
    return {
        outcome: 'failed',
        error,
        context: ctx as unknown as RequestContextBlock,
    };
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
        const aiHubUrl = process.env.AI_HUB_URL || DEFAULT_AI_HUB;
        const model = resolveLlmModelFromContext(ctx);

        logger.info('[DialogRequestProcessor] Processing', {promiseId});

        const existingLlmId = ctx['llmPromiseId'] as string | undefined;

        try {
            // Check for dialog schema without user input to return initial form directly
            if (schemaName === 'dialog' && !resolveResultObject(ctx)?.message) {
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

            if (existingLlmId) {
                // Восстановление из существующего promise
                const {recoverDialogFromLlmPromise} = await import('./response-path.js');
                const recoveryResult = await recoverDialogFromLlmPromise(
                    promiseId,
                    ctx,
                    existingLlmId
                );

                if (!recoveryResult) {
                    return dialogFailedWithContext(ctx, 'LLM recovery failed');
                }

                if (!recoveryResult.success) {
                    return dialogFailedWithContext(ctx, recoveryResult.error || 'LLM recovery failed');
                }

                // Получаем responseMd из контекста (gray room уже обработал ответ)
                const responseMd = ctx['lastLlmResponse'] as string || '';

                const grayRoomResult = this.grayRoom.runLoop(
                    ctx,
                    schemaName,
                    responseMd,
                    promiseId,
                    false,
                    grayRoomChain
                );

                return grayRoomResult;
            }

            if (!existingLlmId) {
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
                model
            });

            if (!llmResult.success || !llmResult.responseMd) {
                return dialogFailedWithContext(ctx, llmResult.error || 'LLM call failed');
            }

            // Запускаем gray room loop с ответом от LLM
            const grayRoomResult = this.grayRoom.runLoop(
                ctx,
                schemaName,
                llmResult.responseMd,
                promiseId,
                false,
                grayRoomChain
            );
            
            if (grayRoomResult.context && typeof grayRoomResult.context === 'object' && !Array.isArray(grayRoomResult.context)) {
                const sessionIdValue = ctx['session_id'];
                if (sessionIdValue && typeof sessionIdValue === 'string') {
                    grayRoomResult.context = {
                        ...grayRoomResult.context,
                        session_id: sessionIdValue
                    };
                }
            }

            return grayRoomResult;
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
