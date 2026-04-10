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

import {ActionService, ActionResponseSimulation} from './action-service.ts';
import {ActionDefinition, SubAction} from './types.js';
import type {ContextBlock, ServerMessage, Task, TaskStatus, TaskType} from '@a2a/server-protocol/types.js';

/**
 * Результат обработки action
 */
export interface ActionProcessorResult {
    /** Нужно ли продолжать обработку */
    continue: boolean;
    /** Сообщение для клиента */
    message: string;
    context?: ContextBlock;
    execute?: ServerMessage['execute'];
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

        if (matches.length === 0 || !matches[0]) {
            return {
                continue: false,
                ...this.buildMessage(sessionId, 'completed', 100, `No suitable action found for task: ${taskDescription}`, {
                    taskId: 'action-search',
                }),
            };
        }

        const bestMatch = matches[0];

        // Начинаем выполнение
        const response = this.actionService.startExecution(sessionId, bestMatch.action.id);

        // Получаем первый шаг с кодом
        const action = bestMatch.action;
        const firstStep = action.subActions[0];

        return {
            continue: true,
            ...this.buildActionProposalMessage(sessionId, bestMatch, response),
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
                ...this.buildMessage(sessionId, 'completed', 100, response?.message || 'Action completed'),
            };
        }

        if (response.outcome === 'failed') {
            return {
                continue: false,
                ...this.buildMessage(sessionId, 'failed', 0, response.error || 'Step failed'),
            };
        }

        const currentStep = response.executingAction;
        const execAction = response.actionDefinition?.id || 'unknown';
        const stepId = currentStep?.id || 'start';
        const totalSteps = Math.max(response.actionDefinition?.subActions.length || 1, 1);
        const progress = Math.round(((response.executionState?.currentStepIndex ?? 0) / totalSteps) * 100);
        const executeCommand = currentStep?.code
            ? {
                script: {
                    input: {},
                    output: 'step_result',
                    code: currentStep.code,
                },
            }
            : undefined;

        return {
            continue: true,
            ...this.buildMessage(sessionId, 'in_progress', progress, response.message ?? 'Step in progress', {
                taskId: execAction,
                execution: {
                    action: execAction,
                    step: stepId,
                },
                execute: executeCommand,
            }),
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
                ...this.buildMessage(sessionId, 'failed', 0, response?.error || `Failed to start action: ${actionId}`),
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
            ...this.buildActionExecutingMessage(sessionId, actionId, response, executingAction),
            actionId,
            ...(executingAction ? {currentStep: executingAction} : {}),
        };
    }

    /** action_executing ответ после approve_action — только canonical execute + context.execution */
    private buildActionExecutingMessage(
        sessionId: string,
        actionId: string,
        response: ActionResponseSimulation,
        executingAction: SubAction | undefined,
        _nextSteps: Array<{ actionId: string; title: string }>
    ): Pick<ActionProcessorResult, 'message' | 'context' | 'execute'> {
        const stepId = executingAction?.id ?? 'start';
        // NOTE: client-visible protocol must not include client session ids or version fields.
        // ActionProcessor still uses `sessionId` internally as an in-memory key.
        const context: ContextBlock = { execution: { action: actionId, step: stepId } };

        return {
            message: response.message,
            context,
            execute: executingAction?.code
                ? {
                      script: {
                          input: {},
                          output: 'step_result',
                          code: executingAction.code,
                      },
                  }
                : undefined,
        };
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

    private buildActionProposalMessage(
        sessionId: string,
        match: { action: ActionDefinition; matchScore: number },
        response: ActionResponseSimulation
    ): Pick<ActionProcessorResult, 'message' | 'context' | 'execute'> {
        // Для action_proposal НЕ добавляем tasks с in_progress - это соответствует Gold Standard
        // NOTE: do not leak client session identifiers.
        const context: ContextBlock = {};

        const firstStep = match.action.subActions[0];

        return {
            message: response.message,
            context: {
                ...context,
                execution: {
                    action: match.action.id,
                    step: firstStep?.id ?? 'start',
                },
            },
            execute: firstStep?.code
                ? {
                      script: {
                          input: {},
                          output: 'step_result',
                          code: firstStep.code,
                      },
                  }
                : undefined,
        };
    }

    private buildMessage(
        sessionId: string,
        status: TaskStatus,
        progress: number,
        message: string,
        extra?: {
            taskId?: string;
            taskType?: TaskType;
            execution?: ContextBlock['execution'];
            execute?: ServerMessage['execute'];
            tasks?: Task[];
        }
    ): Pick<ActionProcessorResult, 'message' | 'context' | 'execute'> {
        const tasks = extra?.tasks ?? [
            {
                id: extra?.taskId ?? 'action',
                type: extra?.taskType ?? 'analyze',
                status,
                progress,
            },
        ];

        // NOTE: `sessionId` is internal-only. Client correlates steps via promiseId, not sessionId.
        const context: ContextBlock = {
            tasks,
            ...(extra?.execution ? {execution: extra.execution} : {}),
        };

        return {
            message,
            context,
            execute: extra?.execute,
        };
    }
}

// Singleton
export const actionProcessor = new ActionProcessor();

export default actionProcessor;
