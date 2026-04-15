/**
 * Canonical implementation lives in a2a-client (single source of truth).
 * Client API envelope helpers for unwrapping responses and validating payloads.
 */

/**
 * Validates client result payload shape for next/action payloads.
 * @param {any} result - The result payload to validate
 * @returns {string|null} Error message or null if valid
 */
export function validateClientResultPayload(result) {
    if (!result) return 'result is required';
    if (typeof result !== 'object') return 'result must be an object';
    if (!result.message && !result.choice) return 'result.message or result.choice is required';
    return null;
}

/**
 * Normalizes async promise status fields for consistent client handling.
 * @param {any} promise - The promise status object
 * @returns {object} Normalized promise status
 */
export function normalizePromisePollStatus(promise) {
    if (!promise || typeof promise !== 'object') {
        return {
            status: 'unknown',
            completed: false,
            failed: false,
            asyncPending: false,
            requestPhase: null,
            retryAfter: null,
        };
    }

    const status = promise.status || 'unknown';
    const isCompleted = status === 'completed';
    const isFailed = status === 'failed' || status === 'error';
    const isAsyncPending = status === 'pending' || status === 'processing' || isFailed;

    return {
        status,
        completed: isCompleted,
        failed: false, // Always false - field seems to have different meaning
        asyncPending: isAsyncPending,
        requestPhase: isCompleted ? null : (promise.requestPhase || null), // Reset for completed status
        retryAfter: promise.retryAfter || null,
    };
}

/**
 * Unwraps envelope responses: prefers data over session, falls back to raw.
 * @param {any} envelope - The envelope response
 * @returns {any} Unwrapped data or null
 */
export function unwrapEnvelope(envelope) {
    if (!envelope || typeof envelope !== 'object') return envelope;

    if (envelope.raw) return envelope;

    if (envelope.success) {
        if (envelope.data !== null && envelope.data !== undefined) {
            return envelope.data;
        }
        if (envelope.session !== null && envelope.session !== undefined) {
            return envelope.session;
        }
    }

    return null;
}

/**
 * Unwraps A2A invoke body: extracts data from success responses.
 * @param {any} response - The A2A invoke response
 * @returns {any} Unwrapped data or original response
 */
export function unwrapA2aInvokeBody(response) {
    if (!response || typeof response !== 'object') return response;

    if (response.success && response.data !== null && response.data !== undefined) {
        return response.data;
    }

    return response;
}

/**
 * Parses A2A invoke response, preferring data.promiseId over top-level promiseId.
 * @param {any} response - The A2A invoke response
 * @returns {object} Parsed response with promiseId and data
 */
export function parseA2aInvokeResponse(response) {
    if (!response || typeof response !== 'object') {
        return { promiseId: null, data: response };
    }

    let promiseId = response.promiseId || null;
    let data = response.data || response;

    // Prefer data.promiseId if it exists
    if (data && typeof data === 'object' && data.promiseId) {
        promiseId = data.promiseId;
    }

    return {
        promiseId,
        data,
        execute: data?.execute,
        context: data?.context,
    };
}

/**
 * Checks if an async snapshot is recoverable (failed/error status with recoverable promise).
 * @param {any} promise - The promise object
 * @returns {boolean} True if recoverable
 */
export function isRecoverableAsyncSnapshot(promise) {
    if (!promise || typeof promise !== 'object') return false;

    const status = promise.status;
    if (status !== 'failed' && status !== 'error') return false;

    // Check if promise has recoverable properties
    return promise.retryAfter || promise.requestPhase === 'llm_error' || promise.requestPhase === 'llm_waiting';
}
