/**
 * Monitoring and metrics service for Proxy client.
 *
 * Tracks request metrics, latency, errors, and service health.
 * Provides integration with external monitoring systems.
 */

import {logger} from '../utils/logger.js';

export interface MonitorConfig {
    /** Enable monitoring */
    enabled: boolean;
    /** Metrics retention time in minutes (default: 60) */
    retentionMinutes: number;
    /** Enable latency histogram (default: true) */
    enableLatencyHistogram: boolean;
    /** Latency buckets in ms (default: [10, 50, 100, 250, 500, 1000, 2500, 5000]) */
    latencyBuckets: number[];
    /** Callback for alert events */
    onAlert?: (alert: AlertEvent) => void;
    /** Error rate threshold for alerting (default: 0.1 = 10%) */
    errorRateThreshold: number;
    /** Latency threshold for alerting in ms (default: 5000) */
    latencyThreshold: number;
}

export interface RequestMetric {
    timestamp: number;
    endpoint: string;
    method: string;
    statusCode: number;
    latencyMs: number;
    success: boolean;
    errorType?: string;
    requestId?: string;
    userId?: string;
    serviceName?: string;
}

export interface ServiceHealth {
    serviceName: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastCheck: number;
    consecutiveFailures: number;
    consecutiveSuccesses: number;
    averageLatency: number;
    errorRate: number;
}

export interface AlertEvent {
    type: 'error_rate' | 'latency' | 'service_down' | 'circuit_open';
    severity: 'warning' | 'critical';
    message: string;
    serviceName?: string;
    value: number;
    threshold: number;
    timestamp: number;
}

export interface MetricsSnapshot {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    errorRate: number;
    averageLatency: number;
    p50Latency: number;
    p95Latency: number;
    p99Latency: number;
    requestsPerMinute: number;
    endpointBreakdown: Record<string, EndpointMetrics>;
    serviceHealth: Record<string, ServiceHealth>;
    timestamp: number;
}

export interface EndpointMetrics {
    total: number;
    successful: number;
    failed: number;
    errorRate: number;
    averageLatency: number;
}

interface CircularBuffer<T> {
    items: T[];
    index: number;
    size: number;
}

function createCircularBuffer<T>(size: number): CircularBuffer<T> {
    return {
        items: new Array<T>(size),
        index: 0,
        size: 0,
    };
}

function pushToBuffer<T>(buffer: CircularBuffer<T>, item: T): void {
    buffer.items[buffer.index] = item;
    buffer.index = (buffer.index + 1) % buffer.items.length;
    buffer.size = Math.min(buffer.size + 1, buffer.items.length);
}

function getBufferItems<T>(buffer: CircularBuffer<T>): T[] {
    if (buffer.size === 0) return [];
    if (buffer.size < buffer.items.length) {
        return buffer.items.slice(0, buffer.size);
    }
    return [
        ...buffer.items.slice(buffer.index),
        ...buffer.items.slice(0, buffer.index),
    ];
}

/**
 * Latency histogram for tracking response time distribution
 */
class LatencyHistogram {
    private buckets: Map<string, number>;
    private bucketBounds: number[];

    constructor(bounds: number[]) {
        this.bucketBounds = [...bounds].sort((a, b) => a - b);
        this.buckets = new Map();
        this.reset();
    }

    record(latencyMs: number): void {
        const bucket = this.findBucket(latencyMs);
        const current = this.buckets.get(bucket) ?? 0;
        this.buckets.set(bucket, current + 1);
    }

    getPercentile(percentile: number): number {
        const sorted = this.getSortedLatencies();
        if (sorted.length === 0) return 0;

        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
    }

    getAverage(): number {
        let total = 0;
        let count = 0;

        this.buckets.forEach((bucketCount, bucket) => {
            if (bucket === '+Inf') return;
            const bucketValue = parseFloat(bucket);
            total += bucketValue * bucketCount;
            count += bucketCount;
        });

        return count > 0 ? total / count : 0;
    }

