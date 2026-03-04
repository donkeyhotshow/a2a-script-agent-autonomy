/**
 * Metrics Service
 *
 * Collects and exposes metrics for queue depth, processing time, error rate,
 * and other performance indicators.
 */

import { logger } from '../../utils/logger.js';

// ===========================================
// Types
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

export interface SystemMetrics {
    queue: QueueMetrics;
    processing: ProcessingMetrics;
    errors: ErrorMetrics;
    polling: PollingMetrics;
    webhook: WebhookMetrics;
    pipeline: PipelineMetrics;
    timestamp: number;
}

export interface PipelineMetrics {
    activeRequests: number;
    totalRequests: number;
    completedRequests: number;
    failedRequests: number;
    avgLatencyMs: number;
    minLatencyMs: number;
    maxLatencyMs: number;
    throughputRps: number;
    errorCount: number;
    errorRate: number;
}

export interface QueueMetrics {
    depth: number;
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
}

export interface ProcessingMetrics {
    avgTime: number;
    minTime: number;
    maxTime: number;
    totalProcessed: number;
    throughput: number; // requests per second
}

export interface ErrorMetrics {
    count: number;
    rate: number;
    retryCount: number;
    byType: Record<string, number>;
}

export interface PollingMetrics {
    totalPolls: number;
    successfulPolls: number;
    failedPolls: number;
    emptyPolls: number;
    avgInterval: number;
    circuitBreakerOpens: number;
}

export interface WebhookMetrics {
    totalDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    avgResponseTime: number;
}

export type MetricsExporter = (metrics: SystemMetrics) => void;

// ===========================================
// Metric Storage
// ===========================================

class MetricStore {
    private definitions = new Map<string, MetricDefinition>();
    private values = new Map<string, MetricValue[]>();
    private counters = new Map<string, number>();
    private maxHistory = 1000;

    define(def: MetricDefinition): void {
        this.definitions.set(def.name, def);
        if (!this.values.has(def.name)) {
            this.values.set(def.name, []);
        }
    }

    record(name: string, value: number, labels?: Record<string, string>): void {
        const def = this.definitions.get(name);
        if (!def) {
            logger.warn('[Metrics] Recording undefined metric', { name });
            return;
        }

        const history = this.values.get(name)!;
        
        if (def.type === 'counter') {
            const current = this.counters.get(name) || 0;
            this.counters.set(name, current + value);
            value = this.counters.get(name)!;
        }

        history.push({
            value,
            timestamp: Date.now(),
            labels
        });

        // Trim history
        if (history.length > this.maxHistory) {
            history.shift();
        }
    }

    increment(name: string, labels?: Record<string, string>): void {
        this.record(name, 1, labels);
    }

    gauge(name: string, value: number, labels?: Record<string, string>): void {
        const def = this.definitions.get(name);
        if (def && def.type !== 'gauge') {
            logger.warn('[Metrics] Type mismatch for gauge', { name, expected: def.type });
        }
        this.record(name, value, labels);
    }

    histogram(name: string, value: number, labels?: Record<string, string>): void {
        const def = this.definitions.get(name);
        if (def && def.type !== 'histogram') {
            logger.warn('[Metrics] Type mismatch for histogram', { name, expected: def.type });
        }
        this.record(name, value, labels);
    }

    getSnapshot(name: string, timeWindowMs?: number): MetricSnapshot | undefined {
        const def = this.definitions.get(name);
        const history = this.values.get(name);
        
        if (!def || !history || history.length === 0) {
            return undefined;
        }

        const cutoff = timeWindowMs ? Date.now() - timeWindowMs : 0;
        const relevant = history.filter(h => h.timestamp >= cutoff);
        
        if (relevant.length === 0) {
            return {
                name: def.name,
                type: def.type,
                description: def.description,
                current: 0,
                min: 0,
                max: 0,
                avg: 0,
                count: 0,
                unit: def.unit
            };
        }

        const values = relevant.map(h => h.value);
        const current = values[values.length - 1];
        const min = Math.min(...values);
        const max = Math.max(...values);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;

        const timeSeries: TimeSeriesData = {
            timestamps: relevant.map(h => h.timestamp),
            values
        };

        return {
            name: def.name,
            type: def.type,
            description: def.description,
            current,
            min,
            max,
            avg,
            count: values.length,
            unit: def.unit,
            timeSeries
        };
    }

