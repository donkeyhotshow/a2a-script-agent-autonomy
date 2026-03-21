/**
 * Route Builders & Utilities
 * Extracted pure functions from stepRoutes.js
 */

/**
 * A2A Server wraps payloads as { success: true, data: { execute, context, ... } }.
 * Unwrap to the inner object when present.
 */
export function unwrapA2aResponse(serverResponse) {
    if (!serverResponse || typeof serverResponse !== 'object') return null;
    if (
        serverResponse.success === true &&
        serverResponse.data !== undefined &&
        typeof serverResponse.data === 'object'
    ) {
        return serverResponse.data;
    }
    return serverResponse;
}

/**
 * Resolve execute for Client API / UI — checks envelope .data.execute and legacy paths.
 */
export function extractA2aExecute(serverResponse) {
    const inner = unwrapA2aResponse(serverResponse);
    if (!inner) return null;
    return inner.execute ?? inner.result?.execute ?? null;
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
        Object.assign(base, serverResponse.context);
    }

    if (inner?.context) {
        Object.assign(base, inner.context);
    }

    if (serverResponse?.result?.context) {
        Object.assign(base, serverResponse.result.context);
    }

    if (inner?.result?.context) {
        Object.assign(base, inner.result.context);
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
    const payload = {
        timestamp: new Date().toISOString(),
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


