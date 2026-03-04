/**
 * Context Manager Module
 * 
 * Модульный интерфейс для ContextManager и PhaseMachine
 * 
 * Разделено на:
 * - types.ts - типы и конфигурации
 * - context-manager.ts - реализация менеджера контекста
 * - phase-machine.ts - реализация фазовой машины
 */

// Re-export types
export {
    ContextType,
    RetentionPolicy,
    ContextTypeConfig,
    ContextEntry,
    ContextStats,
    Phase,
    ExecutionMode,
    AIStep,
    PhaseConfig,
    PhaseState,
    TransitionResult,
    CONTEXT_CONFIGS,
    PHASE_CONFIGS,
} from './types.js';

// Re-export ContextManager
export {
    ContextManager,
    getContextManager,
    resetContextManager,
} from './context-manager.js';

// Re-export PhaseMachine
export {
    PhaseMachine,
    getPhaseMachine,
    resetPhaseMachine,
} from './phase-machine.js';
