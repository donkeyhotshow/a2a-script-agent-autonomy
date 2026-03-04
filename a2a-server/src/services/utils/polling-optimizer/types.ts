/**
 * Polling Optimizer Types
 * 
 * Типы для Polling Optimizer Service
 */

import { 
    AdaptivePollingOptions, 
    BackoffOptions, 
    CircuitBreakerOptions 
} from '../../utils/backoff.js';

export interface PollingEndpoint {
    id: string;
    name: string;
    url?: string;
    pollFn: () => Promise<unknown>;
    enabled: boolean;
}

export interface PollingStrategy {
    type: 'adaptive' | 'fixed' | 'exponential';
    options: AdaptivePollingOptions | BackoffOptions | { interval: number };
}

export interface PollingMetrics {
    endpointId: string;
    pollCount: number;
    successCount: number;
    failureCount: number;
    emptyCount: number;
    averageResponseTime: number;
    currentInterval: number;
    lastPollTime: number;
    circuitBreakerState: string;
}

export interface BatchConfig {
    enabled: boolean;
    maxBatchSize: number;
    maxWaitTime: number;
    minBatchSize: number;
}

export interface PollingOptimizerConfig {
    enabled: boolean;
    defaultStrategy: PollingStrategy;
    batchConfig: BatchConfig;
    circuitBreaker: CircuitBreakerOptions;
    endpoints: PollingEndpoint[];
}

export type PollingEventType = 
    | 'poll:start'
    | 'poll:success'
    | 'poll:failure'
    | 'poll:empty'
    | 'interval:changed'
    | 'circuit:open'
    | 'circuit:close'
    | 'batch:formed';

export type PollingEventHandler = (data: unknown) => void;

export interface EndpointState {
    endpoint: PollingEndpoint;
    adaptivePolling: import('../../utils/backoff.js').AdaptivePolling;
    circuitBreaker: import('../../utils/backoff.js').CircuitBreaker;
    metrics: PollingMetrics;
    timerId: ReturnType<typeof setTimeout> | null;
    isRunning: boolean;
    batchQueue: unknown[];
    batchTimer: ReturnType<typeof setTimeout> | null;
}
