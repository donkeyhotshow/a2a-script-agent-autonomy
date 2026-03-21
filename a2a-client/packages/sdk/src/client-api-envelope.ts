/**
 * Unwrap Client API JSON: legacy `{ success, data }` or `{ success, session }` (Vite-aligned).
 */
export function unwrapEnvelope<T = unknown>(res: unknown): T | undefined {
    if (res == null || typeof res !== 'object') return res as T | undefined;
    const r = res as { data?: T; session?: T };
    if (r.data !== undefined) return r.data;
    if (r.session !== undefined) return r.session;
    return res as T;
}
