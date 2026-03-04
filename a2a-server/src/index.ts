import http from 'http';
import app from './app.js';
import {config} from './config/index.js';
import {logger} from './utils/logger.js';
import {setDatabaseLogger} from './config/database.js';
import {startRequestProcessor, stopRequestProcessor} from './services/core/request-processor/request-processor.service.js';
import { initializeQueue, closeQueue, setJobProcessor, addRequestToQueue, getQueueMetrics, onQueueEvent } from './services/core/state/request-queue.service.js';
import { initializeMetrics, recordQueueDepth, recordProcessingTime, recordErrorRate, recordPollingInterval } from './services/utils/metrics.service.js';
import { initialize as initializePollingOptimizer, registerEndpoint, startAll as startAllPolling, shutdown as shutdownPolling, onPollingEvent } from './services/utils/polling-optimizer.service.js';
import { notifyRequestCompleted, notifyRequestFailed, onWebhookEvent } from './services/utils/webhook.service.js';
import { processOneRequest } from './services/core/request-processor/request-processor.service.js';
import { initializePipelineObservability } from './services/utils/pipeline-observability.service.js';
import type { Job } from 'bullmq';
import type { QueueJobData } from './services/core/state/request-queue.service.js';

// Create HTTP server
const server = http.createServer(app);

// Wire shared logger into database layer without introducing config↔utils cycles
setDatabaseLogger(logger);

// Initialize metrics
if (config.metricsEnabled) {
    initializeMetrics();
    initializePipelineObservability();
    logger.info('[Metrics] Metrics initialized');
}

// Initialize request queue with job processor
initializeQueue();
setJobProcessor(async (job: Job<QueueJobData>) => {
    const startTime = Date.now();
    
    try {
        const result = await processOneRequest();
        
        // Record metrics
        if (config.metricsEnabled) {
            recordProcessingTime(Date.now() - startTime);
        }
        
        // Send webhooks
        if (config.webhookEnabled && result) {
            if (result.outcome === 'completed') {
                await notifyRequestCompleted(job.data.promiseId, result);
            } else if (result.outcome === 'failed') {
                await notifyRequestFailed(job.data.promiseId, result.error || 'Unknown error');
            }
        }
        
        return result || { outcome: 'completed' };
    } catch (error) {
        if (config.metricsEnabled) {
            recordProcessingTime(Date.now() - startTime);
        }
        throw error;
    }
});

// Setup queue event handlers for metrics
if (config.metricsEnabled) {
    onQueueEvent('job:completed', async () => {
        const metrics = await getQueueMetrics();
        recordQueueDepth(metrics.depth);
        recordErrorRate(metrics.errorRate);
    });
    
    onQueueEvent('job:failed', async () => {
        const metrics = await getQueueMetrics();
        recordQueueDepth(metrics.depth);
        recordErrorRate(metrics.errorRate);
    });
}

// Initialize polling optimizer if adaptive polling is enabled
if (config.useAdaptivePolling) {
    initializePollingOptimizer({
        enabled: true,
        defaultStrategy: {
            type: 'adaptive',
            options: {
                minInterval: config.pollingMinIntervalMs,
                maxInterval: config.pollingMaxIntervalMs,
                backoffFactor: config.pollingBackoffFactor,
                accelerationFactor: config.pollingAccelerationFactor,
                emptyThreshold: config.pollingEmptyThreshold
            }
        },
        circuitBreaker: {
            failureThreshold: config.pollingCircuitBreakerThreshold,
            resetTimeout: config.pollingCircuitBreakerTimeoutMs,
            successThreshold: 3
        },
        batchConfig: {
            enabled: true,
            maxBatchSize: 10,
            maxWaitTime: 1000,
            minBatchSize: 1
        },
        endpoints: []
    });
    
    // Register default polling endpoint for request processor
    registerEndpoint({
        id: 'request-processor',
        name: 'Request Processor',
        pollFn: async () => {
            const result = await processOneRequest();
            return result;
        },
        enabled: true
    });
    
    // Setup polling event handlers for metrics
    if (config.metricsEnabled) {
        onPollingEvent('interval:changed', ({ newInterval }: { newInterval: number }) => {
            recordPollingInterval(newInterval);
        });
    }
    
    // Start adaptive polling
    startAllPolling();
    
    logger.info('[PollingOptimizer] Adaptive polling initialized');
} else {
    // Request processor: timer loop picks first pending request (legacy mode)
    startRequestProcessor(config.requestProcessorIntervalMs);
}

// Start server
server.listen(config.port, () => {
    logger.info(`A2A Server started`, {
        port: config.port,
        environment: config.nodeEnv,
        pid: process.pid,
        adaptivePolling: config.useAdaptivePolling,
        metricsEnabled: config.metricsEnabled,
        webhookEnabled: config.webhookEnabled
    });

    logger.info(`Health check available at http://localhost:${config.port}/health`);
    logger.info(`API available at http://localhost:${config.port}/api/v1`);
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    // Stop polling optimizer if running
    if (config.useAdaptivePolling) {
        shutdownPolling();
    } else {
        stopRequestProcessor();
    }

    // Close queue with drain (wait for active jobs to complete)
    try {
        logger.info('[Shutdown] Draining request queue...');
        await closeQueue();
        logger.info('[Shutdown] Queue drained and closed');
    } catch (err) {
        logger.error('[Shutdown] Error closing queue', { error: err instanceof Error ? err.message : String(err) });
    }

    server.close((err) => {
        if (err) {
            logger.error('Error during server shutdown', {error: err.message});
            process.exit(1);
        }

        logger.info('Server closed successfully');
        process.exit(0);
    });

    // Force shutdown after timeout
    setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        process.exit(1);
    }, 30000); // Increased to 30s for queue drain
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', {
        error: error.message,
        stack: error.stack,
    });
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled promise rejection', {
        reason: String(reason),
        promise: String(promise),
    });
});

export default server;
