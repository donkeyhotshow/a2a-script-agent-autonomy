/**
 * Client API daemon — poll A2A Server `/api/v1/requests/:id/result` until terminal state.
 * Single place for completion rules used by step routes, proxy, and server-proxy service.
 * 
 * Provides both functional API (pollA2ARequestResult) and class-based PollingDaemon
 * with improved error handling, retry logic, and configurable options.
 */

import { isPromisePollComplete } from '../storage/promise-status.js';
import { getA2aServerBaseUrl } from '@a2a-client/shared/a2a-server-base.js';

function defaultBaseUrl() {
    return getA2aServerBaseUrl();
}

/** @param {{ data?: { status?: string, execute?: unknown } }} pollJson */
export function isA2AResultCompleted(pollJson) {
    const d = pollJson?.data;
    if (!d) return false;
    return isPromisePollComplete(d);
}

/** @param {{ data?: { status?: string, error?: unknown } }} pollJson */
export function isA2AResultFailed(pollJson) {
    const d = pollJson?.data;
    if (!d) return false;
    return d.status === 'failed' || d.status === 'error';
}

/**
 * Global stats aggregator - accumulates statistics across all PollingDaemon instances
 * and pollA2ARequestResult calls.
 */
const globalStats = {
    _stats: {
        totalPolls: 0,
        totalRetries: 0,
        timeouts: 0,
        errors: 0,
        totalDuration: 0,
        completedPolls: 0,
        activePolls: 0,
        startedAt: Date.now()
    },

    /**
     * Increment active poll count
     */
    startPoll() {
        this._stats.activePolls++;
    },

    /**
     * Record poll completion with duration
     * @param {number} duration - Duration in milliseconds
     * @param {'completed'|'failed'|'timeout'} outcome
     */
    endPoll(duration, outcome) {
        this._stats.activePolls = Math.max(0, this._stats.activePolls - 1);
        this._stats.totalPolls++;
        this._stats.totalDuration += duration;
        this._stats.completedPolls++;
        if (outcome === 'timeout') {
            this._stats.timeouts++;
        }
    },

    /**
     * Record an error
     */
    recordError() {
        this._stats.errors++;
    },

    /**
     * Record a retry
     */
    recordRetry() {
        this._stats.totalRetries++;
    },

    /**
     * Get aggregated global stats
     * @returns {object}
     */
    getStats() {
        const avgDuration = this._stats.completedPolls > 0
            ? Math.round(this._stats.totalDuration / this._stats.completedPolls)
            : 0;

        return {
            activePolls: this._stats.activePolls,
            totalPolls: this._stats.totalPolls,
            avgDuration,
            timeouts: this._stats.timeouts,
            errors: this._stats.errors,
            uptime: Date.now() - this._stats.startedAt
        };
    },

    /**
     * Reset global stats
     */
    resetStats() {
        this._stats = {
            totalPolls: 0,
            totalRetries: 0,
            timeouts: 0,
            errors: 0,
            totalDuration: 0,
            completedPolls: 0,
            activePolls: 0,
            startedAt: Date.now()
        };
    },

    /**
     * Get detailed stats (including internal counters)
     * @returns {object}
     */
    getDetailedStats() {
        return {
            ...this.getStats(),
            totalRetries: this._stats.totalRetries,
            completedPolls: this._stats.completedPolls,
            totalDuration: this._stats.totalDuration
        };
    }
};

/**
 * PollingDaemon class - provides enhanced polling with retry logic for transient errors
 * and improved logging capabilities.
 * 
 * @example
 * const daemon = new PollingDaemon({
 *   interval: 1000,
 *   maxPolls: 30,
 *   serverUrl: 'http://localhost:3000',
 *   maxRetries: 3,
 *   timeout: 5000
 * });
 * 
 * const result = await daemon.pollPromise(promiseId);
 */
