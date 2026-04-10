/**
 * Action Service - интеграция всех компонентов системы действий
 *
 * Реализация на основе плана: plans/action-scripts-integration.md
 */

import * as path from 'path';
import { ActionDefinition, ActionMatch, ActionOutcome, ExecutionState, SubAction } from './types.js';
import { ActionRegistry, actionRegistry } from './action-registry.js';
import { ActionExecutor, StepResult } from './action-executor.ts';
import { logger } from '../../lib/logger.js';

/**
 * Расширенный формат ответа для симуляции
 * Включает дополнительные поля для UI и отладки
 */
export interface ActionResponseSimulation {
    /** Тип результата */
    outcome: ActionOutcome;
    /** Описание результата */
    message: string;
    /** Контекст выполнения */
    context?: {
        task?: string;
        execution?: ExecutionState;
        [key: string]: unknown;
    };
    /** Текущее выполняемое действие (внутренний формат симуляции action-service) */
    executingAction?: SubAction;
    /** Следующие шаги (внутренний формат) */
    nextSteps?: SubAction[];
    /** Результат поиска (для action_proposal) */
    action?: ActionMatch;
    /** Состояние выполнения */
    executionState?: ExecutionState;
    /** Определение действия */
    actionDefinition?: ActionDefinition;
    /** Сообщение об ошибке */
    error?: string;
    /** Дополнительные метаданные */
    metadata?: Record<string, unknown>;
}

/**
 * Основной класс сервиса действий
 * Интегрирует реестр и исполнитель действий
 */
export class ActionService {
    private registry: ActionRegistry;
    private executor: ActionExecutor;
    private initialized: boolean = false;

    /**
     * Создать новый ActionService
     * @param registry - опциональный экземпляр реестра действий
     * @param executor - опциональный экземпляр исполнителя действий
     */
    constructor(registry?: ActionRegistry, executor?: ActionExecutor) {
        this.registry = registry || actionRegistry;
        this.executor = executor || new ActionExecutor();
    }

    async initialize(): Promise<void> {
        if (this.initialized) return;
        try {
            await this.registry.loadFromDirectory(path.resolve(process.cwd(), 'packages/actions/src/definitions'));
            this.initialized = true;
        } catch (error) {
            logger.error('[ActionService] Init error:', error);
            throw error;
        }
    }

    /**
     * Находит действия по описанию задачи
     * @param taskDescription - описание задачи
     * @returns отсортированный массив совпадений
     */
    findActions(taskDescription: string): ActionMatch[] {
        const matches = this.registry.findAction(taskDescription);

        // Сортировка уже выполняется в registry, но на всякий случай
        matches.sort((a, b) => b.matchScore - a.matchScore);

        return matches;
    }

    /**
     * Получает действие по ID
     * @param actionId - идентификатор действия
     * @returns определение действия или null
     */
    getAction(actionId: string): ActionDefinition | null {
        return this.registry.getAction(actionId);
    }

    /**
     * Начинает выполнение действия
     * @param sessionId - идентификатор сессии
     * @param actionId - идентификатор действия
     * @returns ответ с статусом action_executing
     */
    startExecution(sessionId: string, actionId: string): ActionResponseSimulation {
        const action = this.registry.getAction(actionId);
        if (!action) {
            return createActionResponse({
                outcome: 'failed',
                message: `Действие с ID ${actionId} не найдено`,
                error: 'Action not found',
            });
        }

        // Инициализируем выполнение
        const state = this.executor.initializeExecution(sessionId, action);

        // Получаем текущий шаг
        const currentStep = this.executor.getCurrentStep(action, state);
        if (!currentStep) {
            return createActionResponse({
                outcome: 'failed',
                message: 'Не удалось получить первый шаг для выполнения',
                error: 'No steps available',
                actionDefinition: action,
            });
        }

        const nextSteps = this.executor.getNextSteps(action, state);

        return createActionResponse({
            outcome: 'action_executing',
            message: 'Экшен принят. Начинаем выполнение первого шага.',
            ...(currentStep ? { executingAction: currentStep } : {}),
            nextSteps,
            actionDefinition: action,
            executionState: state,
            context: {
                execution: state,
            },
        });
    }

