/**
 * Context Manager Service
 *
 * Реализация на основе плана: plans/context-manager-improvements.md
 *
 * Управляет контекстом запроса на сервере.
 * Интегрируется с PhaseMachine для управления сложными сценариями.
 *
 * ВНИМАНИЕ: Этот файл устарел. Используйте модуль context-manager/ вместо него.
 * Для обратной совместимости экспортируем из новой модульной структуры.
 */

// Re-export из модульной структуры для обратной совместимости
export * from './context-manager/index.js';

// ============================================
// Устаревшие типы (дубликаты для обратной совместимости)
// ============================================

/**
 * @deprecated Используйте типы из context-manager/types.ts
 */
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

/**
 * @deprecated Используйте типы из context-manager/types.ts
 */
export type RetentionPolicy = 'permanent' | 'session' | 'current-task' | 'until-fixed';

/**
 * @deprecated Используйте ContextManager из context-manager/index.ts
 */
export type Phase = 'idle' | 'discovery' | 'recognition' | 'analysis' | 'action' | 'validation' | 'completed';

/**
 * @deprecated Используйте типы из context-manager/types.ts
 */
export type ExecutionMode = 'actions' | 'ai-actions';

/**
 * @deprecated Используйте типы из context-manager/types.ts
 */
export type AIStep = 'llm-request' | string;
