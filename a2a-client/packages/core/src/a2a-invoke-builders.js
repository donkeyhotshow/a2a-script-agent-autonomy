/**
 * Canonical implementation lives in a2a-client (single source of truth).
 * Helper functions for A2A invoke body processing.
 */

import { unwrapA2aInvokeBody } from '../shared/src/client-api-envelope.mjs';

import { pickInvokeContextPatch } from './context-invoke-patch.mjs';

export function extractA2aExecute(serverResponse) {
    const inner = unwrapA2aInvokeBody(serverResponse);
    // ... implementation based on unwrap
}

export function mergeResponseContext(fallbackContext = {}, serverResponse = null) {
    const base = { ...(fallbackContext || {}) };
    // ... merge logic
}

export function sanitizeContextForServer(context) {
    if (!context || typeof context !== 'object' || Array.isArray(context)) {
        return {};
    }
    // ... sanitize
}

export function sanitizeInvokeBodyForA2aUpstream(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return {};
    }
    // ... sanitize
}