/**
 * Phase Machine Implementation
 * 
 * Реализация фазовой машины для управления сложными сценариями
 */

import {logger} from '../../../../utils/logger.js';
import {
    Phase,
    ExecutionMode,
    AIStep,
    PhaseState,
    PhaseConfig,
    TransitionResult,
    PHASE_CONFIGS,
} from './types.js';

/**
 * Phase Machine для управления сложными сценариями
 * Интегрирована в ContextManager для удобства
 */
export class PhaseMachine {
    private state: PhaseState;

    constructor(initialContext: Record<string, unknown> = {}, mode: ExecutionMode = 'actions') {
        this.state = {
            currentPhase: 'idle',
            previousPhase: null,
            iterations: {
                idle: 0,
                discovery: 0,
                recognition: 0,
                analysis: 0,
                action: 0,
                validation: 0,
                completed: 0,
            },
            totalIterations: 0,
            startedAt: new Date(),
            phaseStartedAt: new Date(),
            history: [],
            context: initialContext,
            mode,
            currentAction: null,
            currentStep: null,
            availableActions: [],
            llmHistory: [],
        };
    }

    /**
     * Получить текущую фазу
     */
    getCurrentPhase(): Phase {
        return this.state.currentPhase;
    }

    /**
     * Получить режим выполнения
     */
    getMode(): ExecutionMode {
        return this.state.mode;
    }

    /**
     * Установить режим выполнения
     */
    setMode(mode: ExecutionMode): void {
        logger.info('[PhaseMachine] Mode changed', { oldMode: this.state.mode, newMode: mode });
        this.state.mode = mode;
    }

    /**
     * Проверить, работает ли в режиме AI-Actions
     */
    isAIActions(): boolean {
        return this.state.mode === 'ai-actions';
    }

    /**
     * Установить доступные действия для AI-Actions
     */
    setAvailableActions(actions: string[]): void {
        this.state.availableActions = actions;
        logger.debug('[PhaseMachine] Available actions set', { actions });
    }

    /**
     * Получить доступные действия
     */
    getAvailableActions(): string[] {
        return this.state.availableActions;
    }

    /**
     * Установить текущее действие для AI-Actions
     */
    setCurrentAction(action: string, step: AIStep = 'llm-request'): void {
        const previousAction = this.state.currentAction;
        const previousStep = this.state.currentStep;

        this.state.currentAction = action;
        this.state.currentStep = step;

        // Log transition
        logger.info('[PhaseMachine] AI-Action step', {
            previousAction,
            previousStep,
            action,
            step,
            mode: this.state.mode,
        });
    }

    /**
     * Получить текущее действие
     */
    getCurrentAction(): { action: string | null; step: AIStep | null } {
        return {
            action: this.state.currentAction,
            step: this.state.currentStep,
        };
    }

    /**
     * Записать результат LLM-запроса в историю
     */
    recordLLMResult(action: string, step: AIStep, result: unknown): void {
        this.state.llmHistory.push({
            action,
            step,
            timestamp: new Date(),
            result,
        });

        logger.debug('[PhaseMachine] LLM result recorded', { action, step, historyLength: this.state.llmHistory.length });
    }

    /**
     * Получить историю LLM-запросов
     */
    getLLMHistory(): Array<{ action: string; step: AIStep; timestamp: Date; result?: unknown }> {
        return [...this.state.llmHistory];
    }

    /**
     * Получить конфигурацию текущей фазы
     */
    getCurrentConfig(): PhaseConfig {
        return PHASE_CONFIGS[this.state.currentPhase];
    }

    /**
     * Получить состояние
     */
    getState(): Readonly<PhaseState> {
        return {...this.state};
    }

    /**
     * Проверить, можно ли перейти в указанную фазу
     */
    canTransitionTo(phase: Phase): boolean {
        const currentConfig = this.getCurrentConfig();
        return currentConfig.nextPhases.includes(phase);
    }

