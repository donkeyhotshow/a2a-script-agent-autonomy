/**
 * Polling Optimizer Service
 *
 * Adaptive polling with exponential backoff, circuit breaker,
 * and batch processing for optimal resource utilization.
 */

import { logger } from '../utils/logger.js';
import { 
    AdaptivePolling, 
    CircuitBreaker, 
    retryWithBackoff,
    calculateDelay,
    type BackoffOptions,
    type CircuitBreakerOptions,
    type AdaptivePollingOptions
} from '../utils/backoff.js';

// ===========================================
// Types
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
// Default Configuration
// ===========================================

const DEFAULT_POLLING_CONFIG: PollingOptimizerConfig = {
    enabled: true,
    defaultStrategy: {
        type: 'adaptive',
        options: {
            minInterval: 1000,
            maxInterval: 60000,
            backoffFactor: 1.5,
            accelerationFactor: 0.5,
            emptyThreshold: 3
        }
    },
    batchConfig: {
        enabled: true,
        maxBatchSize: 10,
        maxWaitTime: 1000,
        minBatchSize: 1
    },
    circuitBreaker: {
        failureThreshold: 5,
        resetTimeout: 30000,
        successThreshold: 3
    },
    endpoints: []
};

// ===========================================
// State
// ===========================================

interface EndpointState {
    endpoint: PollingEndpoint;
    adaptivePolling: AdaptivePolling;
    circuitBreaker: CircuitBreaker;
    metrics: PollingMetrics;
    timerId: ReturnType<typeof setTimeout> | null;
    isRunning: boolean;
    batchQueue: unknown[];
    batchTimer: ReturnType<typeof setTimeout> | null;
}

const endpointStates = new Map<string, EndpointState>();
const eventHandlers = new Map<PollingEventType, Set<PollingEventHandler>>();

let isInitialized = false;
let globalConfig: PollingOptimizerConfig = { ...DEFAULT_POLLING_CONFIG };

// ===========================================
// Event Handling
// ===========================================

function emitEvent(eventType: PollingEventType, data: unknown): void {
    const handlers = eventHandlers.get(eventType);
    if (handlers) {
        handlers.forEach(handler => {
            try {
                handler(data);
            } catch (err) {
                logger.error('[PollingOptimizer] Event handler error', { eventType, error: String(err) });
            }
        });
    }
}

export function onPollingEvent(
    eventType: PollingEventType,
    handler: PollingEventHandler
): () => void {
    if (!eventHandlers.has(eventType)) {
        eventHandlers.set(eventType, new Set());
    }
    eventHandlers.get(eventType)!.add(handler);
    
    return () => {
        eventHandlers.get(eventType)?.delete(handler);
    };
}

// ===========================================
// Metrics
// ===========================================

function updateMetrics(
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

async function executePoll(state: EndpointState): Promise<void> {
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
                addToBatch(state, result);
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
        scheduleNextPoll(state);
    }
}

