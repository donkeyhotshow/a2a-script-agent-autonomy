/**
 * Metrics Service
 *
 * Collects and exposes metrics for queue depth, processing time, error rate,
 * and other performance indicators.
 * 
 * ВНИМАНИЕ: Этот файл устарел. Используйте модуль metrics/ вместо него.
 * Для обратной совместимости экспортируем из новой модульной структуры.
 */

// Re-export из модульной структуры для обратной совместимости
export * from './metrics/index.js';

// ============================================
// Устаревшие типы (дубликаты для обратной совместимости)
// ============================================

/**
 * @deprecated Используйте типы из metrics/types.ts
 */
export type MetricType = 'gauge' | 'counter' | 'histogram' | 'summary';

/**
 * @deprecated Используйте типы из metrics/types.ts
 */
export type MetricsExporter = (metrics: import('./metrics/types.js').SystemMetrics) => void;