export class PollingDaemon {
    /**
     * @param {object} config - Configuration options
     * @param {number} [config.interval=1000] - Polling interval in milliseconds
     * @param {number} [config.maxPolls=30] - Maximum number of polling attempts
     * @param {string} [config.serverUrl='http://localhost:3000'] - A2A Server URL
     * @param {number} [config.maxRetries=3] - Maximum retry attempts for transient errors
     * @param {number} [config.timeout=5000] - Request timeout in milliseconds
     * @param {Record<string, string>} [config.headers={}] - Additional headers for requests
     * @param {typeof fetch} [config.fetchImpl=globalThis.fetch] - Fetch implementation
     */
    constructor(config = {}) {
        this.interval = config.interval || 1000;
        this.maxPolls = config.maxPolls || 30;
        this.serverUrl = config.serverUrl || defaultBaseUrl();
        this.maxRetries = config.maxRetries || 3;
        this.timeout = config.timeout || 5000;
        this.headers = config.headers || {};
        this.fetchImpl = config.fetchImpl || globalThis.fetch;
        
        // Stats tracking
        this._stats = {
            totalPolls: 0,
            totalRetries: 0,
            timeouts: 0,
            errors: 0,
            startedAt: Date.now()
        };
    }

    /**
     * Check if an error is transient (retryable)
     * Transient errors include:
     * - AbortError (request timeout)
     * - ECONNREFUSED (connection refused)
     * - ENOTFOUND (server not found)
     * - Timeout errors
     * - Network errors
     * 
     * @param {Error} error - The error to check
     * @returns {boolean} - True if the error is transient
     */
    _isTransientError(error) {
        if (!error) return false;
        
        const errorMessage = error.message?.toLowerCase() || '';
        const errorName = error.name?.toLowerCase() || '';
        
        return (
            errorName === 'aborterror' ||
            errorName === 'timeouterror' ||
            errorName === 'networkerror' ||
            errorMessage.includes('econnrefused') ||
            errorMessage.includes('econnreset') ||
            errorMessage.includes('enotfound') ||
            errorMessage.includes('timeout') ||
            errorMessage.includes('network') ||
            errorMessage.includes('socket') ||
            errorMessage.includes('fetch') && errorMessage.includes('failed')
        );
    }

    /**
     * Sleep for specified milliseconds
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise<void>}
     */
    _sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Check the status of a promise with retry logic for transient errors
     * @param {string} promiseId - The promise ID to check
     * @returns {Promise<{data: object, status: 'success'|'transient_error'|'fatal_error'}>}
     */
    async _checkStatus(promiseId) {
        const root = String(this.serverUrl).replace(/\/$/, '');
        const url = `${root}/api/v1/requests/${encodeURIComponent(promiseId)}/result`;
        
        let lastError = null;
        
        // Retry loop for transient errors
        for (let retry = 0; retry <= this.maxRetries; retry++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.timeout);
                
                const pollRes = await this.fetchImpl(url, {
                    method: 'GET',
                    headers: this.headers,
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!pollRes.ok) {
                    const status = pollRes.status;
                    // Server errors (5xx) are transient
                    if (status >= 500 && status < 600) {
                        if (retry < this.maxRetries) {
                            this._stats.totalRetries++;
                            console.warn(`[PollingDaemon] Server error ${status}, retry ${retry + 1}/${this.maxRetries}`);
                            await this._sleep(this.interval * (retry + 1)); // Exponential backoff
                            continue;
                        }
                        return { data: { error: `Server error: ${status}` }, status: 'fatal_error' };
                    }
                    // Client errors (4xx) are fatal
                    return { data: { error: `HTTP ${status}: ${pollRes.statusText}` }, status: 'fatal_error' };
                }
                
                const pollData = await pollRes.json();
                return { data: pollData, status: 'success' };
                
            } catch (error) {
                lastError = error;
                this._stats.errors++;
                
                if (this._isTransientError(error)) {
                    if (retry < this.maxRetries) {
                        this._stats.totalRetries++;
                        const delay = this.interval * Math.pow(2, retry); // Exponential backoff
                        console.warn(`[PollingDaemon] Transient error: ${error.message}, retry ${retry + 1}/${this.maxRetries} in ${delay}ms`);
                        await this._sleep(delay);
                    } else {
                        console.error(`[PollingDaemon] Max retries exceeded for transient error: ${error.message}`);
                    }
                } else {
                    // Fatal error - don't retry
                    console.error(`[PollingDaemon] Fatal error: ${error.message}`);
                    return { data: { error: error.message }, status: 'fatal_error' };
                }
            }
        }
        
