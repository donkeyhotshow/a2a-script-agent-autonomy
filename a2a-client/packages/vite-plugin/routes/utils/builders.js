/**
 * Route Builders & Utilities
 * Extracted pure functions from stepRoutes.js
 */

import { unwrapA2aInvokeBody } from '@a2a-client/shared/client-api-envelope.mjs';
import { pickInvokeContextPatch } from '@a2a-client/shared/context-invoke-patch.mjs';
import {
    extractA2aExecute,
    mergeResponseContext,
    sanitizeContextForServer,
    sanitizeInvokeBodyForA2aUpstream,
} from '@a2a-client/shared/a2a-invoke-builders.mjs';

export {
    pickInvokeContextPatch,
    extractA2aExecute,
    mergeResponseContext,
    sanitizeContextForServer,
    sanitizeInvokeBodyForA2aUpstream,
};

/**
 * A2A Server wraps payloads as { success: true, data: { execute, context, ... } }.
 * Unwrap to the inner object when present (shared with @a2a/sdk client-api-envelope).
 */
export function unwrapA2aResponse(serverResponse) {
    return unwrapA2aInvokeBody(serverResponse);
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
        // Different user message - append new entry (don't replace, this is new dialog turn)
        h.push({ role: 'user', message: effectiveTask });
        mergedContext.history = h;
    }
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
    
    const context = mergeResponseContext(fallbackContext, serverResponse);

    const execute = extractA2aExecute(serverResponse);

    const payload = {
        ...(execute != null && typeof execute === 'object' ? {execute} : {}),
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
