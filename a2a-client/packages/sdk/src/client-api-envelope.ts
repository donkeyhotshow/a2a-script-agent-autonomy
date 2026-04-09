/**
 * Unwrap Client API JSON: legacy `{ success, data }` or `{ success, session }` (Vite-aligned).
 * A2A invoke: `{ success, data }` → inner payload (same as Vite `unwrapA2aResponse`).
 *
 * Source: `shared/client-api-envelope.mjs` (single module for SDK + Vite).
 */
export { unwrapEnvelope, unwrapA2aInvokeBody, parseA2aInvokeResponse, normalizePromisePollStatus, validateClientResultPayload, isRecoverableAsyncSnapshot } from '@a2a/shared/client-api-envelope.mjs';

/** @deprecated Use unwrapA2aInvokeBody */
export { unwrapA2aInvokeBody as unwrapA2aSuccessPayload } from '@a2a/shared/client-api-envelope.mjs';

