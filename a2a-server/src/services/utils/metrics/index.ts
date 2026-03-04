/**
 * Metrics Service Module
 * 
 * Модульный интерфейс для Metrics Service
 * 
 * Разделено на:
 * - types.ts - типы и интерфейсы
 * - store.ts - хранилище метрик
 * - definitions.ts - определения метрик и функции записи
 * - index.ts - основной экспорт
 */

// Re-export types
export {
    MetricType,
    MetricValue,
    MetricDefinition,
    TimeSeriesData,
    MetricSnapshot,
    SystemMetrics,
    PipelineMetrics,
    QueueMetrics,
    ProcessingMetrics,
    ErrorMetrics,
    PollingMetrics,
    WebhookMetrics,
    MetricsExporter,
} from './types.js';

// Re-export store
export { store } from './store.js';

// Re-export definitions and recording functions
export {
    initializeMetrics,
    recordQueueDepth,
    recordQueueWaiting,
    recordQueueActive,
    recordQueueCompleted,
    recordQueueFailed,
    recordProcessingTime,
    recordProcessingThroughput,
    recordErrorRate,
    recordError,
    recordRetry,
    recordPollingInterval,
    recordPollingSuccessRate,
    recordWebhookDeliveryTime,
    recordWebhookSuccessRate,
    recordPipelineActiveRequests,
    recordPipelineRequest,
    recordPipelineCompleted,
    recordPipelineFailed,
    recordPipelineLatency,
    recordPipelineThroughput,
    recordPipelineError,
    recordPipelineErrorRate,
} from './definitions.js';

// Re-export snapshot functions
export {
    getMetric,
    getAllMetrics,
    getSystemMetrics,
    getPipelineMetrics,
} from './service.js';

// Re-export export functions
export {
    addExporter,
    exportMetrics,
    toPrometheusFormat,
    toJSONFormat,
    checkHealth,
    resetMetric,
    resetAllMetrics,
} from './service.js';
