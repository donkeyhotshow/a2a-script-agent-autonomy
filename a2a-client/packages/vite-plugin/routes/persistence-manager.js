import fs from 'fs';
import * as stepHandlers from './handlers/step-handlers.js';
import {
    buildStepRecord,
    extractA2aExecute,
    mergeResponseContext,
    unwrapA2aResponse,
} from './utils/builders.js';

/**
 * Appends a user message to session.messages if submitResult contains a message
 * @param session - The session object
 * @param submitResult - The submit result object that may contain a message
 * @param nextStepNum - The step number to associate with the message
 */
function appendUserMessageIfExists(session, submitResult, nextStepNum) {
    if (submitResult?.message) {
        session.messages = session.messages || [];
        session.messages.push({
            role: 'user',
            content: submitResult.message,
            step: nextStepNum,
        });
    }
}

export function saveClientResult({ cwd, sessionId, nextStepNum, submitResult }) {
    stepHandlers.saveClientResult(cwd, sessionId, nextStepNum, { result: submitResult });
}

export function saveRequestToServer({ cwd, sessionId, nextStepNum, requestToServer }) {
    stepHandlers.saveRequestToServer(cwd, sessionId, nextStepNum, requestToServer);
}

export function ensureStepDirectory({ cwd, sessionId, nextStepNum }) {
    const stepDir = stepHandlers.getNewStepDir(cwd, sessionId, nextStepNum);
    if (!fs.existsSync(stepDir)) fs.mkdirSync(stepDir, { recursive: true });
    return stepDir;
}

export function saveServerPromise({ cwd, sessionId, nextStepNum, promiseData }) {
    stepHandlers.saveServerPromise(cwd, sessionId, nextStepNum, promiseData);
}

export function saveStepData({ cwd, sessionId, stepNum, serverResponse, messages, mergedContext, submitResult }) {
    if (serverResponse) {
        const stepRecord = buildStepRecord({
            sessionId,
            stepNum,
            serverResponse,
            messages: messages || [],
            fallbackContext: mergedContext,
        });
        if (stepRecord) {
            stepHandlers.saveServerResponse(cwd, sessionId, stepNum, stepRecord);
        }
    } else {
        stepHandlers.saveNewStep(cwd, sessionId, stepNum, {
            step: stepNum,
            execute: null,
            messages: messages || [],
            context: mergedContext,
            result: submitResult,
        });
    }
}

export function updateSessionAfterResponse({ session, nextStepNum, submitResult, assistantMessage, serverResponse, mergedContext }) {
    session.currentStep = nextStepNum;
    session.updatedAt = new Date().toISOString();

    appendUserMessageIfExists(session, submitResult, nextStepNum);

    if (assistantMessage) {
        session.messages = session.messages || [];
        session.messages.push({
            role: 'assistant',
            content: assistantMessage,
            step: nextStepNum,
        });
    }

    const savedContext = serverResponse
        ? mergeResponseContext(mergedContext, serverResponse)
        : mergedContext;
    session.context = savedContext;
    session.promiseId = null;

    return savedContext;
}

export function updateSessionForPromise({ session, nextStepNum, submitResult, promiseData, mergedContext }) {
    session.currentStep = nextStepNum;
    session.updatedAt = new Date().toISOString();

    appendUserMessageIfExists(session, submitResult, nextStepNum);

    session.promiseId = promiseData.promiseId;
    session.context = mergedContext;
}

export function finalizeSession({ session, finalStepNum, finalSavedContext, finalServerResponse }) {
    session.currentStep = finalStepNum;
    session.context = finalSavedContext;
    const finalExecute = extractA2aExecute(finalServerResponse);
    if (finalExecute) {
        session.execute = finalExecute;
    }
}