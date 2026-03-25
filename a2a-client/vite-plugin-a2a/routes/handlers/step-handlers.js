/**
 * Step route handlers - Pure handler logic
 * No routing, no fs, no proxy - just data processing
 */

import { isValidSessionId } from '../middleware/validators.js';
import {
    buildStepRecord,
    mergeResponseContext,
    mergeDialogHistoryForInvoke,
    unwrapA2aResponse,
    extractA2aExecute,
    pickInvokeContextPatch,
} from '../utils/builders.js';
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
    if (!isValidSessionId(sessionId)) throw new Error('Invalid session ID');
    const d = body;
    const session = loadNewSession(cwd, sessionId) || { id: sessionId, currentStep: 1 };
    session.messages = session.messages || [];

    const currentStep = session.currentStep || 1;
    const nextStepNum = currentStep + 1;

    if (d.result) {
        saveClientResult(cwd, sessionId, currentStep, d.result);
    }

    // Build request to A2A server (mirror POST /next)
    const previousStepData = loadServerResponse(cwd, sessionId, currentStep);
    const previousContext = previousStepData?.context || {};

    let mergedContext = { ...previousContext };
    if (previousStepData?.result?.context) {
        const filteredContext = pickInvokeContextPatch(previousStepData.result.context);
        mergedContext = { ...mergedContext, ...filteredContext };
    }

    mergedContext.session_id = sessionId;
    const sessionContext = session.context || {};
    const previousExecution = sessionContext.execution || {};
    if (previousExecution.action && !mergedContext.execution) {
        mergedContext.execution = previousExecution;
    }

    const effectiveTask = d.result?.message;
    const execAction = mergedContext.execution?.action;
    if (effectiveTask && execAction === 'dialog') {
        mergedContext.task = effectiveTask;
        mergeDialogHistoryForInvoke(mergedContext, effectiveTask);
    } else if (effectiveTask && !mergedContext.task) {
        mergedContext.task = effectiveTask;
    }

    const requestToServer = {
        context: mergedContext,
        result: d.result,
        ...(effectiveTask ? { task: effectiveTask } : {}),
    };

    // Save request to server
    const { saveRequestToServer } = await import('../../storage/newSessions.js');
    const { getNewStepDir } = await import('../../storage/newSessions.js');
    const fs = await import('fs');
    const path = await import('path');
    
    const stepDir = getNewStepDir(cwd, sessionId, nextStepNum);
    if (!fs.existsSync(stepDir)) fs.mkdirSync(stepDir, { recursive: true });
    saveRequestToServer(cwd, sessionId, nextStepNum, requestToServer);

    // Call A2A server
    const xhr = require('http');
    const a2aServerUrl = process.env.A2A_SERVER_URL || 'http://localhost:3000';
    const urlObj = new URL(`${a2aServerUrl}/api/v1/invoke`);

    return new Promise((resolve, reject) => {
        const reqOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        };

        const xhrReq = xhr.request(reqOptions, (xhrRes) => {
            let data = '';
            xhrRes.on('data', (chunk) => (data += chunk));
            xhrRes.on('end', async () => {
                try {
                    if (!data || data.trim() === '') {
                        resolve({ success: true, error: 'Empty response from A2A server' });
                        return;
                    }
                    const a2aData = JSON.parse(data);
                    
                    if (a2aData.data?.promiseId) {
                        // Async response - save promise
                        const { saveServerPromise } = await import('../../storage/newSessions.js');
                        const promiseData = {
                            promiseId: a2aData.data.promiseId,
                            status: 'pending',
                            submittedAt: new Date().toISOString()
                        };
                        saveServerPromise(cwd, sessionId, nextStepNum, promiseData);

                        session.currentStep = nextStepNum;
                        session.promiseId = a2aData.data.promiseId;
                        session.status = 'pending';
                        session.updatedAt = new Date().toISOString();
                        if (d.result?.message) {
                            session.messages.push({
                                role: 'user',
                                content: d.result.message,
                                step: nextStepNum
                            });
                        }
                        session.context = mergedContext;
                        const { saveNewSession } = await import('../../storage/newSessions.js');
                        saveNewSession(cwd, session);

                        resolve({ success: true, promiseId: a2aData.data.promiseId, asyncPending: true });
                    } else {
                        // Sync response - save directly
                        const { saveServerResponse, saveNewSession } = await import('../../storage/newSessions.js');
                        const serverResponse = a2aData.success ? a2aData.data : a2aData;

                        const a2aPayload = unwrapA2aResponse(serverResponse) || serverResponse;
                        let assistantMessage =
                            a2aPayload?.execute?.message ||
                            serverResponse?.result?.execute?.message ||
                            a2aPayload?.result?.execute?.message ||
                            serverResponse?.result?.message ||
                            a2aPayload?.message ||
                            serverResponse?.message ||
                            null;
                        const history =
                            a2aPayload?.context?.history || serverResponse?.result?.context?.history;
                        if (!assistantMessage && Array.isArray(history)) {
                            const historyMsg = history.find((h) => h.role === 'assistant');
                            assistantMessage = historyMsg?.message || null;
                        }

                        if (d.result?.message) {
                            session.messages.push({
                                role: 'user',
                                content: d.result.message,
                                step: nextStepNum
                            });
                        }
                        if (assistantMessage) {
                            session.messages.push({
                                role: 'assistant',
                                content: assistantMessage,
                                step: nextStepNum
                            });
                        }

                        const stepRecord = buildStepRecord({
                            sessionId,
                            stepNum: nextStepNum,
                            serverResponse,
                            messages: session.messages || [],
                            fallbackContext: mergedContext,
                        });

                        if (stepRecord) {
                            saveServerResponse(cwd, sessionId, nextStepNum, stepRecord);
                        }

                        session.currentStep = nextStepNum;
                        session.execute = extractA2aExecute(serverResponse);
                        session.context = stepRecord?.context || mergeResponseContext(sessionId, mergedContext, serverResponse);
                        session.status = 'completed';
                        session.updatedAt = new Date().toISOString();
                        session.promiseId = null;
                        saveNewSession(cwd, session);

                        resolve({
                            success: true,
                            execute: extractA2aExecute(serverResponse),
                            asyncPending: false
                        });
                    }
                } catch (e) {
                    resolve({ success: true, error: String(e?.message || e) });
                }
            });
        });
        
        xhrReq.on('error', (e) => {
            resolve({ success: true, error: String(e?.message || e) });
        });
        
        xhrReq.write(JSON.stringify(requestToServer));
        xhrReq.end();
    });
}

// Re-export fs utils for stepUtils.js
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
} from '../../storage/newSessions.js';

