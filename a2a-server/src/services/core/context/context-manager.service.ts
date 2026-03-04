/**
 * Context Manager Service
 *
 * Реализация на основе плана: plans/context-manager-improvements.md
 *
 * Управляет контекстом запроса на сервере.
 * Интегрируется с PhaseMachine для управления сложными сценариями.
 *
 * Типы контекста:
 * - task — описание задачи (permanent)
 * - graph — граф знаний (session)
 * - frameworks — определённые фреймворки (session)
 * - entities — распознанные сущности (current-task)
 * - questions — вопросы к клиенту (until-fixed)
 * - request_files — запрошенные файлы (until-fixed)
 * - activated_neurons — активированные нейроны (current-task)
 * - style — стиль кода проекта (session)
 * - errors — ошибки обработки (until-fixed)
 * - history — история изменений (session)
 */

import {logger} from '../../../utils/logger.js';

// Типы контекста
export type ContextType =
    | 'task'
    | 'graph'
    | 'frameworks'
    | 'entities'
    | 'questions'
    | 'request_files'
    | 'activated_neurons'
    | 'style'
    | 'errors'
    | 'history';

// Политики удержания
export type RetentionPolicy = 'permanent' | 'session' | 'current-task' | 'until-fixed';

// Конфигурация типа контекста
interface ContextTypeConfig {
    priority: number; // 1-4, выше = важнее
    retention: RetentionPolicy;
    description: string;
    maxSize?: number; // в байтах
}

const CONTEXT_CONFIGS: Record<ContextType, ContextTypeConfig> = {
    task: {priority: 4, retention: 'permanent', description: 'Описание задачи'},
    graph: {priority: 4, retention: 'session', description: 'Граф знаний', maxSize: 50000},
    frameworks: {priority: 3, retention: 'session', description: 'Определённые фреймворки'},
    entities: {priority: 3, retention: 'current-task', description: 'Распознанные сущности'},
    questions: {priority: 2, retention: 'until-fixed', description: 'Вопросы к клиенту'},
    request_files: {priority: 2, retention: 'until-fixed', description: 'Запрошенные файлы'},
    activated_neurons: {priority: 3, retention: 'current-task', description: 'Активированные нейроны'},
    style: {priority: 1, retention: 'session', description: 'Стиль кода проекта'},
    errors: {priority: 3, retention: 'until-fixed', description: 'Ошибки обработки'},
    history: {priority: 1, retention: 'session', description: 'История изменений', maxSize: 10000},
};

// Запись контекста
interface ContextEntry {
    type: ContextType;
    data: unknown;
    timestamp: Date;
    size: number;
    priority: number;
    retention: RetentionPolicy;
    lastAccessed: Date;
}

// Статистика
interface ContextStats {
    totalSize: number;
    maxSize: number;
    utilization: string;
    types: ContextType[];
    byType: Record<ContextType, { size: number; priority: number; age: number }>;
}

/**
 * Context Manager для управления контекстом запроса
 */
export class ContextManager {
    private context: Map<ContextType, ContextEntry> = new Map();
    private maxSize: number;
    private currentSize: number = 0;

    constructor(maxSize: number = 100000) { // ~100KB default
        this.maxSize = maxSize;
    }

    /**
     * Установить контекст
     */
    set(type: ContextType, data: unknown): { type: ContextType; size: number; totalSize: number } {
        const config = CONTEXT_CONFIGS[type];
        const size = this.estimateSize(data);

        // Если превышен лимит, evict
        while (this.currentSize + size > this.maxSize) {
            const evicted = this.evict();
            if (!evicted) break; // Нечего evict
        }

        // Удаляем старый если есть
        if (this.context.has(type)) {
            const old = this.context.get(type)!;
            this.currentSize -= old.size;
        }

        const entry: ContextEntry = {
            type,
            data,
            timestamp: new Date(),
            size,
            priority: config.priority,
            retention: config.retention,
            lastAccessed: new Date(),
        };

        this.context.set(type, entry);
        this.currentSize += size;

        logger.debug('[ContextManager] Set context', {type, size, totalSize: this.currentSize});

        return {type, size, totalSize: this.currentSize};
    }