function scheduleNextPoll(state: EndpointState): void {
    if (state.timerId) {
        clearTimeout(state.timerId);
    }
    
    const interval = state.adaptivePolling.getCurrentInterval();
    state.metrics.currentInterval = interval;
    
    state.timerId = setTimeout(() => {
        executePoll(state).catch(err => {
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

function addToBatch(state: EndpointState, item: unknown): void {
    state.batchQueue.push(item);
    
    // Check if batch is ready
    if (state.batchQueue.length >= globalConfig.batchConfig.maxBatchSize) {
        flushBatch(state);
    } else if (!state.batchTimer) {
        // Start batch timer
        state.batchTimer = setTimeout(() => {
            flushBatch(state);
        }, globalConfig.batchConfig.maxWaitTime);
    }
}

function flushBatch(state: EndpointState): void {
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
// Endpoint Management
// ===========================================

export function registerEndpoint(
    endpoint: PollingEndpoint,
    strategy?: PollingStrategy
): void {
    const strat = strategy || globalConfig.defaultStrategy;
    
    const state: EndpointState = {
        endpoint,
        adaptivePolling: new AdaptivePolling(strat.type === 'adaptive' ? strat.options as AdaptivePollingOptions : undefined),
        circuitBreaker: new CircuitBreaker(globalConfig.circuitBreaker),
        metrics: {
            endpointId: endpoint.id,
            pollCount: 0,
            successCount: 0,
            failureCount: 0,
            emptyCount: 0,
            averageResponseTime: 0,
            currentInterval: 1000,
            lastPollTime: 0,
            circuitBreakerState: 'CLOSED'
        },
        timerId: null,
        isRunning: false,
        batchQueue: [],
        batchTimer: null
    };
    
    endpointStates.set(endpoint.id, state);
    
    logger.info('[PollingOptimizer] Endpoint registered', {
        endpointId: endpoint.id,
        name: endpoint.name,
        strategy: strat.type
    });
}

export function unregisterEndpoint(endpointId: string): boolean {
    const state = endpointStates.get(endpointId);
    if (!state) return false;
    
    stopEndpoint(endpointId);
    endpointStates.delete(endpointId);
    
    logger.info('[PollingOptimizer] Endpoint unregistered', { endpointId });
    return true;
}

export function startEndpoint(endpointId: string): boolean {
    const state = endpointStates.get(endpointId);
    if (!state || state.isRunning) return false;
    
    state.isRunning = true;
    scheduleNextPoll(state);
    
    logger.info('[PollingOptimizer] Endpoint started', { endpointId });
    return true;
}

export function stopEndpoint(endpointId: string): boolean {
    const state = endpointStates.get(endpointId);
    if (!state || !state.isRunning) return false;
    
    state.isRunning = false;
    
    if (state.timerId) {
        clearTimeout(state.timerId);
        state.timerId = null;
    }
    
    if (state.batchTimer) {
        clearTimeout(state.batchTimer);
        state.batchTimer = null;
    }
    
    // Flush remaining batch
    flushBatch(state);
    
    logger.info('[PollingOptimizer] Endpoint stopped', { endpointId });
    return true;
}

export function enableEndpoint(endpointId: string): boolean {
    const state = endpointStates.get(endpointId);
    if (!state) return false;
    
    state.endpoint.enabled = true;
    return true;
}

export function disableEndpoint(endpointId: string): boolean {
    const state = endpointStates.get(endpointId);
    if (!state) return false;
    
    state.endpoint.enabled = false;
    return true;
}

// ===========================================
// Global Control
// ===========================================

export function initialize(config?: Partial<PollingOptimizerConfig>): void {
    if (isInitialized) {
        logger.warn('[PollingOptimizer] Already initialized');
        return;
    }
    
    globalConfig = { ...DEFAULT_POLLING_CONFIG, ...config };
    
    if (globalConfig.endpoints) {
        globalConfig.endpoints.forEach(endpoint => registerEndpoint(endpoint));
    }
    
    isInitialized = true;
    logger.info('[PollingOptimizer] Initialized', { strategy: globalConfig.defaultStrategy.type });
}

export function startAll(): void {
    for (const endpointId of endpointStates.keys()) {
        startEndpoint(endpointId);
    }
    logger.info('[PollingOptimizer] All endpoints started');
}

export function stopAll(): void {
    for (const endpointId of endpointStates.keys()) {
        stopEndpoint(endpointId);
    }
    logger.info('[PollingOptimizer] All endpoints stopped');
}

export function shutdown(): void {
    stopAll();
    endpointStates.clear();
    eventHandlers.clear();
    isInitialized = false;
    logger.info('[PollingOptimizer] Shutdown complete');
}

// ===========================================
// Queries
// ===========================================

export function getEndpointMetrics(endpointId: string): PollingMetrics | undefined {
    return endpointStates.get(endpointId)?.metrics;
}

export function getAllMetrics(): PollingMetrics[] {
    return Array.from(endpointStates.values()).map(s => s.metrics);
}

export function getEndpointStatus(endpointId: string): {
    registered: boolean;
    running: boolean;
    enabled: boolean;
    circuitState: string;
} | undefined {
    const state = endpointStates.get(endpointId);
    if (!state) return undefined;
    
    return {
        registered: true,
        running: state.isRunning,
        enabled: state.endpoint.enabled,
        circuitState: state.circuitBreaker.getState()
    };
}

export function getAllStatuses(): Array<{
    endpointId: string;
    running: boolean;
    enabled: boolean;
    circuitState: string;
}> {
    return Array.from(endpointStates.entries()).map(([id, state]) => ({
        endpointId: id,
        running: state.isRunning,
        enabled: state.endpoint.enabled,
        circuitState: state.circuitBreaker.getState()
    }));
}

// ===========================================
// Manual Trigger
// ===========================================

export async function triggerPoll(endpointId: string): Promise<unknown> {
    const state = endpointStates.get(endpointId);
    if (!state) {
        throw new Error(`Endpoint ${endpointId} not found`);
    }
    
    return state.endpoint.pollFn();
}

export async function triggerPollWithRetry(
    endpointId: string,
    backoffOptions?: Partial<BackoffOptions>
): Promise<unknown> {
    const state = endpointStates.get(endpointId);
    if (!state) {
        throw new Error(`Endpoint ${endpointId} not found`);
    }
    
    return retryWithBackoff({
        fn: () => state.endpoint.pollFn(),
        backoff: backoffOptions
    });
}

// ===========================================
// Circuit Breaker Control
// ===========================================

export function forceCircuitOpen(endpointId: string): boolean {
    const state = endpointStates.get(endpointId);
    if (!state) return false;
    
    state.circuitBreaker.forceOpen();
    emitEvent('circuit:open', { endpointId, forced: true });
    return true;
}

export function forceCircuitClose(endpointId: string): boolean {
    const state = endpointStates.get(endpointId);
    if (!state) return false;
    
    state.circuitBreaker.forceClose();
    emitEvent('circuit:close', { endpointId, forced: true });
    return true;
}

// ===========================================
// Adaptive Polling Utilities
// ===========================================

export function resetAdaptiveInterval(endpointId: string): boolean {
    const state = endpointStates.get(endpointId);
    if (!state) return false;
    
    state.adaptivePolling.reset();
    return true;
}

export function setAdaptiveInterval(endpointId: string, interval: number): boolean {
    const state = endpointStates.get(endpointId);
    if (!state) return false;
    
    // Create new adaptive polling with custom starting interval
    state.adaptivePolling = new AdaptivePolling({
        minInterval: interval,
        maxInterval: Math.max(interval * 10, 60000),
        backoffFactor: 1.5,
        accelerationFactor: 0.5,
        emptyThreshold: 3
    });
    
    return true;
}

// ===========================================
// Comparison Helpers
// ===========================================

export function compareStrategies(
    iterations: number = 100,
    dataProbability: number = 0.3
): Record<string, number> {
    const adaptive = new AdaptivePolling();
    let adaptiveTotalDelay = 0;
    let adaptivePolls = 0;
    
    let exponentialTotalDelay = 0;
    let exponentialPolls = 0;
    let consecutiveEmpty = 0;
    
    for (let i = 0; i < iterations; i++) {
        const hasData = Math.random() < dataProbability;
        
        // Adaptive
        adaptiveTotalDelay += adaptive.getCurrentInterval();
        adaptive.onPollResult(hasData);
        adaptivePolls++;
        
        // Exponential (simplified)
        exponentialTotalDelay += calculateDelay(
            Math.min(consecutiveEmpty, 5),
            { initialDelay: 1000, multiplier: 2, maxDelay: 60000, maxRetries: 10, jitter: false, jitterFactor: 0 }
        );
        if (hasData) {
            consecutiveEmpty = 0;
        } else {
            consecutiveEmpty++;
        }
        exponentialPolls++;
    }
    
    return {
        adaptiveAverageDelay: adaptiveTotalDelay / adaptivePolls,
        exponentialAverageDelay: exponentialTotalDelay / exponentialPolls,
        adaptiveTotalDelay,
        exponentialTotalDelay,
        savings: ((exponentialTotalDelay - adaptiveTotalDelay) / exponentialTotalDelay * 100)
    };
}
