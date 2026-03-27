/**
 * Step route handlers - Pure handler logic
 * No routing, no fs, no proxy - just data processing
 */

import { isValidSessionId } from '../middleware/validators.js';
import { buildWebExecute } from '../utils/web-execute-dto.js';
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
} from '../../storage/newSessions.js';

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
    return { ...step, execute: buildWebExecute(step.execute) };
}

export async function handlePostStep(sessionId, body, cwd) {
    void sessionId;
    void body;
    void cwd;
    throw new Error('POST /sessions/:id/steps is deprecated. Use POST /sessions/:id/next.');
}