    /**
     * Получить контекст
     */
    get<T = unknown>(type: ContextType): T | null {
        const entry = this.context.get(type);
        if (entry) {
            entry.lastAccessed = new Date();
            return entry.data as T;
        }
        return null;
    }

    /**
     * Проверить наличие контекста
     */
    has(type: ContextType): boolean {
        return this.context.has(type);
    }

    /**
     * Удалить контекст
     */
    delete(type: ContextType): boolean {
        const entry = this.context.get(type);
        if (entry) {
            this.context.delete(type);
            this.currentSize -= entry.size;
            return true;
        }
        return false;
    }

    /**
     * Получить весь контекст для отправки
     */
    getAll(): Record<string, unknown> {
        const result: Record<string, unknown> = {};
        for (const [type, entry] of this.context) {
            result[type] = entry.data;
        }
        return result;
    }

    /**
     * Получить контекст для конкретной фазы
     */
    getForPhase(phase: string): Record<string, unknown> {
        const result: Record<string, unknown> = {};

        // Всегда включаем task
        const task = this.get('task');
        if (task) result['new_task'] = task;

        // В зависимости от фазы
        switch (phase) {
            case 'discovery':
                result['frameworks'] = this.get('frameworks');
                break;
            case 'recognition':
                result['graph'] = this.get('graph');
                result['entities'] = this.get('entities');
                break;
            case 'analysis':
                result['graph'] = this.get('graph');
                result['frameworks'] = this.get('frameworks');
                break;
            case 'action':
                result['graph'] = this.get('graph');
                result['activated_neurons'] = this.get('activated_neurons');
                break;
            case 'validation':
                result['graph'] = this.get('graph');
                result['questions'] = this.get('questions');
                result['request_files'] = this.get('request_files');
                result['errors'] = this.get('errors');
                break;
            case 'completed':
                result['graph'] = this.get('graph');
                break;
        }

        // Удаляем null значения
        for (const key of Object.keys(result)) {
            if (result[key] === null) {
                delete result[key];
            }
        }

        return result;
    }

    /**
     * Получить отсортированные по приоритету (для eviction)
     */
    private getSortedByPriority(): ContextEntry[] {
        return Array.from(this.context.values())
            .sort((a, b) => {
                // Сначала по приоритету (ниже = evict first)
                if (a.priority !== b.priority) {
                    return a.priority - b.priority;
                }
                // Потом по lastAccessed (старее = evict first)
                return a.lastAccessed.getTime() - b.lastAccessed.getTime();
            });
    }

    /**
     * Evict наименее важный контекст
     */
    private evict(): ContextType | null {
        const sorted = this.getSortedByPriority();

        // Не evict permanent retention
        const toEvict = sorted.find(e => e.retention !== 'permanent');

        if (toEvict) {
            this.context.delete(toEvict.type);
            this.currentSize -= toEvict.size;
            logger.debug('[ContextManager] Evicted', {type: toEvict.type, size: toEvict.size});
            return toEvict.type;
        }

        return null;
    }

    /**
     * Очистить по retention policy
     */
    clearByRetention(retention: RetentionPolicy): void {
        for (const [type, entry] of this.context) {
            if (CONTEXT_CONFIGS[type].retention === retention) {
                this.context.delete(type);
                this.currentSize -= entry.size;
            }
        }
    }

    /**
     * Оценить размер данных
     */
    private estimateSize(data: unknown): number {
        try {
            return JSON.stringify(data).length;
        } catch {
            return 1000; // Default size if cannot serialize
        }
    }

    /**
     * Статистика
     */
    getStats(): ContextStats {
        const byType: Record<ContextType, { size: number; priority: number; age: number }> = {} as Record<ContextType, {
            size: number;
            priority: number;
            age: number
        }>;

        for (const [type, entry] of this.context) {
            byType[type] = {
                size: entry.size,
                priority: entry.priority,
                age: Date.now() - entry.timestamp.getTime(),
            };
        }

        return {
            totalSize: this.currentSize,
            maxSize: this.maxSize,
            utilization: ((this.currentSize / this.maxSize) * 100).toFixed(1) + '%',
            types: Array.from(this.context.keys()),
            byType,
        };
    }

    /**
     * Сброс
     */
    reset(): void {
        this.context.clear();
        this.currentSize = 0;
        logger.info('[ContextManager] Reset');
    }