    reset(): void {
        this.buckets.clear();
        for (const bound of this.bucketBounds) {
            this.buckets.set(String(bound), 0);
        }
        this.buckets.set('+Inf', 0);
    }

    private findBucket(latencyMs: number): string {
        for (const bound of this.bucketBounds) {
            if (latencyMs <= bound) {
                return String(bound);
            }
        }
        return '+Inf';
    }

    private getSortedLatencies(): number[] {
        const latencies: number[] = [];
        this.buckets.forEach((count, bucket) => {
            if (bucket === '+Inf') return;
            const value = parseFloat(bucket);
            for (let i = 0; i < count; i++) {
                latencies.push(value);
            }
        });
        return latencies.sort((a, b) => a - b);
    }
}

/**
 * Service health monitor
 */
class ServiceHealthMonitor {
    private health = new Map<string, ServiceHealth>();
    private failureThreshold: number;
    private successThreshold: number;
    private latencyWindow: number;

    constructor(failureThreshold = 3, successThreshold = 2, latencyWindowMs = 60000) {
        this.failureThreshold = failureThreshold;
        this.successThreshold = successThreshold;
        this.latencyWindow = latencyWindowMs;
    }

    recordRequest(serviceName: string, success: boolean, latencyMs: number): void {
        let health = this.health.get(serviceName);

        if (!health) {
            health = {
                serviceName,
                status: 'healthy',
                lastCheck: Date.now(),
                consecutiveFailures: 0,
                consecutiveSuccesses: 0,
                averageLatency: latencyMs,
                errorRate: success ? 0 : 1,
            };
            this.health.set(serviceName, health);
        }

        health.lastCheck = Date.now();

        if (success) {
            health.consecutiveSuccesses += 1;
            health.consecutiveFailures = 0;

            if (health.consecutiveSuccesses >= this.successThreshold) {
                health.status = 'healthy';
            }
        } else {
            health.consecutiveFailures += 1;
            health.consecutiveSuccesses = 0;

            if (health.consecutiveFailures >= this.failureThreshold) {
                health.status = 'unhealthy';
            } else if (health.consecutiveFailures > 0) {
                health.status = 'degraded';
            }
        }

        // Update average latency (exponential moving average)
        const alpha = 0.3;
        health.averageLatency = alpha * latencyMs + (1 - alpha) * health.averageLatency;
    }

    getHealth(serviceName: string): ServiceHealth | undefined {
        return this.health.get(serviceName);
    }

    getAllHealth(): Record<string, ServiceHealth> {
        return Object.fromEntries(this.health);
    }

    reset(serviceName?: string): void {
        if (serviceName) {
            this.health.delete(serviceName);
        } else {
            this.health.clear();
        }
    }
}

/**
 * Proxy monitoring service
 */
export class ProxyMonitor {
    private config: MonitorConfig;
    private metrics: CircularBuffer<RequestMetric>;
    private histogram: LatencyHistogram;
    private healthMonitor: ServiceHealthMonitor;
    private alertHistory: CircularBuffer<AlertEvent>;
    private lastAlertTime = new Map<string, number>();
    private alertCooldownMs = 300000; // 5 minutes between same alerts

    constructor(config: Partial<MonitorConfig> = {}) {
        this.config = {
            enabled: config.enabled ?? true,
            retentionMinutes: config.retentionMinutes ?? 60,
            enableLatencyHistogram: config.enableLatencyHistogram ?? true,
            latencyBuckets: config.latencyBuckets ?? [10, 50, 100, 250, 500, 1000, 2500, 5000],
            onAlert: config.onAlert,
            errorRateThreshold: config.errorRateThreshold ?? 0.1,
            latencyThreshold: config.latencyThreshold ?? 5000,
        };

        const maxMetrics = this.config.retentionMinutes * 1000; // Assume max 1000 req/min
        this.metrics = createCircularBuffer<RequestMetric>(maxMetrics);
        this.histogram = new LatencyHistogram(this.config.latencyBuckets);
        this.healthMonitor = new ServiceHealthMonitor();
        this.alertHistory = createCircularBuffer<AlertEvent>(100);
    }

