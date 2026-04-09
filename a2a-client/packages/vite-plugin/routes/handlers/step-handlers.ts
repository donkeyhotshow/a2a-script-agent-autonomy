/**
 * Step route handlers - Pure handler logic
 * No routing, no fs, no proxy - just data processing
 */

import { mergeResponseContext } from '@a2a/shared/a2a-invoke-builders.mjs';
import { isValidSessionId } from '../middleware/validators.ts';
import { buildExecuteProjection } from '../utils/execute-projection-dto.ts';
import {
    listNewSteps,
    loadNewStep,
    loadNewSession,
    saveNewSession,
    getNewStepDir,
    saveNewStep,
    saveServerResponse,
    saveServerPromise,
    saveClientResult,
    saveRequestToServer,
    loadServerResponse,
    loadServerPromise,
    loadStepFile,
    getNewSessionLatestStep,
} from '../@a2a/storage/newSessions.ts';

// Re-export isValidSessionId for external usage
export { isValidSessionId };

export {
    loadNewSession,
    saveNewSession,
    getNewStepDir,
    listNewSteps,
    loadNewStep,
    saveNewStep,
    saveServerResponse,
    saveServerPromise,
    saveClientResult,
    saveRequestToServer,
    loadServerResponse,
    loadServerPromise,
    loadStepFile,
    getNewSessionLatestStep,
};

export function handleListSteps(sessionId, cwd) {
    if (!isValidSessionId(sessionId)) throw new Error('Invalid session ID');
    return listNewSteps(cwd, sessionId);
}

export function handleStepDetail(sessionId, stepNum, cwd) {
    if (!isValidSessionId(sessionId)) throw new Error('Invalid session ID');
    const step = loadNewStep(cwd, sessionId, stepNum);
    if (!step) throw new Error('Step not found');
    if (!step.execute) return step;
    return {
        ...step,
        execute: buildExecuteProjection(step.execute, step.context ? { context: step.context } : undefined),
    };
}

/**
 * Build step record from promise status (for async flow completion).
 * @param {Object} params - Parameters
 * @param {string} params.sessionId - Session ID
 * @param {number} params.stepNum - Step number
 * @param {Object} params.serverResponse - Server response/promise status
 * @param {Array} params.messages - Messages array
 * @param {Object} params.fallbackContext - Fallback context
 * @returns {Object} Step record
 */
export function buildStepRecordFromPromise({ sessionId, stepNum, serverResponse, messages, fallbackContext }) {
    if (!serverResponse) return null;
    
    const stepRecord = {
        step: stepNum,
        timestamp: new Date().toISOString(),
    };
    
    // Copy execute from promise status if present
    if (serverResponse.execute) {
        stepRecord.execute = serverResponse.execute;
    }
    
    // Copy result if present
    if (serverResponse.result) {
        stepRecord.result = serverResponse.result;
    }
    
    // Same merge as buildStepRecord (unwrap data.context + pickInvokeContextPatch)
    const ctx = mergeResponseContext(fallbackContext || {}, serverResponse);
    if (Object.keys(ctx).length > 0) {
        stepRecord.context = ctx;
    }
    
    // Include messages if provided
    if (messages && messages.length > 0) {
        stepRecord.messages = messages;
    }
    
    return stepRecord;
}

/**
 * Get active async work for a session (for polling status).
 * @param {string} cwd - Working directory
 * @param {string} sessionId - Session ID
 * @returns {Object|null} Active async work info or null
 */
export function getActiveAsyncWork(cwd, sessionId) {
    const steps = listNewSteps(cwd, sessionId);
    for (const stepNum of steps) {
        const serverPromise = loadServerPromise(cwd, sessionId, stepNum);
        if (serverPromise?.promiseId) {
            const isPending = serverPromise.status === 'processing' ||
                             serverPromise.status === 'pending' ||
                             serverPromise.status === 'waiting';
            if (isPending) {
                return {
                    stepNum: stepNum,
                    promiseId: serverPromise.promiseId,
                    status: serverPromise.status
                };
            }
        }
    }
    return null;
}

