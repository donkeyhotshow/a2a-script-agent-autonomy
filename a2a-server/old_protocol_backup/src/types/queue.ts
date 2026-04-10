/**
 * Queue Types
 *
 * Type definitions for queue-based request processing
 */

import type { Job } from 'bullmq';
import type { ProcessResult } from '../services/core/request-processor/request-processor.interfaces.js';

// ===========================================
// Queue Priority
// ===========================================

export type QueuePriority = 'high' | 'medium' | 'low';

// ===========================================
// Job Data
// ===========================================

export interface QueueJobData {
    promiseId: string;
    context: Record<string, unknown>;
    codeBlocks?: unknown[];
    message?: string;
    priority: QueuePriority;
    createdAt: number;
    retryCount: number;
}

// ===========================================
// Queue Metrics
// ===========================================

export interface QueueMetrics {
    depth: number;
    processingTime: number;
    errorRate: number;
    retryCount: number;
    completedCount: number;
    failedCount: number;
    delayedCount: number;
    waitingCount: number;
    activeCount: number;
}

export interface QueueStats {
    byPriority: Record<QueuePriority, number>;
    total: number;
    avgProcessingTime: number;
    lastUpdated: number;
}

// ===========================================
// Queue Events
// ===========================================

export type QueueEventType = 
    | 'job:completed' 
    | 'job:failed' 
    | 'job:retry' 
    | 'job:stalled'
    | 'queue:paused'
    | 'queue:resumed';

export type QueueEventHandler = (data: unknown) => void;

// ===========================================
// Job Processor
// ===========================================

export type JobProcessor = (job: Job<QueueJobData>) => Promise<ProcessResult>;

// ===========================================
// Webhook Types
// ===========================================

export interface WebhookSubscription {
    id: string;
    url: string;
    events: WebhookEventType[];
    secret: string;
    active: boolean;
    createdAt: number;
    metadata?: Record<string, unknown>;
    retryCount: number;
    lastDelivery?: number;
    lastError?: string;
}

export type WebhookEventType = 
    | 'request:created'
    | 'request:completed'
    | 'request:failed'
    | 'request:retry'
    | 'queue:depth:high'
    | 'queue:depth:critical'
    | 'system:health'
    | 'system:error';

export interface WebhookPayload {
    event: WebhookEventType;
    timestamp: number;
    data: unknown;
    subscriptionId: string;
}

export interface WebhookDelivery {
    id: string;
    subscriptionId: string;
    payload: WebhookPayload;
    status: 'pending' | 'delivered' | 'failed';
    attempts: number;
    createdAt: number;
    deliveredAt?: number;
    error?: string;
}

export interface WebhookDeliveryResult {
    success: boolean;
    statusCode?: number;
    error?: string;
    responseTime: number;
}

export type WebhookEventHandler = (payload: WebhookPayload) => void;

// ===========================================
// Polling Optimizer Types
// ===========================================

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

export interface BackoffOptions {
    initialDelay: number;
    multiplier: number;
    maxDelay: number;
    maxRetries: number;
    jitter: boolean;
    jitterFactor: number;
}

export interface AdaptivePollingOptions {
    minInterval: number;
    maxInterval: number;
    backoffFactor: number;
    accelerationFactor: number;
    emptyThreshold: number;
}

export interface CircuitBreakerOptions {
    failureThreshold: number;
    resetTimeout: number;
    successThreshold: number;
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

// ===========================================
// Metrics Types
// ===========================================

export type MetricType = 'gauge' | 'counter' | 'histogram' | 'summary';

export interface MetricValue {
    value: number;
    timestamp: number;
    labels?: Record<string, string>;
}

export interface MetricDefinition {
    name: string;
    type: MetricType;
    description: string;
    unit?: string;
    labels?: string[];
}

export interface TimeSeriesData {
    timestamps: number[];
    values: number[];
}

export interface MetricSnapshot {
    name: string;
    type: MetricType;
    description: string;
    current: number;
    min: number;
    max: number;
    avg: number;
    count: number;
    unit?: string;
    timeSeries?: TimeSeriesData;
}

// Re-export from services for convenience
export type { ProcessResult };
