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
import type {ContextBlock, ServerMessage, Task, TaskStatus, TaskType} from '../types/index.js';

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

        if (matches.length === 0 || !matches[0]) {
            return {
                continue: false,
                message: this.buildMessage(sessionId, 'completed', 100, `No suitable action found for task: ${taskDescription}`, {
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
                message: this.buildMessage(sessionId, 'completed', 100, response?.message || 'Action completed'),
            };
        }

        if (response.outcome === 'failed') {
            return {
                continue: false,
                message: this.buildMessage(sessionId, 'failed', 0, response.error || 'Step failed'),
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
            message: this.buildMessage(sessionId, 'in_progress', progress, response.message ?? 'Step in progress', {
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
                message: this.buildMessage(sessionId, 'failed', 0, response?.error || `Failed to start action: ${actionId}`),
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

    /** action_executing ответ после approve_action — только canonical execute + context.execution */
    private buildActionExecutingMessage(
        sessionId: string,
        actionId: string,
        response: ActionResponseSimulation,
        executingAction: SubAction | undefined,
        _nextSteps: Array<{ actionId: string; title: string }>
    ): ServerMessage {
        const stepId = executingAction?.id ?? 'start';
        const context: ContextBlock = {
            version: PROTOCOL_VERSION,
            session_id: sessionId,
            execution: {
                action: actionId,
                step: stepId,
            },
        };

        const out: ServerMessage = {
            context,
            message: response.message,
        };

        if (executingAction?.code) {
            out.execute = {
                script: {
                    input: {},
                    output: 'step_result',
                    code: executingAction.code,
                },
            };
        }

        return out;
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
    ): ServerMessage {
        // Для action_proposal НЕ добавляем tasks с in_progress - это соответствует Gold Standard
        const context: ContextBlock = {
            version: PROTOCOL_VERSION,
            session_id: sessionId,
        };

        const firstStep = match.action.subActions[0];

        const out: ServerMessage = {
            context: {
                ...context,
                execution: {
                    action: match.action.id,
                    step: firstStep?.id ?? 'start',
                },
            },
            message: response.message,
        };

        if (firstStep?.code) {
            out.execute = {
                script: {
                    input: {},
                    output: 'step_result',
                    code: firstStep.code,
                },
            };
        }

        return out;
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
    ): ServerMessage {
        const tasks = extra?.tasks ?? [
            {
                id: extra?.taskId ?? 'action',
                type: extra?.taskType ?? 'analyze',
                status,
                progress,
            },
        ];

        const context: ContextBlock = {
            version: PROTOCOL_VERSION,
            session_id: sessionId,
            tasks,
            ...(extra?.execution ? {execution: extra.execution} : {}),
        };

        const out: ServerMessage = {
            context,
            message,
        };

        if (extra?.execute) {
            out.execute = extra.execute;
        }

        return out;
    }
}

// Singleton
export const actionProcessor = new ActionProcessor();

export default actionProcessor;
