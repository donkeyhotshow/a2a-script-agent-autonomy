/**
 * Pipeline Observability Service
 * 
 * Provides observability hooks for the request processing pipeline.
 * Records latency, throughput, errors, and active requests metrics.
 */

import { logger } from '../../utils/logger.js';
import {
    recordPipelineActiveRequests,
    recordPipelineRequest,
    recordPipelineCompleted,
    recordPipelineFailed,
    recordPipelineLatency,
    recordPipelineThroughput,
    recordPipelineError,
    recordPipelineErrorRate,
    getPipelineMetrics
} from './metrics.service.js';

// Track active requests and timing
const activeRequests = new Map<string, { startTime: number }>();
let lastThroughputCalculation = 0;
let requestsSinceLastCalculation = 0;

/**
 * Start tracking a pipeline request
 */
export function trackRequestStart(promiseId: string): void {
    activeRequests.set(promiseId, { startTime: Date.now() });
    recordPipelineActiveRequests(activeRequests.size);
    recordPipelineRequest();
    
    logger.debug('[PipelineObservability] Request started', { promiseId, activeCount: activeRequests.size });
}

/**
 * Mark a pipeline request as completed
 */
export function trackRequestComplete(promiseId: string, success: boolean = true): void {
    const request = activeRequests.get(promiseId);
    if (request) {
        const latency = Date.now() - request.startTime;
        recordPipelineLatency(latency);
        
        if (success) {
            recordPipelineCompleted();
        } else {
            recordPipelineFailed();
        }
        
        activeRequests.delete(promiseId);
        recordPipelineActiveRequests(activeRequests.size);
        
        // Track for throughput calculation
        requestsSinceLastCalculation++;
        
        logger.debug('[PipelineObservability] Request completed', { 
            promiseId, 
            latency, 
            success,
            activeCount: activeRequests.size 
        });
    }
}

/**
 * Mark a pipeline request as failed
 */
export function trackRequestError(promiseId: string, errorType?: string): void {
    const request = activeRequests.get(promiseId);
    if (request) {
        const latency = Date.now() - request.startTime;
        recordPipelineLatency(latency);
        recordPipelineFailed();
        recordPipelineError(errorType);
        
        activeRequests.delete(promiseId);
        recordPipelineActiveRequests(activeRequests.size);
        
        logger.debug('[PipelineObservability] Request error', { 
            promiseId, 
            latency, 
            errorType,
            activeCount: activeRequests.size 
        });
    }
}

/**
 * Calculate and record throughput (called periodically)
 */
export function calculateThroughput(): void {
    const now = Date.now();
    const elapsedSeconds = (now - lastThroughputCalculation) / 1000;
    
    if (elapsedSeconds > 0) {
        const throughput = requestsSinceLastCalculation / elapsedSeconds;
        recordPipelineThroughput(throughput);
        
        // Calculate error rate
        const metrics = getPipelineMetrics();
        if (metrics.totalRequests > 0) {
            recordPipelineErrorRate(metrics.errorRate);
        }
        
        logger.debug('[PipelineObservability] Throughput calculated', { 
            throughput: throughput.toFixed(2),
            requestsSinceLastCalculation,
            elapsedSeconds: elapsedSeconds.toFixed(0)
        });
        
        // Reset counters
        lastThroughputCalculation = now;
        requestsSinceLastCalculation = 0;
    }
}

/**
 * Get current pipeline observability status
 */
export function getPipelineStatus(): {
    activeRequests: number;
    metrics: ReturnType<typeof getPipelineMetrics>;
} {
    return {
        activeRequests: activeRequests.size,
        metrics: getPipelineMetrics()
    };
}

/**
 * Initialize pipeline observability
 */
export function initializePipelineObservability(): void {
    lastThroughputCalculation = Date.now();
    requestsSinceLastCalculation = 0;
    
    // Start periodic throughput calculation (every 10 seconds)
    const throughputInterval = setInterval(calculateThroughput, 10000);
    
    logger.info('[PipelineObservability] Initialized');
    
    // Return cleanup function
    return () => {
        clearInterval(throughputInterval);
        activeRequests.clear();
        logger.info('[PipelineObservability] Stopped');
    };
}
