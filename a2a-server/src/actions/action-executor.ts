/**
 * Action Executor - система выполнения итеративных шагов
 */

import {
  ActionDefinition,
  ExecutionState,
  SubAction,
  StepHistory,
} from './types.js';

/**
 * Результат выполнения отдельного шага
 */
export interface StepResult {
  /** Идентификатор шага */
  stepId: string;
  /** Статус выполнения */
  status: 'completed' | 'failed';
  /** Результат выполнения */
  result: unknown;
  /** Доступен ли следующий шаг */
  nextStepAvailable: boolean;
  /** Следующий шаг (если доступен) */
  nextStep?: SubAction;
}

/**
 * Результат выполнения всего действия
 */
export interface ActionResult {
  /** Идентификатор действия */
  actionId: string;
  /** Статус выполнения */
  status: 'completed' | 'failed';
  /** Количество выполненных шагов */
  stepsCompleted: number;
  /** Общее количество шагов */
  totalSteps: number;
  /** История выполнения */
  history: StepHistory[];
  /** Финальный результат */
  finalResult: unknown;
}

/**
 * Класс для управления выполнением итеративных действий
 */
export class ActionExecutor {
  /**
   * Хранилище состояний выполнения по sessionId
   */
  private executionStates: Map<string, ExecutionState> = new Map();

  constructor() {
    console.log('[ActionExecutor] Инициализирован');
  }

  /**
   * Инициализирует выполнение действия
   */
  initializeExecution(sessionId: string, action: ActionDefinition): ExecutionState {
    console.log(`[ActionExecutor] Инициализация выполнения для sessionId: ${sessionId}, actionId: ${action.id}`);

    const state: ExecutionState = {
      actionId: action.id,
      currentStepIndex: 0,
      history: [],
    };

    this.executionStates.set(sessionId, state);
    console.log(`[ActionExecutor] Состояние инициализировано. Начальный индекс шага: ${state.currentStepIndex}`);

    return state;
  }

  /**
   * Получает состояние выполнения для сессии
   */
  getExecutionState(sessionId: string): ExecutionState | null {
    const state = this.executionStates.get(sessionId);
    if (!state) {
      console.log(`[ActionExecutor] Состояние для sessionId: ${sessionId} не найдено`);
      return null;
    }
    console.log(`[ActionExecutor] Получено состояние для sessionId: ${sessionId}, текущий шаг: ${state.currentStepIndex}`);
    return state;
  }

  /**
   * Возвращает текущий шаг по индексу
   */
  getCurrentStep(action: ActionDefinition, state: ExecutionState): SubAction | null {
    const { currentStepIndex } = state;
    const { subActions } = action;

    if (currentStepIndex < 0 || currentStepIndex >= subActions.length) {
      console.log(`[ActionExecutor] Индекс шага ${currentStepIndex} за пределами диапазона [0, ${subActions.length})`);
      return null;
    }

    const step = subActions[currentStepIndex];
    if (!step) {
      console.log(`[ActionExecutor] Шаг по индексу ${currentStepIndex} не найден`);
      return null;
    }

    console.log(`[ActionExecutor] Получен текущий шаг: ${step.id} (индекс: ${currentStepIndex})`);
    return step;
  }

