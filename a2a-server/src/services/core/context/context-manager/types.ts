/**
 * Context Manager Types
 * 
 * Типы для ContextManager и PhaseMachine
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
export interface ContextTypeConfig {
    priority: number; // 1-4, выше = важнее
    retention: RetentionPolicy;
    description: string;
    maxSize?: number; // в байтах
}

export const CONTEXT_CONFIGS: Record<ContextType, ContextTypeConfig> = {
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
export interface ContextEntry {
    type: ContextType;
    data: unknown;
    timestamp: Date;
    size: number;
    priority: number;
    retention: RetentionPolicy;
    lastAccessed: Date;
}

// Статистика
export interface ContextStats {
    totalSize: number;
    maxSize: number;
    utilization: string;
    types: ContextType[];
    byType: Record<ContextType, { size: number; priority: number; age: number }>;
}

// ============================================
// Phase Machine Types
// ============================================

// Типы фаз
export type Phase = 'idle' | 'discovery' | 'recognition' | 'analysis' | 'action' | 'validation' | 'completed';

// Режим выполнения
export type ExecutionMode = 'actions' | 'ai-actions';

// Тип шага для AI-Actions
export type AIStep = 'llm-request' | string;

// Конфигурация фаз
export interface PhaseConfig {
    name: Phase;
    description: string;
    nextPhases: Phase[];
    maxIterations: number;
    timeout?: number; // ms
}

export const PHASE_CONFIGS: Record<Phase, PhaseConfig> = {
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
export interface PhaseState {
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
export interface TransitionResult {
    success: boolean;
    previousPhase: Phase;
    currentPhase: Phase;
    iterations: number;
    canContinue: boolean;
    error?: string;
}
