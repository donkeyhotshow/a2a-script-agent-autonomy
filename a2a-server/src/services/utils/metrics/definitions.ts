/**
 * Metric Definitions and Recording Functions
 * 
 * Определения метрик и функции записи
 */

import { logger } from '../../../utils/logger.js';
import { store } from './store.js';

// ===========================================
// Metric Definitions
// ===========================================

export function initializeMetrics(): void {
    // Queue metrics
    store.define({
        name: 'queue_depth',
        type: 'gauge',
        description: 'Current depth of the request queue',
        unit: 'jobs'
    });

    store.define({
        name: 'queue_waiting',
        type: 'gauge',
        description: 'Number of jobs waiting in queue',
        unit: 'jobs'
    });

    store.define({
        name: 'queue_active',
        type: 'gauge',
        description: 'Number of jobs currently being processed',
        unit: 'jobs'
    });

    store.define({
        name: 'queue_completed_total',
        type: 'counter',
        description: 'Total number of completed jobs',
        unit: 'jobs'
    });

    store.define({
        name: 'queue_failed_total',
        type: 'counter',
        description: 'Total number of failed jobs',
        unit: 'jobs'
    });

    // Processing metrics
    store.define({
        name: 'processing_time_ms',
        type: 'histogram',
        description: 'Request processing time in milliseconds',
        unit: 'ms'
    });

    store.define({
        name: 'processing_throughput',
        type: 'gauge',
        description: 'Requests processed per second',
        unit: 'rps'
    });

    // Error metrics
    store.define({
        name: 'error_rate',
        type: 'gauge',
        description: 'Error rate as a percentage',
        unit: 'percent'
    });

    store.define({
        name: 'error_count_total',
        type: 'counter',
        description: 'Total number of errors',
        unit: 'errors'
    });

    store.define({
        name: 'retry_count_total',
        type: 'counter',
        description: 'Total number of retries',
        unit: 'retries'
    });

    // Polling metrics
    store.define({
        name: 'polling_interval_ms',
        type: 'gauge',
        description: 'Current polling interval in milliseconds',
        unit: 'ms'
    });

    store.define({
        name: 'polling_success_rate',
        type: 'gauge',
        description: 'Polling success rate as a percentage',
        unit: 'percent'
    });

    // Webhook metrics
    store.define({
        name: 'webhook_delivery_time_ms',
        type: 'histogram',
        description: 'Webhook delivery time in milliseconds',
        unit: 'ms'
    });

    store.define({
        name: 'webhook_success_rate',
        type: 'gauge',
        description: 'Webhook delivery success rate',
        unit: 'percent'
    });

    // Pipeline metrics - observability
    store.define({
        name: 'pipeline_active_requests',
        type: 'gauge',
        description: 'Number of currently active pipeline requests',
        unit: 'requests'
    });

    store.define({
        name: 'pipeline_requests_total',
        type: 'counter',
        description: 'Total number of pipeline requests',
        unit: 'requests'
    });

    store.define({
        name: 'pipeline_completed_total',
        type: 'counter',
        description: 'Total number of completed pipeline requests',
        unit: 'requests'
    });

    store.define({
        name: 'pipeline_failed_total',
        type: 'counter',
        description: 'Total number of failed pipeline requests',
        unit: 'requests'
    });

    store.define({
        name: 'pipeline_latency_ms',
        type: 'histogram',
        description: 'Pipeline request latency in milliseconds',
        unit: 'ms'
    });

    store.define({
        name: 'pipeline_throughput_rps',
        type: 'gauge',
        description: 'Pipeline throughput (requests per second)',
        unit: 'rps'
    });

    store.define({
        name: 'pipeline_errors_total',
        type: 'counter',
        description: 'Total number of pipeline errors',
        unit: 'errors'
    });

    store.define({
        name: 'pipeline_error_rate',
        type: 'gauge',
        description: 'Pipeline error rate as percentage',
        unit: 'percent'
    });

    logger.info('[Metrics] Metrics initialized');
}

// ===========================================
// Recording Functions
// ===========================================

export function recordQueueDepth(depth: number): void {
    store.gauge('queue_depth', depth);
}

export function recordQueueWaiting(count: number): void {
    store.gauge('queue_waiting', count);
}

export function recordQueueActive(count: number): void {
    store.gauge('queue_active', count);
}

export function recordQueueCompleted(): void {
    store.increment('queue_completed_total');
}

export function recordQueueFailed(): void {
    store.increment('queue_failed_total');
}

export function recordProcessingTime(durationMs: number): void {
    store.histogram('processing_time_ms', durationMs);
}

export function recordProcessingThroughput(rps: number): void {
    store.gauge('processing_throughput', rps);
}

export function recordErrorRate(rate: number): void {
    store.gauge('error_rate', rate * 100); // Convert to percentage
}

export function recordError(errorType: string): void {
    store.increment('error_count_total', { type: errorType });
}

export function recordRetry(): void {
    store.increment('retry_count_total');
}

export function recordPollingInterval(intervalMs: number): void {
    store.gauge('polling_interval_ms', intervalMs);
}

export function recordPollingSuccessRate(rate: number): void {
    store.gauge('polling_success_rate', rate * 100);
}

export function recordWebhookDeliveryTime(durationMs: number): void {
    store.histogram('webhook_delivery_time_ms', durationMs);
}

export function recordWebhookSuccessRate(rate: number): void {
    store.gauge('webhook_success_rate', rate * 100);
}

// ===========================================
// Pipeline Recording Functions (Observability)
// ===========================================

export function recordPipelineActiveRequests(count: number): void {
    store.gauge('pipeline_active_requests', count);
}

export function recordPipelineRequest(): void {
    store.increment('pipeline_requests_total');
}

export function recordPipelineCompleted(): void {
    store.increment('pipeline_completed_total');
}

export function recordPipelineFailed(): void {
    store.increment('pipeline_failed_total');
}

export function recordPipelineLatency(latencyMs: number): void {
    store.histogram('pipeline_latency_ms', latencyMs);
}

export function recordPipelineThroughput(rps: number): void {
    store.gauge('pipeline_throughput_rps', rps);
}

export function recordPipelineError(errorType?: string): void {
    store.increment('pipeline_errors_total', errorType ? { type: errorType } : undefined);
}

export function recordPipelineErrorRate(rate: number): void {
    store.gauge('pipeline_error_rate', rate * 100);
}
