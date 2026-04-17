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

const CLIENT_SCOPE_KEYS = ['sessionId', 'session_id', 'projectId', 'projectRoot'];

export function mergeResponseContext(fallbackContext = {}, serverResponse = null) {
    const base = { ...(fallbackContext || {}) };
    // Strip client-internal fields that must not appear in persisted server-response.json
    for (const k of CLIENT_SCOPE_KEYS) {
        delete base[k];
    }
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
    for (const k of CLIENT_SCOPE_KEYS) {
        delete out[k];
    }
    return out;
}

export function sanitizeInvokeBodyForA2aUpstream(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return {};
    }
    const out = { ...body };
    // Also strip any client-internal fields that may have escaped to the top-level body
    for (const k of CLIENT_SCOPE_KEYS) {
        delete out[k];
    }
    return out;
}