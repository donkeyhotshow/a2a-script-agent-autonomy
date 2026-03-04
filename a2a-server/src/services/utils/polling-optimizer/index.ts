/**
 * Polling Optimizer Module
 *
 * Модульный интерфейс для Polling Optimizer Service
 * Это адаптивный сервис, который лениво запускает пул эндпоинтов с поддержкой
 * circuit-breaker, batching и метрик.
 */

import { AdaptivePolling, CircuitBreaker, DEFAULT_ADAPTIVE_POLLING } from '../../../utils/backoff.js';
import { logger } from '../../../utils/logger.js';
import type { AdaptivePollingOptions } from '../../../utils/backoff.js';
import type {
    PollingEndpoint,
    PollingOptimizerConfig,
    PollingMetrics,
    PollingEventType,
    PollingEventHandler,
    EndpointState
} from './types.js';
import {
    updateMetrics,
    executePoll,
    scheduleNextPoll,
    addToBatch,
    flushBatch,
    triggerPoll,
    triggerPollWithRetry,
    forceCircuitOpen,
    forceCircuitClose,
    resetAdaptiveInterval,
    setAdaptiveInterval,
} from './polling-logic.js';

const endpointStates = new Map<string, EndpointState>();
const eventListeners = new Map<PollingEventType, Set<PollingEventHandler>>();
let optimizerConfig: PollingOptimizerConfig | null = null;
let started = false;

const globalBatchConfig = () => optimizerConfig?.batchConfig ?? {
    enabled: false,
    maxBatchSize: 1,
    maxWaitTime: 1000,
    minBatchSize: 1
};

const emitPollingEvent = (eventType: PollingEventType, data: unknown) => {
    const handlers = eventListeners.get(eventType);
    handlers?.forEach((handler) => handler(data));
};

const ensureConfig = () => {
    if (!optimizerConfig) {
        throw new Error('Polling optimizer is not initialized');
    }
    return optimizerConfig;
};

const resolveAdaptiveOptions = (): AdaptivePollingOptions => {
    const config = optimizerConfig;
    if (!config) return DEFAULT_ADAPTIVE_POLLING;
    const strategy = config.defaultStrategy;
    if (strategy.type === 'adaptive') {
        return strategy.options as AdaptivePollingOptions;
    }
    return DEFAULT_ADAPTIVE_POLLING;
};

const createState = (endpoint: PollingEndpoint): EndpointState => {
    const config = ensureConfig();
    const options = resolveAdaptiveOptions();
    const state: EndpointState = {
        endpoint,
        adaptivePolling: new AdaptivePolling(options),
        circuitBreaker: new CircuitBreaker(config.circuitBreaker),
        metrics: {
            endpointId: endpoint.id,
            pollCount: 0,
            successCount: 0,
            failureCount: 0,
            emptyCount: 0,
            averageResponseTime: 0,
            currentInterval: options.minInterval ?? DEFAULT_ADAPTIVE_POLLING.minInterval,
            lastPollTime: 0,
            circuitBreakerState: 'CLOSED'
        },
        timerId: null,
        isRunning: false,
        batchQueue: [],
        batchTimer: null
    };
    return state;
};

const stopEndpoint = (state: EndpointState) => {
    state.isRunning = false;
    if (state.timerId) {
        clearTimeout(state.timerId);
        state.timerId = null;
    }
    if (state.batchTimer) {
        clearTimeout(state.batchTimer);
        state.batchTimer = null;
    }
    state.batchQueue = [];
};

const startEndpoint = (state: EndpointState) => {
    if (state.isRunning || !optimizerConfig) return;
    state.isRunning = true;
    state.metrics.circuitBreakerState = state.circuitBreaker.getState();
    state.metrics.currentInterval = state.adaptivePolling.getCurrentInterval();

    executePoll(state, emitPollingEvent, { batchConfig: globalBatchConfig() })
        .catch((err) => {
            logger.error('[PollingOptimizer] Poll execution failed', {
                endpointId: state.endpoint.id,
                error: err instanceof Error ? err.message : String(err)
            });
        });
};

export function initialize(config: PollingOptimizerConfig) {
    if (optimizerConfig) {
        shutdown();
    }
    optimizerConfig = config;
    endpointStates.clear();
    started = false;
    config.endpoints?.forEach((endpoint) => registerEndpoint(endpoint));
}

export function registerEndpoint(endpoint: PollingEndpoint) {
    ensureConfig();
    if (endpointStates.has(endpoint.id)) {
        const existing = endpointStates.get(endpoint.id)!;
        existing.endpoint = endpoint;
        return;
    }

    const state = createState(endpoint);
    endpointStates.set(endpoint.id, state);

    if (started) {
        startEndpoint(state);
    }
}

export function startAll() {
    ensureConfig();
    started = true;
    for (const state of endpointStates.values()) {
        startEndpoint(state);
    }
}

export function shutdown() {
    started = false;
    for (const state of endpointStates.values()) {
        stopEndpoint(state);
    }
}

export function onPollingEvent(event: PollingEventType, handler: PollingEventHandler) {
    if (!eventListeners.has(event)) {
        eventListeners.set(event, new Set());
    }
    eventListeners.get(event)!.add(handler);
}

export function getAllMetrics(): PollingMetrics[] {
    return Array.from(endpointStates.values()).map((state) => ({ ...state.metrics }));
}

export function getAllStatuses() {
    return Array.from(endpointStates.values()).map((state) => ({
        endpointId: state.endpoint.id,
        name: state.endpoint.name,
        enabled: state.endpoint.enabled,
        running: state.isRunning,
        currentInterval: state.metrics.currentInterval,
        lastPollTime: state.metrics.lastPollTime,
        circuitBreakerState: state.metrics.circuitBreakerState,
    }));
}

// Compatibility re-exports
export {
    updateMetrics,
    executePoll,
    scheduleNextPoll,
    addToBatch,
    flushBatch,
    triggerPoll,
    triggerPollWithRetry,
    forceCircuitOpen,
    forceCircuitClose,
    resetAdaptiveInterval,
    setAdaptiveInterval,
};

export {
    PollingEndpoint,
    PollingStrategy,
    PollingMetrics,
    BatchConfig,
    PollingOptimizerConfig,
    PollingEventType,
    PollingEventHandler,
    EndpointState,
} from './types.js';
