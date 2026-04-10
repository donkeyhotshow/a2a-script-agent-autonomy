/**
 * Route Builders & Utilities
 * Extracted pure functions from stepRoutes.ts
 */

import { unwrapA2aInvokeBody } from '@a2a-client/shared/client-api-envelope.js';
import { pickInvokeContextPatch } from '@a2a-client/shared/context-invoke-patch.js';
import {
    extractA2aExecute,
    mergeResponseContext,
    sanitizeContextForServer,
    sanitizeInvokeBodyForA2aUpstream,
} from '@a2a-client/shared/a2a-invoke-builders.js';

export {
    pickInvokeContextPatch,
    extractA2aExecute,
    mergeResponseContext,
    sanitizeContextForServer,
    sanitizeInvokeBodyForA2aUpstream,
};

export {
    stripSpuriousTaskEchoFromDialogHistory,
    mergeDialogHistoryForInvoke,
} from '@a2a-client/shared/dialog-invoke-history.js';

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
    const { getNewStepDir } = await import('../@a2a-client/storage/newSessions.ts');
    const fs = await import('fs');
    const stepDir = getNewStepDir(cwd, sessionId, stepNum);
    if (!fs.existsSync(stepDir)) {
        fs.mkdirSync(stepDir, { recursive: true });
    }
    return stepDir;
}
