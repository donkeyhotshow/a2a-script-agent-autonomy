/**
 * Canonical implementation lives in a2a-client (single source of truth).
 */
export {
    normalizeApiBase,
    buildClientA2aUrl,
    buildFetchHeaders,
    normalizeSessionResponse,
    normalizeSessionsList,
    DEFAULT_POLL_INTERVAL,
    DEFAULT_POLL_TIMEOUT,
    isPromiseResolved,
    isPromiseFailed
} from './api-helpers.mjs';