    /**
     * Сериализация
     */
    serialize(): string {
        const data = {
            entries: Array.from(this.context.entries()).map(([type, entry]) => ({
                type,
                data: entry.data,
                timestamp: entry.timestamp.toISOString(),
                lastAccessed: entry.lastAccessed.toISOString(),
            })),
            maxSize: this.maxSize,
            currentSize: this.currentSize,
        };
        return JSON.stringify(data);
    }

    /**
     * Десериализация
     */
    static deserialize(json: string): ContextManager {
        const data = JSON.parse(json);
        const manager = new ContextManager(data.maxSize);

        for (const entry of data.entries) {
            const config = CONTEXT_CONFIGS[entry.type as ContextType];
            manager.context.set(entry.type as ContextType, {
                type: entry.type as ContextType,
                data: entry.data,
                timestamp: new Date(entry.timestamp),
                lastAccessed: new Date(entry.lastAccessed),
                size: manager.estimateSize(entry.data),
                priority: config.priority,
                retention: config.retention,
            });
        }

        manager.currentSize = data.currentSize;
        return manager;
    }
}

// Singleton для использования в request-processor
let currentManager: ContextManager | null = null;

export function getContextManager(): ContextManager {
    if (!currentManager) {
        currentManager = new ContextManager();
    }
    return currentManager;
}

export function resetContextManager(): ContextManager {
    currentManager = new ContextManager();
    return currentManager;
}

// ============================================
// Phase Machine - интегрирована в Context Manager
// ============================================

// Типы фаз
export type Phase = 'idle' | 'discovery' | 'recognition' | 'analysis' | 'action' | 'validation' | 'completed';

// Режим выполнения
export type ExecutionMode = 'actions' | 'ai-actions';

// Тип шага для AI-Actions
export type AIStep = 'llm-request' | string;

// Конфигурация фаз
interface PhaseConfig {
    name: Phase;
    description: string;
    nextPhases: Phase[];
    maxIterations: number;
    timeout?: number; // ms
}

const PHASE_CONFIGS: Record<Phase, PhaseConfig> = {
    idle: {
        name: 'idle',
        description: 'Начальное состояние, ожидание запроса',
        nextPhases: ['discovery'],
        maxIterations: 1,
    },
    discovery: {
        name: 'discovery',
        description: 'Определение фреймворков, анализ структуры проекта',
        nextPhases: ['recognition', 'analysis'],
        maxIterations: 3,
        timeout: 30000,
    },
    recognition: {
        name: 'recognition',
        description: 'Распознавание сущностей из codeBlocks',
        nextPhases: ['analysis', 'discovery'],
        maxIterations: 5,
        timeout: 60000,
    },
    analysis: {
        name: 'analysis',
        description: 'Анализ графа, проверка completeness',
        nextPhases: ['action', 'discovery', 'validation'],
        maxIterations: 3,
        timeout: 30000,
    },
    action: {
        name: 'action',
        description: 'Активация нейронов, генерация рекомендаций',
        nextPhases: ['validation', 'action'],
        maxIterations: 10,
        timeout: 60000,
    },
    validation: {
        name: 'validation',
        description: 'Проверка результатов, генерация questions',
        nextPhases: ['completed', 'action', 'discovery'],
        maxIterations: 5,
        timeout: 30000,
    },
    completed: {
        name: 'completed',
        description: 'Задача завершена',
        nextPhases: ['idle'],
        maxIterations: 1,
    },
};

// Состояние фазовой машины
interface PhaseState {
    currentPhase: Phase;
    previousPhase: Phase | null;
    iterations: Record<Phase, number>;
    totalIterations: number;
    startedAt: Date;
    phaseStartedAt: Date;
    history: Array<{
        from: Phase;
        to: Phase;
        timestamp: Date;
        reason?: string;
    }>;
    context: Record<string, unknown>;
    // AI-Actions state
    mode: ExecutionMode;
    currentAction: string | null;
    currentStep: AIStep | null;
    availableActions: string[];
    llmHistory: Array<{
        action: string;
        step: AIStep;
        timestamp: Date;
        result?: unknown;
    }>;
}

// Результат перехода
interface TransitionResult {
    success: boolean;
    previousPhase: Phase;
    currentPhase: Phase;
    iterations: number;
    canContinue: boolean;
    error?: string;
}

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
