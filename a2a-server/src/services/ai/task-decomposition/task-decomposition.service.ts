/**
 * Task Decomposition Engine
 * 
 * Разбиение сложных задач на подзадачи:
 * - Парсинг task-decomposition симуляций
 * - Создание дерева подзадач
 * - Управление зависимостями между подзадачами
 * - Параллельное/последовательное выполнение
 * 
 * ВНИМАНИЕ: Этот файл устарел. Используйте модуль task-decomposition/ вместо него.
 * Для обратной совместимости экспортируем из новой модульной структуры.
 */

// Re-export из модульной структуры для обратной совместимости
export * from './index.js';

// ============================================
// Устаревшие типы (дубликаты для обратной совместимости)
// ============================================

/**
 * @deprecated Используйте типы из task-decomposition/types.ts
 */
export type SubtaskStatus = 'pending' | 'ready' | 'in-progress' | 'completed' | 'failed' | 'blocked';

/**
 * @deprecated Используйте типы из task-decomposition/types.ts
 */
export type StepStatus = 'pending' | 'ready' | 'in-progress' | 'completed' | 'failed';

/**
 * @deprecated Используйте типы из task-decomposition/types.ts
 */
export type ActionStatus = 'pending' | 'ready' | 'in-progress' | 'completed' | 'failed';

/**
 * @deprecated Используйте типы из task-decomposition/types.ts
 */
export type DependencyType = 'requires' | 'optional' | 'conflicts';
