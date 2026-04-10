/**
 * Pipeline Observability Service - Stub
 * Tracks request processing pipeline events
 */

import { logger } from '@a2a/server-utils/logger.js';

/**
 * Track request start
 */
export function trackRequestStart(promiseId: string): void {
    logger.debug('[Pipeline] Request started', { promiseId });
}

/**
 * Track request completion
 */
export function trackRequestComplete(promiseId: string, outcome: string): void {
    logger.debug('[Pipeline] Request completed', { promiseId, outcome });
}

/**
 * Track request failure
 */
export function trackRequestFailure(promiseId: string, error: string): void {
    logger.error('[Pipeline] Request failed', { promiseId, error });
}

/**
 * Initialize pipeline observability
 */
export function initializePipelineObservability(): void {
    logger.info('[Pipeline] Observability initialized (stub)');
}
