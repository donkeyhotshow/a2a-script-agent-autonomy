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
