/**
 * Task Decomposition Module
 * 
 * Модульный интерфейс для Task Decomposition Service
 * 
 * Разделено на:
 * - types.ts - типы и интерфейсы
 * - auto-decompose.ts - вспомогательные методы авто-разбиения
 * - service.ts - основной сервис
 * - index.ts - основной экспорт
 */

// Re-export types
export {
    SubtaskStatus,
    StepStatus,
    ActionStatus,
    DependencyType,
    Subtask,
    SubtaskDependency,
    Step,
    Action,
    DecompositionResult,
    ExecutionPlan,
    ExecutionPhase,
} from './types.js';

// Re-export auto-decompose helpers
export {
    autoDecomposeTask,
    autoDecomposeSubtask,
    autoDecomposeStep,
    canParallelize,
    estimateStepsForSubtask,
} from './auto-decompose.js';

// Re-export service
export {
    TaskDecompositionService,
    taskDecompositionService,
} from './service.js';