    getAllSnapshots(timeWindowMs?: number): MetricSnapshot[] {
        return Array.from(this.definitions.keys())
            .map(name => this.getSnapshot(name, timeWindowMs))
            .filter((s): s is MetricSnapshot => s !== undefined);
    }

    getCurrent(name: string): number {
        const history = this.values.get(name);
        if (!history || history.length === 0) return 0;
        return history[history.length - 1].value;
    }

    reset(name: string): void {
        this.values.delete(name);
        this.counters.delete(name);
    }

    resetAll(): void {
        this.values.clear();
        this.counters.clear();
    }
}

// ===========================================
// Global Instance
// ===========================================

const store = new MetricStore();
const exporters: MetricsExporter[] = [];

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

// ===========================================
// Snapshot Functions
// ===========================================

export function getMetric(name: string): MetricSnapshot | undefined {
    return store.getSnapshot(name);
}

export function getAllMetrics(): MetricSnapshot[] {
    return store.getAllSnapshots();
}

export function getSystemMetrics(): SystemMetrics {
    const queueCompleted = store.getCurrent('queue_completed_total');
    const queueFailed = store.getCurrent('queue_failed_total');
    const processingSnapshot = store.getSnapshot('processing_time_ms');
    const errorCount = store.getCurrent('error_count_total');
    const totalProcessed = queueCompleted + queueFailed;
    
    // Pipeline metrics
    const pipelineLatencySnapshot = store.getSnapshot('pipeline_latency_ms');
    const pipelineCompleted = store.getCurrent('pipeline_completed_total');
    const pipelineFailed = store.getCurrent('pipeline_failed_total');
    const pipelineTotal = pipelineCompleted + pipelineFailed;
    const pipelineErrorRate = pipelineTotal > 0 ? pipelineFailed / pipelineTotal : 0;

    return {
        queue: {
            depth: store.getCurrent('queue_depth'),
            waiting: store.getCurrent('queue_waiting'),
            active: store.getCurrent('queue_active'),
            completed: queueCompleted,
            failed: queueFailed,
            delayed: 0 // Would need to be populated from queue service
        },
        processing: {
            avgTime: processingSnapshot?.avg || 0,
            minTime: processingSnapshot?.min || 0,
            maxTime: processingSnapshot?.max || 0,
            totalProcessed,
            throughput: store.getCurrent('processing_throughput')
        },
        errors: {
            count: errorCount,
            rate: totalProcessed > 0 ? queueFailed / totalProcessed : 0,
            retryCount: store.getCurrent('retry_count_total'),
            byType: {}
        },
        polling: {
            totalPolls: 0,
            successfulPolls: 0,
            failedPolls: 0,
            emptyPolls: 0,
            avgInterval: store.getCurrent('polling_interval_ms'),
            circuitBreakerOpens: 0
        },
        webhook: {
            totalDeliveries: 0,
            successfulDeliveries: 0,
            failedDeliveries: 0,
            avgResponseTime: 0
        },
        pipeline: {
            activeRequests: store.getCurrent('pipeline_active_requests'),
            totalRequests: store.getCurrent('pipeline_requests_total'),
            completedRequests: pipelineCompleted,
            failedRequests: pipelineFailed,
            avgLatencyMs: pipelineLatencySnapshot?.avg || 0,
            minLatencyMs: pipelineLatencySnapshot?.min || 0,
            maxLatencyMs: pipelineLatencySnapshot?.max || 0,
            throughputRps: store.getCurrent('pipeline_throughput_rps'),
            errorCount: store.getCurrent('pipeline_errors_total'),
            errorRate: pipelineErrorRate
        },
        timestamp: Date.now()
    };
}

