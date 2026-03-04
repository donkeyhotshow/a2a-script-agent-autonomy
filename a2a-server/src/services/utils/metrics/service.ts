/**
 * Metrics Service - Main Functions
 * 
 * Основные функции сервиса метрик
 */

import { logger } from '../../../utils/logger.js';
import { store } from './store.js';
import { 
    MetricsExporter, 
    SystemMetrics, 
    PipelineMetrics, 
    MetricSnapshot 
} from './types.js';

const exporters: MetricsExporter[] = [];

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