        return { data: { error: lastError?.message || 'Max retries exceeded' }, status: 'transient_error' };
    }

    /**
     * Poll A2A Server for promise result
     * 
     * @param {string} promiseId - The promise ID to poll
     * @param {Function} [onProgress] - Callback on each poll iteration
     * @returns {Promise<{ outcome: 'completed', data: object } | { outcome: 'failed', data: object } | { outcome: 'timeout' }>}
     */
    async pollPromise(promiseId, onProgress) {
        console.log(`[PollingDaemon] Starting poll for promiseId: ${promiseId}, maxPolls: ${this.maxPolls}, interval: ${this.interval}ms`);
        
        // Track global stats
        const pollStartTime = Date.now();
        globalStats.startPoll();
        
        for (let i = 0; i < this.maxPolls; i++) {
            this._stats.totalPolls++;
            
            // Wait before first check
            if (i > 0) {
                await this._sleep(this.interval);
            }
            
            const startTime = Date.now();
            const result = await this._checkStatus(promiseId);
            const elapsed = Date.now() - startTime;
            
            const pollInfo = {
                attempt: i + 1,
                maxPolls: this.maxPolls,
                elapsed,
                status: result.status,
                hasData: !!result.data
            };
            
            console.log(`[PollingDaemon] Poll ${pollInfo.attempt}/${pollInfo.maxPolls} completed in ${elapsed}ms, status: ${result.status}`);
            
            if (onProgress) {
                onProgress(i, result.data, pollInfo);
            }
            
            // Check for terminal states
            if (result.status === 'fatal_error') {
                console.log(`[PollingDaemon] Fatal error detected, returning failed`);
                
                // Track global stats
                const duration = Date.now() - pollStartTime;
                globalStats.endPoll(duration, 'failed');
                globalStats.recordError();
                
                return { outcome: 'failed', data: result.data };
            }
            
            if (result.data && isA2AResultCompleted(result.data)) {
                console.log(`[PollingDaemon] Poll completed successfully after ${i + 1} attempts`);
                
                // Track global stats
                const duration = Date.now() - pollStartTime;
                globalStats.endPoll(duration, 'completed');
                
                return { outcome: 'completed', data: result.data };
            }
            
            if (result.data && isA2AResultFailed(result.data)) {
                console.log(`[PollingDaemon] Poll detected failure: ${result.data.error || result.data.status}`);
                
                // Track global stats
                const duration = Date.now() - pollStartTime;
                globalStats.endPoll(duration, 'failed');
                
                return { outcome: 'failed', data: result.data };
            }
        }
        
        this._stats.timeouts++;
        console.error(`[PollingDaemon] Poll timeout after ${this.maxPolls} attempts`);
        
        // Track global stats
        const duration = Date.now() - pollStartTime;
        globalStats.endPoll(duration, 'timeout');
        
        return { outcome: 'timeout' };
    }

    /**
     * Get daemon statistics
     * @returns {object} - Statistics object
     */
    getStats() {
        return {
            ...this._stats,
            uptime: Date.now() - this._stats.startedAt
        };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this._stats = {
            totalPolls: 0,
            totalRetries: 0,
            timeouts: 0,
            errors: 0,
            startedAt: Date.now()
        };
    }
}

/**
 * @param {string} promiseId
 * @param {object} [options]
 * @param {string} [options.baseUrl]
 * @param {number} [options.maxPolls=30]
 * @param {number} [options.intervalMs=1000]
 * @param {Record<string, string>} [options.headers]
 * @param {typeof fetch} [options.fetchImpl]
 * @param {(i: number, pollJson: unknown) => void} [options.onProgress]
 * @returns {Promise<{ outcome: 'completed', data: object } | { outcome: 'failed', data: object } | { outcome: 'timeout' }>}
 */
export async function pollA2ARequestResult(promiseId, options = {}) {
    const {
        baseUrl = defaultBaseUrl(),
        maxPolls = 30,
        intervalMs = 1000,
        headers = {},
        fetchImpl = globalThis.fetch,
        onProgress,
    } = options;

    if (typeof fetchImpl !== 'function') {
        throw new Error('pollA2ARequestResult: fetch is not available');
    }

    const daemon = new PollingDaemon({
        serverUrl: baseUrl,
        maxPolls: maxPolls,
        interval: intervalMs,
        headers: headers,
        fetchImpl: fetchImpl
    });

    return daemon.pollPromise(promiseId, onProgress);
}

/**
 * Get global polling statistics
 * @returns {object} - Aggregated statistics across all polling operations
 */
export function getGlobalStats() {
    return globalStats.getStats();
}

/**
 * Get detailed global statistics
 * @returns {object} - Detailed aggregated statistics
 */
export function getGlobalStatsDetailed() {
    return globalStats.getDetailedStats();
}

/**
 * Reset global statistics
 */
export function resetGlobalStats() {
    globalStats.resetStats();
}
