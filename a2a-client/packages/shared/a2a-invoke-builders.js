/**
 * Canonical implementation lives in a2a-client (single source of truth).
 * Helper functions for A2A invoke body processing.
 */

import { unwrapA2aInvokeBody } from './client-api-envelope.mjs';
import { pickInvokeContextPatch } from './context-invoke-patch.mjs';

export function extractA2aExecute(serverResponse) {
    const inner = unwrapA2aInvokeBody(serverResponse);
    return inner?.execute || null;
}

export function mergeResponseContext(fallbackContext = {}, serverResponse = null) {
    const base = { ...(fallbackContext || {}) };
    if (serverResponse?.context) {
        const patch = pickInvokeContextPatch(serverResponse.context);
        return { ...base, ...patch };
    }
    return base;
}

export function sanitizeContextForServer(context) {
    if (!context || typeof context !== 'object' || Array.isArray(context)) {
        return {};
    }
    const out = { ...context };
    // Remove sensitive fields if any
    return out;
}

export function sanitizeInvokeBodyForA2aUpstream(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return {};
    }
    const out = { ...body };
    // Sanitize for upstream
    return out;
}