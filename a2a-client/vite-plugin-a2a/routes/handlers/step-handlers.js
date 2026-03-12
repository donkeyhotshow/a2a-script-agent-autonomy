/**
 * Step route handlers - Pure handler logic
 * No routing, no fs, no proxy - just data processing
 */

import { isValidSessionId } from '../middleware/validators.js';
import { buildStepRecord, mergeResponseContext } from '../utils/builders.js';

export function handleListSteps(sessionId, cwd) {
    if (!isValidSessionId(sessionId)) throw new Error('Invalid session ID');
    return listNewSteps(cwd, sessionId);
}

export function handleStepDetail(sessionId, stepNum, cwd) {
    if (!isValidSessionId(sessionId)) throw new Error('Invalid session ID');
    const step = loadNewStep(cwd, sessionId, stepNum);
    if (!step) throw new Error('Step not found');
    return step;
}

export function handlePostStep(sessionId, body, cwd) {
    if (!isValidSessionId(sessionId)) throw new Error('Invalid session ID');
    const d = body;
    const session = loadNewSession(cwd, sessionId) || { id: sessionId, currentStep: 1 };
    session.messages = session.messages || [];
    
    const nextStepNum = (session.currentStep || 0) + 1;
    
    if (d.result) {
        saveClientResult(cwd, sessionId, nextStepNum, d.result);
    }

    // ... full post logic extracted
    // (stub for now, full extract in next edits)

    return { success: true };
}

// Export all fs utils for stepUtils.js
export { loadNewSession, saveNewSession, getNewStepDir, listNewSteps, loadNewStep, saveNewStep, saveServerResponse, saveServerPromise, saveClientResult, saveRequestToServer, loadServerResponse, loadServerPromise, loadStepFile, getNewSessionLatestStep } from '../../storage/newSessions.js';

