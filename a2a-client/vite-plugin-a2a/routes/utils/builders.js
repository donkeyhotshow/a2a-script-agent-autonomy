/**
 * Route Builders & Utilities
 * Extracted pure functions from stepRoutes.js
 */

import { unwrapA2aInvokeBody } from '../../../shared/client-api-envelope.mjs';

/**
 * Whitelist context fields from invoke responses (keep in sync with
 * packages/sdk/src/server/lib/context-invoke-patch.ts).
 * @param {unknown} src
 * @returns {Record<string, unknown>}
 */
export function pickInvokeContextPatch(src) {
    if (!src || typeof src !== 'object' || Array.isArray(src)) {
        return {};
    }
    const o = src;
    const out = {};
    if (typeof o.task === 'string' && o.task.length > 0) {
        out.task = o.task;
    }
    if (o.execution && typeof o.execution === 'object' && !Array.isArray(o.execution)) {
        out.execution = o.execution;
    }
    if (Array.isArray(o.history)) {
        out.history = o.history;
    }
    if (o.files && typeof o.files === 'object' && !Array.isArray(o.files)) {
        out.files = o.files;
    }
    if (o.scratchpad && typeof o.scratchpad === 'object' && !Array.isArray(o.scratchpad)) {
        out.scratchpad = o.scratchpad;
    }
    if (o.workbench !== undefined) {
        out.workbench = o.workbench;
    }
    if (o.ragResults !== undefined) {
        out.ragResults = o.ragResults;
    }
    if (typeof o.version === 'string') {
        out.version = o.version;
    }
    if (o.vite_config && typeof o.vite_config === 'object' && !Array.isArray(o.vite_config)) {
        out.vite_config = o.vite_config;
    }
    if (o.aliases && typeof o.aliases === 'object' && !Array.isArray(o.aliases)) {
        out.aliases = o.aliases;
    }
    return out;
}

/**
 * A2A Server wraps payloads as { success: true, data: { execute, context, ... } }.
 * Unwrap to the inner object when present (shared with @a2a/sdk client-api-envelope).
 */
export function unwrapA2aResponse(serverResponse) {
    return unwrapA2aInvokeBody(serverResponse);
}

/**
 * Resolve execute for Client API / UI — checks envelope .data.execute and legacy paths.
 */
export function extractA2aExecute(serverResponse) {
    const inner = unwrapA2aResponse(serverResponse);
    if (!inner) return null;
    return inner.execute ?? inner.result?.execute ?? null;
}

function historyEntryUserText(entry) {
    if (!entry || typeof entry !== 'object') return '';
    if (typeof entry.message === 'string') return entry.message;
    if (typeof entry.content === 'string') return entry.content;
    return '';
}

/**
 * Dialog invoke: align context.history with this user line (previous server history often ends with assistant).
 * @param {Record<string, unknown>} mergedContext - mutable context (expects execution.action === 'dialog' from caller)
 * @param {string} effectiveTask - user utterance from result.message
 */
export function mergeDialogHistoryForInvoke(mergedContext, effectiveTask) {
    if (!mergedContext || typeof mergedContext !== 'object') return;
    if (!effectiveTask || typeof effectiveTask !== 'string') return;
    const h = Array.isArray(mergedContext.history) ? mergedContext.history.slice() : [];
    const last = h[h.length - 1];
    if (!last || last.role === 'assistant') {
        h.push({ role: 'user', message: effectiveTask });
        mergedContext.history = h;
        return;
    }
    if (last.role === 'user' && historyEntryUserText(last) !== effectiveTask) {
        h[h.length - 1] = { role: 'user', message: effectiveTask };
        mergedContext.history = h;
    }
}

/**
 * Merge response context from multiple sources
 * @param sessionId - session identifier (adds session_id if missing)
 * @param fallbackContext - base context object
 * @param serverResponse - server response (extracts context)
 * @returns merged context object
 */
export function mergeResponseContext(sessionId, fallbackContext = {}, serverResponse = null) {
    const base = { ...(fallbackContext || {}) };
    const inner = unwrapA2aResponse(serverResponse);

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

/**
 * Build step record payload from server response
 * @param params.sessionId - session identifier
 * @param params.stepNum - step number  
 * @param params.serverResponse - server response data
 * @param params.messages - message array
 * @param params.fallbackContext - fallback context
 * @returns step record or null if invalid
 */
export function buildStepRecord({ sessionId, stepNum, serverResponse, messages = [], fallbackContext = {} }) {
    if (!serverResponse) return null;
    
    const context = mergeResponseContext(sessionId, fallbackContext, serverResponse);

    const execute = extractA2aExecute(serverResponse);
    
    // Note: step number is derived from folder path, not stored in JSON
    // timestamp is a technical field, not part of protocol
    const payload = {
        execute: execute ?? null,
        context,
        messages
    };
    
    return payload;
}

/**
 * Validate step directory exists (creates if not)
 * @param cwd - current working directory
 * @param sessionId - session ID
 * @param stepNum - step number
 * @returns step directory path
 */
export async function ensureStepDir(cwd, sessionId, stepNum) {
    const { getNewStepDir } = await import('../../storage/newSessions.js');
    const fs = await import('fs');
    const stepDir = getNewStepDir(cwd, sessionId, stepNum);
    if (!fs.existsSync(stepDir)) {
        fs.mkdirSync(stepDir, { recursive: true });
    }
    return stepDir;
}