    /**
     * Перейти в следующую фазу
     */
    transition(nextPhase: Phase, reason?: string): TransitionResult {
        const currentPhase = this.state.currentPhase;

        // Проверяем допустимость перехода
        if (!this.canTransitionTo(nextPhase)) {
            logger.warn('[PhaseMachine] Invalid transition', {
                from: currentPhase,
                to: nextPhase,
                allowed: this.getCurrentConfig().nextPhases,
            });

            return {
                success: false,
                previousPhase: currentPhase,
                currentPhase,
                iterations: this.state.iterations[nextPhase],
                canContinue: true,
                error: `Cannot transition from ${currentPhase} to ${nextPhase}`,
            };
        }

        // Проверяем лимит итераций для следующей фазы
        const nextConfig = PHASE_CONFIGS[nextPhase];
        if (this.state.iterations[nextPhase] >= nextConfig.maxIterations) {
            logger.warn('[PhaseMachine] Max iterations reached', {
                phase: nextPhase,
                iterations: this.state.iterations[nextPhase],
                max: nextConfig.maxIterations,
            });

            return {
                success: false,
                previousPhase: currentPhase,
                currentPhase,
                iterations: this.state.iterations[nextPhase],
                canContinue: false,
                error: `Max iterations (${nextConfig.maxIterations}) reached for phase ${nextPhase}`,
            };
        }

        // Выполняем переход
        this.state.previousPhase = currentPhase;
        this.state.currentPhase = nextPhase;
        this.state.iterations[nextPhase]++;
        this.state.totalIterations++;
        this.state.phaseStartedAt = new Date();

        // Записываем в историю
        this.state.history.push({
            from: currentPhase,
            to: nextPhase,
            timestamp: new Date(),
            reason: reason ?? undefined,
        });

        logger.info('[PhaseMachine] Transition', {
            from: currentPhase,
            to: nextPhase,
            reason,
            totalIterations: this.state.totalIterations,
        });

        return {
            success: true,
            previousPhase: currentPhase,
            currentPhase: nextPhase,
            iterations: this.state.iterations[nextPhase],
            canContinue: true,
        };
    }

    /**
     * Автоматический переход на основе результата
     */
    autoTransition(result: {
        hasEntities: boolean;
        isComplete: boolean;
        hasQuestions: boolean;
        needsMoreFiles: boolean;
    }): TransitionResult {
        const currentPhase = this.state.currentPhase;

        // Логика переходов на основе результата
        switch (currentPhase) {
            case 'idle':
                return this.transition('discovery', 'start processing');

            case 'discovery':
                if (result.hasEntities) {
                    return this.transition('recognition', 'entities found');
                }
                return this.transition('analysis', 'no entities, analyze structure');

            case 'recognition':
                return this.transition('analysis', 'entities recognized');

            case 'analysis':
                if (result.isComplete) {
                    return this.transition('action', 'graph complete');
                }
                if (result.needsMoreFiles) {
                    return this.transition('discovery', 'need more files');
                }
                return this.transition('validation', 'check results');

            case 'action':
                return this.transition('validation', 'actions executed');

            case 'validation':
                if (result.isComplete && !result.hasQuestions) {
                    return this.transition('completed', 'validation passed');
                }
                if (result.hasQuestions) {
                    return this.transition('discovery', 'need clarification');
                }
                return this.transition('action', 'need more actions');

            case 'completed':
                return this.transition('idle', 'reset');

            default:
                return {
                    success: false,
                    previousPhase: currentPhase,
                    currentPhase,
                    iterations: 0,
                    canContinue: false,
                    error: 'Unknown phase',
                };
        }
    }

    /**
     * Обновить контекст
     */
    updateContext(data: Record<string, unknown>): void {
        this.state.context = {...this.state.context, ...data};
    }

    /**
     * Получить контекст
     */
    getContext(): Record<string, unknown> {
        return {...this.state.context};
    }

    /**
     * Проверить таймаут текущей фазы
     */
    isTimedOut(): boolean {
        const config = this.getCurrentConfig();
        if (!config.timeout) return false;

        const elapsed = Date.now() - this.state.phaseStartedAt.getTime();
        return elapsed > config.timeout;
    }

    /**
     * Получить время в текущей фазе (ms)
     */
    getPhaseDuration(): number {
        return Date.now() - this.state.phaseStartedAt.getTime();
    }

    /**
     * Получить общее время работы (ms)
     */
    getTotalDuration(): number {
        return Date.now() - this.state.startedAt.getTime();
    }

    /**
     * Проверить, достигнут ли лимит итераций
     */
    isExhausted(): boolean {
        // Общий лимит 50 итераций
        if (this.state.totalIterations >= 50) {
            return true;
        }

        // Проверяем таймаут
        if (this.isTimedOut()) {
            return true;
        }

        return false;
    }