// ===========================================
// Pipeline Metrics (Observability)
// ===========================================

export function getPipelineMetrics(): PipelineMetrics {
    const pipelineLatencySnapshot = store.getSnapshot('pipeline_latency_ms');
    const pipelineCompleted = store.getCurrent('pipeline_completed_total');
    const pipelineFailed = store.getCurrent('pipeline_failed_total');
    const pipelineTotal = pipelineCompleted + pipelineFailed;
    const pipelineErrorRate = pipelineTotal > 0 ? pipelineFailed / pipelineTotal : 0;

    return {
        activeRequests: store.getCurrent('pipeline_active_requests'),
        totalRequests: store.getCurrent('pipeline_requests_total'),
        completedRequests: pipelineCompleted,
        failedRequests: pipelineFailed,
        avgLatencyMs: pipelineLatencySnapshot?.avg || 0,
        minLatencyMs: pipelineLatencySnapshot?.min || 0,
        maxLatencyMs: pipelineLatencySnapshot?.max || 0,
        throughputRps: store.getCurrent('pipeline_throughput_rps'),
        errorCount: store.getCurrent('pipeline_errors_total'),
        errorRate: pipelineErrorRate
    };
}

// ===========================================
// Export Functions
// ===========================================

export function addExporter(exporter: MetricsExporter): () => void {
    exporters.push(exporter);
    return () => {
        const index = exporters.indexOf(exporter);
        if (index > -1) {
            exporters.splice(index, 1);
        }
    };
}

export function exportMetrics(): void {
    const metrics = getSystemMetrics();
    exporters.forEach(exporter => {
        try {
            exporter(metrics);
        } catch (err) {
            logger.error('[Metrics] Exporter error', { error: String(err) });
        }
    });
}

// ===========================================
// Prometheus Format Export
// ===========================================

export function toPrometheusFormat(): string {
    const snapshots = getAllMetrics();
    const lines: string[] = [];

    snapshots.forEach(snapshot => {
        lines.push(`# HELP ${snapshot.name} ${snapshot.description}`);
        lines.push(`# TYPE ${snapshot.name} ${snapshot.type}`);
        
        if (snapshot.timeSeries && snapshot.timeSeries.values.length > 0) {
            const latest = snapshot.timeSeries.values.length - 1;
            const timestamp = snapshot.timeSeries.timestamps[latest];
            const value = snapshot.timeSeries.values[latest];
            lines.push(`${snapshot.name} ${value} ${timestamp}`);
        } else {
            lines.push(`${snapshot.name} ${snapshot.current}`);
        }
        
        lines.push('');
    });

    return lines.join('\n');
}

// ===========================================
// JSON Format Export
// ===========================================

export function toJSONFormat(): Record<string, unknown> {
    return {
        metrics: getAllMetrics(),
        system: getSystemMetrics(),
        timestamp: Date.now()
    };
}

// ===========================================
// Health Check
// ===========================================

export function checkHealth(): {
    healthy: boolean;
    issues: string[];
} {
    const issues: string[] = [];
    const metrics = getSystemMetrics();

    // Check error rate
    if (metrics.errors.rate > 0.1) {
        issues.push(`High error rate: ${(metrics.errors.rate * 100).toFixed(1)}%`);
    }

    // Check queue depth
    if (metrics.queue.depth > 100) {
        issues.push(`High queue depth: ${metrics.queue.depth}`);
    }

    // Check processing time
    if (metrics.processing.avgTime > 30000) {
        issues.push(`High processing time: ${metrics.processing.avgTime.toFixed(0)}ms`);
    }

    return {
        healthy: issues.length === 0,
        issues
    };
}

// ===========================================
// Cleanup
// ===========================================

export function resetMetric(name: string): void {
    store.reset(name);
}

export function resetAllMetrics(): void {
    store.resetAll();
    logger.info('[Metrics] All metrics reset');
}
