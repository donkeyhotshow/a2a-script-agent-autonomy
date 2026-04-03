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
import type {RequestContext, ProcessResult} from './request-processor.interfaces.js';
import {BaseRequestProcessor, type RequestType} from './base-processor.js';
import {
    GrayRoomOrchestrator,
    isDialogToolExecutePayload,
    readGrayRoomInterruptBudget,
    shouldUseGrayRoom
} from './gray-room-orchestrator.js';
import {
    resolveTransformSchema,
    normalizeContext,
    extractSchemaName
} from './normalization.js';
import {resolveLlmModelFromContext} from './llm-model-resolver.js';

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
const DEFAULT_MODEL = 'glm-4.7-flash';

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
        // Preserve projectId from original context if it exists
        if (context.projectId) {
            ctx.projectId = context.projectId;
        }
        // Preserve session_id from original context if it exists
        if (context.session_id) {
            ctx.session_id = context.session_id;
        }
        const grayRoomChain = shouldUseGrayRoom(ctx).shouldTrigger;
        const schema = resolveTransformSchema(ctx);

        if (!schema) {
            return {outcome: 'failed', error: 'transformSchema required'} as ProcessResult;
        }

        const schemaName = extractSchemaName(schema);
        const aiHubUrl = process.env.AI_HUB_URL || DEFAULT_AI_HUB;
        const model = resolveLlmModelFromContext(ctx, process.env.LLM_MODEL || process.env.Z_AI_MODEL || process.env.OLLAMA_MODEL || DEFAULT_MODEL);

        logger.info('[DialogRequestProcessor] Processing', {promiseId});

        const existingLlmId = ctx['llmPromiseId'] as string | undefined;

        try {
            if (existingLlmId) {
                // Восстановление из существующего promise
                const {recoverDialogFromLlmPromise} = await import('./response-path.js');
                const recoveryResult = await recoverDialogFromLlmPromise(
                    promiseId,
                    ctx,
                    existingLlmId
                );

                if (!recoveryResult) {
                    return {outcome: 'failed', error: 'LLM recovery failed'} as ProcessResult;
                }

                if (!recoveryResult.success) {
                    return {outcome: 'failed', error: recoveryResult.error || 'LLM recovery failed'} as ProcessResult;
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
                
                // Include sessionId in returned context if session_id exists in input
                if (grayRoomResult.context && typeof grayRoomResult.context === 'object' && !Array.isArray(grayRoomResult.context)) {
                    const sessionIdValue = ctx['session_id'];
                    if (sessionIdValue && typeof sessionIdValue === 'string') {
                        grayRoomResult.context = {
                            ...grayRoomResult.context,
                            sessionId: sessionIdValue
                        };
                    }
                }
                
                return grayRoomResult;
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
                return {outcome: 'failed', error: llmResult.error || 'LLM call failed'} as ProcessResult;
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
            
            // Include sessionId, projectId, and client sessionId in returned context
            if (grayRoomResult.context && typeof grayRoomResult.context === 'object' && !Array.isArray(grayRoomResult.context)) {
                const sessionIdValue = ctx['session_id'];
                if (sessionIdValue && typeof sessionIdValue === 'string') {
                    grayRoomResult.context = {
                        ...grayRoomResult.context,
                        session_id: sessionIdValue
                    };
                }
                if (typeof ctx.projectId === 'string') {
                    (grayRoomResult.context as any).projectId = ctx.projectId;
                }
                if (typeof ctx.sessionId === 'string') {
                    (grayRoomResult.context as any).sessionId = ctx.sessionId;
                }
            }
            
            return grayRoomResult;
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
