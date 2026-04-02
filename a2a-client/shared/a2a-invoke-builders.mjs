/**
 * Shared execute/context merge for Vite step routes + @a2a/sdk agent chain.
 *
 * Invoke `context` (this object): keep `history` as an **array** (`[]` when empty). Do not send root-level
 * `history` outside `context` — the server reads `context.history` (see `resolveHistoryLength`).
 */

import { unwrapA2aInvokeBody } from './client-api-envelope.mjs';
import { pickInvokeContextPatch } from './context-invoke-patch.mjs';

export function extractA2aExecute(serverResponse) {
    const inner = unwrapA2aInvokeBody(serverResponse);
    if (!inner) return null;
    return inner.execute ?? inner.result?.execute ?? null;
}

export function mergeResponseContext(fallbackContext = {}, serverResponse = null) {
    const base = { ...(fallbackContext || {}) };
    const inner = unwrapA2aInvokeBody(serverResponse);

    if (serverResponse?.context) {
        Object.assign(base, pickInvokeContextPatch(serverResponse.context));
    }

    if (inner?.context) {
        Object.assign(base, pickInvokeContextPatch(inner.context));
    }

    if (serverResponse?.result?.context) {
        Object.assign(base, pickInvokeContextPatch(serverResponse.result.context));
    }

    if (inner?.result?.context) {
        Object.assign(base, pickInvokeContextPatch(inner.result.context));
    }

    return base;
}

export function sanitizeContextForServer(context) {
    if (!context || typeof context !== 'object' || Array.isArray(context)) {
        return {};
    }
    const safe = {...context};
    delete safe.projectId;
    delete safe.projectRoot;
    delete safe.clientSessionId;
    delete safe.sessionId;
    if (!Array.isArray(safe.history)) {
        safe.history = [];
    }
    return safe;
}
