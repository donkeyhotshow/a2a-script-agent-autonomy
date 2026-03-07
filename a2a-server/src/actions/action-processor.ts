/**
 * Action Processor - обработка actions без AI
 *
 * Реализация на основе плана: plans/action-scripts-integration.md
 *
 * Для use-case "no-ai" - выполняет actions из MD файлов
 *
 * Поток:
 * 1. Клиент отправляет task_request
 * 2. ActionRegistry ищет подходящий action
 * 3. Возвращаем action_proposal с первым шагом и кодом
 * 4. Клиент выполняет код, отправляет результат
 * 5. Переходим к следующему шагу
 */

import {ActionService, ActionResponseSimulation} from './action-service.js';
import {ActionDefinition, SubAction} from './types.js';
import type {ContextBlock, ServerMessage} from '../types/index.js';

const PROTOCOL_VERSION = '1.0.0';

/**
 * Результат обработки action
 */
export interface ActionProcessorResult {
    /** Нужно ли продолжать обработку */
    continue: boolean;
    /** Сообщение для клиента */
    message: ServerMessage;
    /** Action ID если найден */
    actionId?: string;
    /** Текущий шаг */
    currentStep?: SubAction;
    /** Код для выполнения на клиенте */
    code?: string;
}

/**
 * Action Processor class
 */
export class ActionProcessor {
    private actionService: ActionService;
    private initialized: boolean = false;

    constructor() {
        this.actionService = new ActionService();
    }

    /**
     * Инициализация - загрузка actions
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        await this.actionService.initialize();
        this.initialized = true;
    }

    /**
     * Обработать запрос задачи
     */
    async processTaskRequest(
        sessionId: string,
        taskDescription: string
    ): Promise<ActionProcessorResult> {
        await this.initialize();

        // Ищем подходящий action
        const matches = this.actionService.findActions(taskDescription);

        if (matches.length === 0) {
            return {
                continue: false,
                message: this.buildNoActionMessage(sessionId, taskDescription),
            };
        }

        const bestMatch = matches[0];
        if (!bestMatch) {
            return {
                continue: false,
                message: this.buildNoActionMessage(sessionId, taskDescription),
            };
        }

        // Начинаем выполнение
        const response = this.actionService.startExecution(sessionId, bestMatch.action.id);

        // Получаем первый шаг с кодом
        const action = bestMatch.action;
        const firstStep = action.subActions[0];

        return {
            continue: true,
            message: this.buildActionProposalMessage(sessionId, bestMatch, response),
            actionId: action.id,
            ...(firstStep ? {currentStep: firstStep} : {}),
            ...(firstStep?.code ? {code: firstStep.code} : {}),
        };
    }

    /**
     * Обработать результат выполнения шага от клиента
     */
    async processStepResult(
        sessionId: string,
        _stepId: string,
        result: unknown
    ): Promise<ActionProcessorResult> {
        await this.initialize();

        // Выполняем следующий шаг
        const response = await this.actionService.executeCurrentStep(sessionId, result);

        if (!response || response.outcome === 'completed') {
            return {
                continue: false,
                message: this.buildSessionCompleteMessage(sessionId, response.message || 'Action completed'),
            };
        }

        if (response.outcome === 'failed') {
            return {
                continue: false,
                message: this.buildErrorMessage(sessionId, response.error || 'Step failed'),
            };
        }

        // Получаем текущий шаг
        const currentStep = response.executingAction;

        return {
            continue: true,
            message: this.buildStepMessage(sessionId, response),
            ...(currentStep ? {currentStep} : {}),
            ...(currentStep?.code ? {code: currentStep.code} : {}),
        };
    }

    /**
     * Подтвердить выполнение конкретного action (approve_action)
     */
    async approveAction(
        sessionId: string,
        actionId: string
    ): Promise<ActionProcessorResult> {
        await this.initialize();

        // Начинаем выполнение указанного action
        const response = this.actionService.startExecution(sessionId, actionId);

        if (!response || response.outcome === 'failed') {
            return {
                continue: false,
                message: this.buildErrorMessage(sessionId, response?.error || `Failed to start action: ${actionId}`),
            };
        }

        // Получаем текущий шаг
        const executingAction = response.executingAction;

        // Build nextSteps from remaining subActions
        const actionDef = this.actionService.getAction(actionId);
        const nextSteps = actionDef?.subActions.slice(1).map(sa => ({
            actionId: sa.id,
            title: sa.title,
        })) || [];

        return {
            continue: true,
            message: this.buildActionExecutingMessage(sessionId, actionId, response, executingAction, nextSteps),
            actionId,
            ...(executingAction ? {currentStep: executingAction} : {}),
        };
    }

