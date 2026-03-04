/**
 * Polling Logic Implementation
 * 
 * Логика опроса endpoints
 */

import { logger } from '../../../utils/logger.js';
import { 
    AdaptivePolling, 
    CircuitBreaker,
    retryWithBackoff,
} from '../../../utils/backoff.js';
import type { EndpointState, PollingMetrics } from './types.js';

// ===========================================
// Metrics
// ===========================================

export function updateMetrics(
    state: EndpointState,
    result: { success: boolean; hasData: boolean; responseTime: number }
): void {
    const metrics = state.metrics;
    metrics.pollCount++;
    metrics.lastPollTime = Date.now();
    
    if (result.success) {
        metrics.successCount++;
        if (!result.hasData) {
            metrics.emptyCount++;
        }
    } else {
        metrics.failureCount++;
    }
    
    // Update rolling average response time
    const alpha = 0.1; // Smoothing factor
    metrics.averageResponseTime = 
        alpha * result.responseTime + (1 - alpha) * metrics.averageResponseTime;
    
    metrics.currentInterval = state.adaptivePolling.getCurrentInterval();
    metrics.circuitBreakerState = state.circuitBreaker.getState();
}

// ===========================================
// Polling Logic
// ===========================================

export async function executePoll(
    state: EndpointState,
    emitEvent: (eventType: string, data: unknown) => void,
    globalConfig: { batchConfig: { enabled: boolean; maxBatchSize: number; maxWaitTime: number } }
): Promise<void> {
    if (!state.isRunning || !state.endpoint.enabled) {
        return;
    }
    
    const startTime = Date.now();
    
    emitEvent('poll:start', { endpointId: state.endpoint.id, timestamp: startTime });
    
    try {
        // Check circuit breaker
        await state.circuitBreaker.execute(async () => {
            const result = await state.endpoint.pollFn();
            const responseTime = Date.now() - startTime;
            const hasData = result !== null && result !== undefined;
            
            updateMetrics(state, { success: true, hasData, responseTime });
            
            // Update adaptive polling interval
            const newInterval = state.adaptivePolling.onPollResult(hasData);
            
            // Handle batching
            if (globalConfig.batchConfig.enabled && hasData) {
                addToBatch(state, emitEvent, globalConfig);
            }
            
            emitEvent('poll:success', {
                endpointId: state.endpoint.id,
                hasData,
                responseTime,
                newInterval
            });
            
            if (!hasData) {
                emitEvent('poll:empty', { endpointId: state.endpoint.id });
            }
            
            if (newInterval !== state.metrics.currentInterval) {
                emitEvent('interval:changed', {
                    endpointId: state.endpoint.id,
                    oldInterval: state.metrics.currentInterval,
                    newInterval
                });
            }
        });
    } catch (error) {
        const responseTime = Date.now() - startTime;
        
        if (error instanceof Error && error.name === 'CircuitBreakerOpenError') {
            logger.warn('[PollingOptimizer] Circuit breaker open, skipping poll', {
                endpointId: state.endpoint.id
            });
            emitEvent('circuit:open', { endpointId: state.endpoint.id });
        } else {
            updateMetrics(state, { success: false, hasData: false, responseTime });
            emitEvent('poll:failure', {
                endpointId: state.endpoint.id,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    
    // Schedule next poll
    if (state.isRunning) {
        scheduleNextPoll(state, emitEvent, globalConfig);
    }
}

export function scheduleNextPoll(
    state: EndpointState,
    emitEvent: (eventType: string, data: unknown) => void,
    globalConfig: { batchConfig: { enabled: boolean; maxBatchSize: number; maxWaitTime: number } }
): void {
    if (state.timerId) {
        clearTimeout(state.timerId);
    }
    
    const interval = state.adaptivePolling.getCurrentInterval();
    state.metrics.currentInterval = interval;
    
    state.timerId = setTimeout(() => {
        executePoll(state, emitEvent, globalConfig).catch(err => {
            logger.error('[PollingOptimizer] Poll execution error', {
                endpointId: state.endpoint.id,
                error: String(err)
            });
        });
    }, interval);
}

// ===========================================
// Batch Processing
// ===========================================

export function addToBatch(
    state: EndpointState,
    emitEvent: (eventType: string, data: unknown) => void,
    globalConfig: { batchConfig: { enabled: boolean; maxBatchSize: number; maxWaitTime: number } },
    item: unknown
): void {
    state.batchQueue.push(item);
    
    // Check if batch is ready
    if (state.batchQueue.length >= globalConfig.batchConfig.maxBatchSize) {
        flushBatch(state, emitEvent);
    } else if (!state.batchTimer) {
        // Start batch timer
        state.batchTimer = setTimeout(() => {
            flushBatch(state, emitEvent);
        }, globalConfig.batchConfig.maxWaitTime);
    }
}

export function flushBatch(
    state: EndpointState,
    emitEvent: (eventType: string, data: unknown) => void
): void {
    if (state.batchTimer) {
        clearTimeout(state.batchTimer);
        state.batchTimer = null;
    }
    
    if (state.batchQueue.length === 0) {
        return;
    }
    
    const batch = [...state.batchQueue];
    state.batchQueue = [];
    
    emitEvent('batch:formed', {
        endpointId: state.endpoint.id,
        batchSize: batch.length,
        items: batch
    });
    
    logger.debug('[PollingOptimizer] Batch flushed', {
        endpointId: state.endpoint.id,
        batchSize: batch.length
    });
}

// ===========================================
// Trigger Functions
// ===========================================

export async function triggerPoll(endpointState: EndpointState): Promise<unknown> {
    return endpointState.endpoint.pollFn();
}

export async function triggerPollWithRetry(
    endpointState: EndpointState,
    backoffOptions?: { initialDelay?: number; multiplier?: number; maxDelay?: number; maxRetries?: number; jitter?: boolean; jitterFactor?: number }
): Promise<unknown> {
    return retryWithBackoff({
        fn: () => endpointState.endpoint.pollFn(),
        backoff: backoffOptions
    });
}

// ===========================================
// Circuit Breaker Control
// ===========================================

export function forceCircuitOpen(endpointState: EndpointState, emitEvent: (eventType: string, data: unknown) => void): void {
    endpointState.circuitBreaker.forceOpen();
    emitEvent('circuit:open', { endpointId: endpointState.endpoint.id, forced: true });
}

export function forceCircuitClose(endpointState: EndpointState, emitEvent: (eventType: string, data: unknown) => void): void {
    endpointState.circuitBreaker.forceClose();
    emitEvent('circuit:close', { endpointId: endpointState.endpoint.id, forced: true });
}

// ===========================================
// Adaptive Polling Utilities
// ===========================================

export function resetAdaptiveInterval(endpointState: EndpointState): void {
    endpointState.adaptivePolling.reset();
}

export function setAdaptiveInterval(endpointState: EndpointState, interval: number): void {
    // Create new adaptive polling with custom starting interval
    endpointState.adaptivePolling = new AdaptivePolling({
        minInterval: interval,
        maxInterval: Math.max(interval * 10, 60000),
        backoffFactor: 1.5,
        accelerationFactor: 0.5,
        emptyThreshold: 3
    });
}