    /**
     * Record a request metric
     */
    record(metric: RequestMetric): void {
        if (!this.config.enabled) return;

        pushToBuffer(this.metrics, metric);

        if (this.config.enableLatencyHistogram) {
            this.histogram.record(metric.latencyMs);
        }

        // Update service health
        if (metric.serviceName) {
            this.healthMonitor.recordRequest(
                metric.serviceName,
                metric.success,
                metric.latencyMs
            );

            // Check for alerts
            this.checkAlerts(metric);
        }

        logger.debug('[ProxyMonitor] recorded metric', {
            endpoint: metric.endpoint,
            latency: metric.latencyMs,
            success: metric.success,
        });
    }

    /**
     * Get current metrics snapshot
     */
    getSnapshot(): MetricsSnapshot {
        const metrics = getBufferItems(this.metrics);
        const now = Date.now();
        const oneMinuteAgo = now - 60000;

        const recentMetrics = metrics.filter(m => m.timestamp > oneMinuteAgo);

        const total = metrics.length;
        const successful = metrics.filter(m => m.success).length;
        const failed = total - successful;
        const errorRate = total > 0 ? failed / total : 0;

        // Calculate percentiles
        const latencies = metrics.map(m => m.latencyMs).sort((a, b) => a - b);
        const p50 = this.calculatePercentile(latencies, 50);
        const p95 = this.calculatePercentile(latencies, 95);
        const p99 = this.calculatePercentile(latencies, 99);

        // Endpoint breakdown
        const endpointStats = new Map<string, EndpointMetrics>();
        for (const metric of metrics) {
            const stats = endpointStats.get(metric.endpoint) ?? {
                total: 0,
                successful: 0,
                failed: 0,
                errorRate: 0,
                averageLatency: 0,
            };

            stats.total += 1;
            if (metric.success) {
                stats.successful += 1;
            } else {
                stats.failed += 1;
            }
            endpointStats.set(metric.endpoint, stats);
        }

        // Finalize endpoint stats
        const endpointBreakdown: Record<string, EndpointMetrics> = {};
        endpointStats.forEach((stats, endpoint) => {
            const endpointMetrics = metrics.filter(m => m.endpoint === endpoint);
            const avgLatency = endpointMetrics.reduce((a, b) => a + b.latencyMs, 0) / endpointMetrics.length;

            endpointBreakdown[endpoint] = {
                total: stats.total,
                successful: stats.successful,
                failed: stats.failed,
                errorRate: stats.total > 0 ? stats.failed / stats.total : 0,
                averageLatency: avgLatency || 0,
            };
        });

        return {
            totalRequests: total,
            successfulRequests: successful,
            failedRequests: failed,
            errorRate,
            averageLatency: this.histogram.getAverage(),
            p50Latency: this.config.enableLatencyHistogram ? this.histogram.getPercentile(50) : p50,
            p95Latency: this.config.enableLatencyHistogram ? this.histogram.getPercentile(95) : p95,
            p99Latency: this.config.enableLatencyHistogram ? this.histogram.getPercentile(99) : p99,
            requestsPerMinute: recentMetrics.length,
            endpointBreakdown,
            serviceHealth: this.healthMonitor.getAllHealth(),
            timestamp: now,
        };
    }

    /**
     * Get service health status
     */
    getServiceHealth(serviceName: string): ServiceHealth | undefined {
        return this.healthMonitor.getHealth(serviceName);
    }

    /**
     * Get all service health statuses
     */
    getAllServiceHealth(): Record<string, ServiceHealth> {
        return this.healthMonitor.getAllHealth();
    }