    /**
     * Выполняет текущий шаг
     * @param sessionId - идентификатор сессии
     * @param input - входные данные для шага
     * @returns обновленный ответ
     */
    async executeCurrentStep(
        sessionId: string,
        input?: unknown
    ): Promise<ActionResponseSimulation> {
        const state = this.executor.getExecutionState(sessionId);
        if (!state) {
            return createActionResponse({
                outcome: 'failed',
                message: 'Состояние выполнения не найдено',
                error: 'Execution state not found',
            });
        }

        const action = this.registry.getAction(state.actionId);
        if (!action) {
            return createActionResponse({
                outcome: 'failed',
                message: 'Действие не найдено',
                error: 'Action not found',
                executionState: state,
            });
        }

        // Выполняем шаг
        const stepResult: StepResult = await this.executor.executeStep(sessionId, action, input);

        if (stepResult.status === 'failed') {
            return createActionResponse({
                outcome: 'failed',
                message: `Шаг ${stepResult.stepId} не выполнен: ${stepResult.result}`,
                error: String(stepResult.result),
                actionDefinition: action,
                executionState: state,
            });
        }

        // Проверяем, есть ли следующие шаги
        const updatedState = this.executor.getExecutionState(sessionId);
        if (!updatedState) {
            return createActionResponse({
                outcome: 'completed',
                message: 'Все шаги выполнены',
                actionDefinition: action,
                executionState: state,
            });
        }

        // Получаем информацию о следующем шаге
        const currentStep = this.executor.getCurrentStep(action, updatedState);
        const nextSteps = this.executor.getNextSteps(action, updatedState);

        if (!currentStep && nextSteps.length === 0) {
            // Все шаги выполнены
            return this.completeExecution(sessionId);
        }

        const message = currentStep
            ? `Шаг выполнен. Переходим к следующему: ${currentStep.title}`
            : 'Шаг выполнен. Больше нет шагов.';

        return createActionResponse({
            outcome: 'action_executing',
            message,
            ...(currentStep ? { executingAction: currentStep } : {}),
            nextSteps,
            actionDefinition: action,
            executionState: updatedState,
            context: {
                execution: updatedState,
            },
        });
    }

    /**
     * Получает текущее состояние выполнения
     * @param sessionId - идентификатор сессии
     * @returns состояние выполнения или null
     */
    getExecutionStatus(sessionId: string): ExecutionState | null {
        return this.executor.getExecutionState(sessionId);
    }

    /**
     * Отменяет выполнение
     * @param sessionId - идентификатор сессии
     */
    cancelExecution(sessionId: string): void {
        this.executor.cancelExecution(sessionId);
    }

    /**
     * Завершает выполнение действия
     * @param sessionId - идентификатор сессии
     * @returns финальный ответ
     */
    completeExecution(sessionId: string): ActionResponseSimulation {
        const state = this.executor.getExecutionState(sessionId);
        if (!state) return createActionResponse({ outcome: 'completed', message: 'Already completed' });
        const action = this.registry.getAction(state.actionId);
        const result = this.executor.completeExecution(sessionId);
        return createActionResponse({
            outcome: 'completed',
            message: `Done: ${result.stepsCompleted}/${result.totalSteps} steps`,
            ...(action ? { actionDefinition: action } : {}),
            executionState: state,
            metadata: { stepsCompleted: result.stepsCompleted, totalSteps: result.totalSteps, history: result.history },
        });
    }

}

/**
 * Формирует структуру ответа по формату симуляции
 * @param params - параметры ответа
 * @returns структурированный ответ
 */
export function createActionResponse(params: {
    outcome: ActionOutcome;
    message: string;
    action?: ActionMatch;
    actionDefinition?: ActionDefinition;
    executionState?: ExecutionState;
    executingAction?: SubAction;
    nextSteps?: SubAction[];
    context?: Record<string, unknown>;
    error?: string;
    metadata?: Record<string, unknown>;
}): ActionResponseSimulation {
    const { outcome, message, ...rest } = params;
    const response: ActionResponseSimulation = { outcome, message };
    for (const [k, v] of Object.entries(rest)) {
        if (v !== undefined) (response as unknown as Record<string, unknown>)[k] = v;
    }
    return response;
}

// Экспорт синглтона
let actionServiceInstance: ActionService | null = null;

/**
 * Получить синглтон ActionService
 * @returns экземпляр ActionService
 */
export function getActionService(): ActionService {
    if (!actionServiceInstance) {
        actionServiceInstance = new ActionService();
    }
    return actionServiceInstance;
}

// Экспорт синглтона по умолчанию
export const actionService = getActionService();

// Автоматическая инициализация при импорте
// Запускаем асинхронную инициализацию, не блокируя импорт
if (typeof process !== 'undefined') {
    actionService.initialize().catch((e) => logger.error('[ActionService] Auto-init failed', e));
}
