/**
 * Client API + A2A invoke envelope helpers (T013).
 * Used by @a2a/sdk client-api-envelope.ts and Vite builders.js.
 *
 * Matrix:
 * - unwrapEnvelope: `{ success, data }` or `{ success, session }` from Client API → inner payload.
 * - unwrapA2aInvokeBody: A2A `POST /invoke` / result `{ success, data: { execute, context } }` → inner `data`, or passthrough.
 */

export function unwrapEnvelope(res) {
    if (res == null || typeof res !== 'object') return res;
    const r = res;
    if (r.data !== undefined) return r.data;
    if (r.session !== undefined) return r.session;
    return res;
}

export function unwrapA2aInvokeBody(res) {
    if (!res || typeof res !== 'object') return null;
    if (res.success === true && res.data !== undefined && typeof res.data === 'object') {
        return res.data;
    }
    return res;
}

/**
 * Validate `POST /sessions/:id/next` client result payload.
 * Returns `null` when valid, otherwise an error message.
 */
export function validateClientResultPayload(result) {
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
        return 'result is required';
    }
    const hasMessage = typeof result.message === 'string' && result.message.trim().length > 0;
    const hasChoice = typeof result.choice === 'string' && result.choice.trim().length > 0;
    if (!hasMessage && !hasChoice) {
        return 'result.message or result.choice is required';
    }
    return null;
}

/**
 * Normalize promise payload to common client DTO fields.
 */
export function normalizePromisePollStatus(promiseStatus) {
    const status = promiseStatus?.status;
    const completed = !!(
        promiseStatus?.execute ||
        status === 'completed' ||
        status === 'done' ||
        promiseStatus?.result?.completed === true
    );
    const failed = status === 'failed' || status === 'error';
    return {
        status: status || (completed ? 'completed' : 'pending'),
        completed,
        failed,
        asyncPending: !(completed || failed),
    };
}