    /**
     * Построить сообщение для action_executing ответа (approve_action)
     */
    /**
     * @deprecated Используйте новый формат с execute.form и execute.script
     */
    private buildActionExecutingMessage(
        sessionId: string,
        actionId: string,
        response: ActionResponseSimulation,
        /** @deprecated Используйте `execute.script` */
        executingAction: SubAction | undefined,
        /** @deprecated Используйте `execute.form.choices` */
        nextSteps: Array<{ actionId: string; title: string }>
    ): ServerMessage {
        const context: ContextBlock = {
            version: PROTOCOL_VERSION,
            session_id: sessionId,
            execution: {
                actionId,
                currentActionId: executingAction?.id || '',
                history: [],
            },
        };

        /** @deprecated Используйте `execute.form.choices` */
        const result: ServerMessage = {
            context,
            message: response.message,
            nextSteps,
        };

        // Add executingAction if available
        if (executingAction) {
            /** @deprecated Используйте `execute` с action-type ключами */
            result.executingAction = {
                actionId: executingAction.id,
                title: executingAction.title,
                description: executingAction.description,
                priority: executingAction.priority,
                dsl: executingAction.dsl as unknown as Record<string, unknown> | undefined,
                dslScript: executingAction.code,
            };
        }

        return result;
    }

    /**
     * Завершить выполнение
     */
    async completeExecution(sessionId: string): Promise<void> {
        await this.initialize();
        this.actionService.completeExecution(sessionId);
    }

    // ============================================
    // Message Builders
    // ============================================

    private buildNoActionMessage(sessionId: string, task: string): ServerMessage {
        const context: ContextBlock = {
            version: PROTOCOL_VERSION,
            session_id: sessionId,
            tasks: [
                {
                    id: 'action-search',
                    type: 'analyze',
                    status: 'completed',
                    progress: 100,
                },
            ],
        };

        return {
            context,
            message: `No suitable action found for task: ${task}`,
        };
    }

    private buildActionProposalMessage(
        sessionId: string,
        match: { action: ActionDefinition; matchScore: number },
        response: ActionResponseSimulation
    ): ServerMessage {
        // Для action_proposal НЕ добавляем tasks с in_progress - это соответствует Gold Standard
        const context: ContextBlock = {
            version: PROTOCOL_VERSION,
            session_id: sessionId,
        };

        const firstStep = match.action.subActions[0];

        return {
            context,
            message: response.message,
            // Добавляем данные для клиента в произвольные поля
            // Клиент должен понимать этот формат
            action: {
                id: match.action.id,
                title: match.action.title,
                matchScore: match.matchScore,
                currentStep: firstStep ? {
                    id: firstStep.id,
                    title: firstStep.title,
                    ...(firstStep.code ? {code: firstStep.code} : {}),
                } : null,
                nextSteps: match.action.subActions.slice(1).map(s => ({
                    id: s.id,
                    title: s.title,
                })),
            },
        };
    }

    private buildStepMessage(
        sessionId: string,
        response: ActionResponseSimulation
    ): ServerMessage {
        const context: ContextBlock = {
            version: PROTOCOL_VERSION,
            session_id: sessionId,
            tasks: [
                {
                    id: response.actionDefinition?.id || 'unknown',
                    type: 'analyze',
                    status: 'in_progress',
                    progress: Math.round((response.executionState?.currentStepIndex || 0) /
                        ((response.actionDefinition?.subActions.length || 1)) * 100),
                },
            ],
        };

        return {
            context,
            message: response.message,
            action: {
                currentStep: response.executingAction ? {
                    id: response.executingAction.id,
                    title: response.executingAction.title,
                    ...(response.executingAction.code ? {code: response.executingAction.code} : {}),
                } : null,
                nextSteps: response.nextSteps?.map(s => ({
                    id: s.id,
                    title: s.title,
                })) || [],
            },
        };
    }

    private buildSessionCompleteMessage(sessionId: string, summary: string): ServerMessage {
        const context: ContextBlock = {
            version: PROTOCOL_VERSION,
            session_id: sessionId,
            tasks: [
                {
                    id: 'action',
                    type: 'analyze',
                    status: 'completed',
                    progress: 100,
                },
            ],
        };

        return {
            context,
            message: summary,
        };
    }

    private buildErrorMessage(sessionId: string, error: string): ServerMessage {
        const context: ContextBlock = {
            version: PROTOCOL_VERSION,
            session_id: sessionId,
            tasks: [
                {
                    id: 'action',
                    type: 'analyze',
                    status: 'failed',
                    progress: 0,
                },
            ],
        };

        return {
            context,
            message: error,
        };
    }
}

// Singleton
export const actionProcessor = new ActionProcessor();

export default actionProcessor;
