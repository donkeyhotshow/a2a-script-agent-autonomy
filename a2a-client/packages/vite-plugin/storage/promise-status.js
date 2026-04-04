/**
 * Promise polling states that mean async work is still in flight (step server-promise.json).
 */
export function isActivePromiseStatus(status) {
    return status === 'pending' || status === 'processing' || status === 'waiting';
}

/**
 * Terminal state for GET /api/v1/requests/:id/result inner payload (same rules as promise poll in stepRoutes).
 * @param {object | null | undefined} promiseStatus
 */
export function isPromisePollComplete(promiseStatus) {
    if (!promiseStatus || typeof promiseStatus !== 'object') return false;
    if (promiseStatus.execute != null) return true;
    const st = promiseStatus.status;
    return st === 'completed' || st === 'done';
}

/**
 * True when server-promise.json can be removed next to server-response.json (completed snapshot or not in-flight).
 */
export function isRemovablePromiseBesideResponse(prom) {
    if (!prom || typeof prom !== 'object') return true;
    if (isPromisePollComplete(prom)) return true;
    return !isActivePromiseStatus(prom.status);
}