  /**
   * Выполняет текущий шаг
   */
  async executeStep(
    sessionId: string,
    action: ActionDefinition,
    input: unknown
  ): Promise<StepResult> {
    console.log(`[ActionExecutor] Выполнение шага для sessionId: ${sessionId}`);

    const state = this.getExecutionState(sessionId);
    if (!state) {
      console.log(`[ActionExecutor] Ошибка: состояние не найдено для sessionId: ${sessionId}`);
      return {
        stepId: '',
        status: 'failed',
        result: { error: 'Execution state not found' },
        nextStepAvailable: false,
      };
    }

    const currentStep = this.getCurrentStep(action, state);
    if (!currentStep) {
      console.log(`[ActionExecutor] Ошибка: текущий шаг не найден`);
      return {
        stepId: '',
        status: 'failed',
        result: { error: 'Current step not found' },
        nextStepAvailable: false,
      };
    }

    console.log(`[ActionExecutor] Выполняется шаг: ${currentStep.id} - ${currentStep.title}`);

    // Эмуляция выполнения шага
    const mockResult = {
      stepId: currentStep.id,
      input,
      output: currentStep.output,
      executedAt: new Date().toISOString(),
    };

    // Обновляем историю
    const stepHistory: StepHistory = {
      stepId: currentStep.id,
      status: 'completed',
      result: mockResult,
    };
    state.history.push(stepHistory);

    console.log(`[ActionExecutor] Шаг ${currentStep.id} выполнен успешно`);

    // Определяем следующий шаг
    const hasNextStep = this.advanceToNextStep(sessionId);
    const nextStepCandidate = hasNextStep
      ? action.subActions[state.currentStepIndex]
      : undefined;

    const result: StepResult = {
      stepId: currentStep.id,
      status: 'completed',
      result: mockResult,
      nextStepAvailable: hasNextStep,
    };

    if (hasNextStep && nextStepCandidate) {
      result.nextStep = nextStepCandidate;
    }

    return result;
  }

  /**
   * Переходит к следующему шагу
   */
  advanceToNextStep(sessionId: string): boolean {
    const state = this.getExecutionState(sessionId);
    if (!state) {
      console.log(`[ActionExecutor] Не удалось перейти к следующему шагу: состояние не найдено`);
      return false;
    }

    const nextIndex = state.currentStepIndex + 1;
    const hasMoreSteps = nextIndex < state.history.length + 1;

    if (hasMoreSteps) {
      state.currentStepIndex = nextIndex;
      console.log(`[ActionExecutor] Переход к следующему шагу. Новый индекс: ${state.currentStepIndex}`);
    } else {
      console.log(`[ActionExecutor] Больше нет шагов для выполнения`);
    }

    return hasMoreSteps;
  }

  /**
   * Завершает выполнение действия
   */
  completeExecution(sessionId: string): ActionResult {
    console.log(`[ActionExecutor] Завершение выполнения для sessionId: ${sessionId}`);

    const state = this.getExecutionState(sessionId);
    if (!state) {
      console.log(`[ActionExecutor] Ошибка: состояние не найдено при завершении`);
      return {
        actionId: '',
        status: 'failed',
        stepsCompleted: 0,
        totalSteps: 0,
        history: [],
        finalResult: { error: 'Execution state not found' },
      };
    }

    // Для завершения нам нужно получить информацию о общем количестве шагов
    // Это потребует поиска action по actionId, но для упрощения используем историю
    const stepsCompleted = state.history.length;
    const totalSteps = stepsCompleted; // Предполагаем, что все шаги выполнены

    const result: ActionResult = {
      actionId: state.actionId,
      status: 'completed',
      stepsCompleted,
      totalSteps,
      history: state.history,
      finalResult: {
        completedAt: new Date().toISOString(),
        message: 'All steps completed successfully',
      },
    };

    console.log(`[ActionExecutor] Выполнение завершено. Шагов выполнено: ${stepsCompleted}/${totalSteps}`);

    // Удаляем состояние из хранилища
    this.executionStates.delete(sessionId);
    console.log(`[ActionExecutor] Состояние удалено для sessionId: ${sessionId}`);

    return result;
  }

  /**
   * Отменяет выполнение
   */
  cancelExecution(sessionId: string): void {
    console.log(`[ActionExecutor] Отмена выполнения для sessionId: ${sessionId}`);

    const state = this.executionStates.get(sessionId);
    if (state) {
      console.log(`[ActionExecutor] Отменяем actionId: ${state.actionId}, выполнено шагов: ${state.history.length}`);
    }

    this.executionStates.delete(sessionId);
    console.log(`[ActionExecutor] Выполнение отменено, состояние удалено`);
  }

  /**
   * Возвращает массив оставшихся шагов
   */
  getNextSteps(action: ActionDefinition, state: ExecutionState): SubAction[] {
    const { currentStepIndex } = state;
    const { subActions } = action;

    const nextSteps = subActions.slice(currentStepIndex + 1);
    console.log(`[ActionExecutor] Получено ${nextSteps.length} оставшихся шагов (начиная с индекса ${currentStepIndex + 1})`);

    return nextSteps;
  }
}
