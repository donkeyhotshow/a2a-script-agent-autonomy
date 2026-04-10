/**
 * Shared execute/context merge for Vite step routes + @a2a/sdk agent chain.
 */

import { unwrapA2aInvokeBody } from './client-api-envelope.mjs';
import { pickInvokeContextPatch } from './context-invoke-patch.mjs';

export function extractA2aExecute(serverResponse) {
    const inner = unwrapA2aInvokeBody(serverResponse);
    if (!inner) return null;
    return inner.execute ?? inner.result?.execute ?? null;
}

export function mergeResponseContext(sessionId, fallbackContext = {}, serverResponse = null) {
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

    if (sessionId && !base.session_id) {
        base.session_id = sessionId;
    }

    return base;
}