    /**
     * Get alert history
     */
    getAlertHistory(): AlertEvent[] {
        return getBufferItems(this.alertHistory);
    }

    /**
     * Reset all metrics
     */
    reset(): void {
        this.metrics = createCircularBuffer<RequestMetric>(this.config.retentionMinutes * 1000);
        this.histogram.reset();
        this.healthMonitor.reset();
        this.lastAlertTime.clear();
    }

    private checkAlerts(metric: RequestMetric): void {
        const now = Date.now();
        const serviceName = metric.serviceName || 'unknown';

        // Check latency alert
        if (metric.latencyMs > this.config.latencyThreshold) {
            const alertKey = `latency:${serviceName}`;
            const lastAlert = this.lastAlertTime.get(alertKey);

            if (!lastAlert || now - lastAlert > this.alertCooldownMs) {
                const alert: AlertEvent = {
                    type: 'latency',
                    severity: 'warning',
                    message: `High latency detected for ${serviceName}: ${metric.latencyMs}ms`,
                    serviceName,
                    value: metric.latencyMs,
                    threshold: this.config.latencyThreshold,
                    timestamp: now,
                };
                this.triggerAlert(alert);
                this.lastAlertTime.set(alertKey, now);
            }
        }

        // Check service health alerts
        const health = this.healthMonitor.getHealth(serviceName);
        if (health) {
            if (health.status === 'unhealthy') {
                const alertKey = `service_down:${serviceName}`;
                const lastAlert = this.lastAlertTime.get(alertKey);

                if (!lastAlert || now - lastAlert > this.alertCooldownMs) {
                    const alert: AlertEvent = {
                        type: 'service_down',
                        severity: 'critical',
                        message: `Service ${serviceName} is unhealthy`,
                        serviceName,
                        value: health.consecutiveFailures,
                        threshold: 3,
                        timestamp: now,
                    };
                    this.triggerAlert(alert);
                    this.lastAlertTime.set(alertKey, now);
                }
            }

            if (health.errorRate > this.config.errorRateThreshold) {
                const alertKey = `error_rate:${serviceName}`;
                const lastAlert = this.lastAlertTime.get(alertKey);

                if (!lastAlert || now - lastAlert > this.alertCooldownMs) {
                    const alert: AlertEvent = {
                        type: 'error_rate',
                        severity: 'warning',
                        message: `High error rate for ${serviceName}: ${(health.errorRate * 100).toFixed(1)}%`,
                        serviceName,
                        value: health.errorRate,
                        threshold: this.config.errorRateThreshold,
                        timestamp: now,
                    };
                    this.triggerAlert(alert);
                    this.lastAlertTime.set(alertKey, now);
                }
            }
        }
    }

    private triggerAlert(alert: AlertEvent): void {
        pushToBuffer(this.alertHistory, alert);

        if (this.config.onAlert) {
            try {
                this.config.onAlert(alert);
            } catch (error) {
                logger.error('[ProxyMonitor] alert handler error', {error: String(error)});
            }
        }

        if (alert.severity === 'critical') {
            logger.error(`[ProxyMonitor] ALERT: ${alert.message}`, alert);
        } else {
            logger.warn(`[ProxyMonitor] ALERT: ${alert.message}`, alert);
        }
    }

    private calculatePercentile(sortedValues: number[], percentile: number): number {
        if (sortedValues.length === 0) return 0;
        const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
        return sortedValues[Math.max(0, index)];
    }
}

// Singleton instance
let defaultMonitor: ProxyMonitor | undefined;

/**
 * Get or create default monitor
 */
export function getProxyMonitor(config?: Partial<MonitorConfig>): ProxyMonitor {
    if (!defaultMonitor) {
        defaultMonitor = new ProxyMonitor(config);
    }
    return defaultMonitor;
}

/**
 * Reset default monitor (for testing)
 */
export function resetProxyMonitor(): void {
    defaultMonitor = undefined;
}
