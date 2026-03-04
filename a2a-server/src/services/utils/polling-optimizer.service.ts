/**
 * Polling Optimizer Service
 *
 * Adaptive polling with exponential backoff, circuit breaker,
 * and batch processing for optimal resource utilization.
 * 
 * ВНИМАНИЕ: Этот файл устарел. Используйте модуль polling-optimizer/ вместо него.
 * Для обратной совместимости экспортируем из новой модульной структуры.
 */

// Re-export из модульной структуры для обратной совместимости
export * from './polling-optimizer/index.js';

// Re-export from backoff utility
export { 
    AdaptivePolling, 
    CircuitBreaker, 
    retryWithBackoff,
    calculateDelay 
} from '../../utils/backoff.js';

export type { 
    BackoffOptions, 
    CircuitBreakerOptions, 
    AdaptivePollingOptions 
} from '../../utils/backoff.js';

// ============================================
// Устаревшие типы (дубликаты для обратной совместимости)
// ============================================

/**
 * @deprecated Используйте типы из polling-optimizer/types.ts
 */
export interface PollingEndpoint {
    id: string;
    name: string;
    url?: string;
    pollFn: () => Promise<unknown>;
    enabled: boolean;
}

/**
 * @deprecated Используйте типы из polling-optimizer/types.ts
 */
export interface PollingStrategy {
    type: 'adaptive' | 'fixed' | 'exponential';
    options: import('../../utils/backoff.js').AdaptivePollingOptions | import('../../utils/backoff.js').BackoffOptions | { interval: number };
}