    /**
     * Сбросить машину в начальное состояние
     */
    reset(newContext: Record<string, unknown> = {}, mode?: ExecutionMode): void {
        const executionMode = mode ?? this.state.mode;
        this.state = {
            currentPhase: 'idle',
            previousPhase: null,
            iterations: {
                idle: 0,
                discovery: 0,
                recognition: 0,
                analysis: 0,
                action: 0,
                validation: 0,
                completed: 0,
            },
            totalIterations: 0,
            startedAt: new Date(),
            phaseStartedAt: new Date(),
            history: [],
            context: newContext,
            mode: executionMode,
            currentAction: null,
            currentStep: null,
            availableActions: [],
            llmHistory: [],
        };

        logger.info('[PhaseMachine] Reset', { mode: executionMode });
    }

    /**
     * Получить статистику
     */
    getStats(): {
        currentPhase: Phase;
        totalIterations: number;
        phaseIterations: Record<Phase, number>;
        totalDuration: number;
        phaseDuration: number;
        historyLength: number;
        isExhausted: boolean;
        isTimedOut: boolean;
        // AI-Actions stats
        mode: ExecutionMode;
        currentAction: string | null;
        currentStep: AIStep | null;
        availableActions: string[];
        llmHistoryLength: number;
    } {
        return {
            currentPhase: this.state.currentPhase,
            totalIterations: this.state.totalIterations,
            phaseIterations: {...this.state.iterations},
            totalDuration: this.getTotalDuration(),
            phaseDuration: this.getPhaseDuration(),
            historyLength: this.state.history.length,
            isExhausted: this.isExhausted(),
            isTimedOut: this.isTimedOut(),
            mode: this.state.mode,
            currentAction: this.state.currentAction,
            currentStep: this.state.currentStep,
            availableActions: this.state.availableActions,
            llmHistoryLength: this.state.llmHistory.length,
        };
    }

    /**
     * Сериализовать состояние для сохранения
     */
    serialize(): string {
        return JSON.stringify({
            currentPhase: this.state.currentPhase,
            previousPhase: this.state.previousPhase,
            iterations: this.state.iterations,
            totalIterations: this.state.totalIterations,
            startedAt: this.state.startedAt.toISOString(),
            phaseStartedAt: this.state.phaseStartedAt.toISOString(),
            history: this.state.history.map(h => ({
                ...h,
                timestamp: h.timestamp.toISOString(),
            })),
            context: this.state.context,
            mode: this.state.mode,
            currentAction: this.state.currentAction,
            currentStep: this.state.currentStep,
            availableActions: this.state.availableActions,
            llmHistory: this.state.llmHistory.map(h => ({
                ...h,
                timestamp: h.timestamp.toISOString(),
            })),
        });
    }

    /**
     * Десериализовать состояние
     */
    static deserialize(data: string): PhaseMachine {
        const parsed = JSON.parse(data);
        const machine = new PhaseMachine(parsed.context, parsed.mode || 'actions');

        machine.state.currentPhase = parsed.currentPhase;
        machine.state.previousPhase = parsed.previousPhase;
        machine.state.iterations = parsed.iterations;
        machine.state.totalIterations = parsed.totalIterations;
        machine.state.startedAt = new Date(parsed.startedAt);
        machine.state.phaseStartedAt = new Date(parsed.phaseStartedAt);
        machine.state.history = parsed.history.map((h: {
            from: Phase;
            to: Phase;
            timestamp: string;
            reason?: string
        }) => ({
            ...h,
            timestamp: new Date(h.timestamp),
        }));

        // AI-Actions fields (with defaults for backward compatibility)
        machine.state.mode = parsed.mode || 'actions';
        machine.state.currentAction = parsed.currentAction || null;
        machine.state.currentStep = parsed.currentStep || null;
        machine.state.availableActions = parsed.availableActions || [];
        machine.state.llmHistory = (parsed.llmHistory || []).map((h: {
            action: string;
            step: string;
            timestamp: string;
            result?: unknown
        }) => ({
            ...h,
            timestamp: new Date(h.timestamp),
        }));

        return machine;
    }
}

// Singleton для использования в request-processor
let currentPhaseMachine: PhaseMachine | null = null;

export function getPhaseMachine(context: Record<string, unknown> = {}, mode: ExecutionMode = 'actions'): PhaseMachine {
    if (!currentPhaseMachine) {
        currentPhaseMachine = new PhaseMachine(context, mode);
    }
    return currentPhaseMachine;
}

export function resetPhaseMachine(newContext: Record<string, unknown> = {}, mode: ExecutionMode = 'actions'): PhaseMachine {
    currentPhaseMachine = new PhaseMachine(newContext, mode);
    return currentPhaseMachine;
}
