/**
 * Metrics Service Types
 * 
 * Типы для Metrics Service
 */

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
