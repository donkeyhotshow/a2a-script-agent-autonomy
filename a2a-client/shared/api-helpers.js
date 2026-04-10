/**
 * Thin shim: repo code under `a2a-client/packages/*` imports `../../../shared/api-helpers.js`
 * (resolved to this file). Implementation lives at repo root `shared/api-helpers.js`.
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
  isPromiseFailed,
} from '../../shared/api-helpers.js';
