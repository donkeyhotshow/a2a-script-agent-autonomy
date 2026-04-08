import fs from 'fs';
import {
    buildSubmitResult,
    normalizeRouterStepSubmit,
    routerFormHasChoices,
    validateSubmitResult,
} from './step-routes-router-flow.js';
import { maybeChainAgentTools } from './step-routes-agent-flow.js';
import { getA2aServerBaseUrl } from '@a2a-client/shared/a2a-server-base.js';
import * as stepHandlers from './handlers/step-handlers.js';
import { validateSessionId, resolveProjectStorage, loadSessionData, saveSessionData } from './session-manager.js';
import { mergeContext, processTaskAndContext, prepareServerRequest } from './context-processor.js';
import { sendHttpRequest } from './http-invoker.js';
import { parseServerResponse, processResponseData, extractAssistantMessage } from './response-handler.js';
import { saveClientResult, saveRequestToServer, ensureStepDirectory, saveServerPromise, saveStepData, updateSessionAfterResponse, updateSessionForPromise, finalizeSession } from './persistence-manager.js';
import { unwrapA2aResponse } from './utils/builders.js';

/**
 * Helper function to create response acknowledgment objects consistently.
 * @param {boolean} success - Whether the operation was successful
 * @param {number} step - The step number
 * @param {string|null} promiseId - The promise ID or null
 * @param {string|null} error - Optional error message
 * @returns {Object} Response acknowledgment object
 */
function createResponseAckObject(success, step, promiseId, error = null) {
    return {
        success: success,
        step: step,
        promiseId: promiseId,
        error: error
    };
}

export function handleNextStep({ cwd, path, req, res, storageMode = 'storage' }) {
    const nextMatch = path.match(/^\/sessions\/([^/]+)\/next$/);
    if (!(req.method === 'POST' && nextMatch)) {
        return false;
    }

    const sessionId = nextMatch[1];
    if (!validateSessionId(sessionId)) {
        res.writeHead(400).end(JSON.stringify({ error: 'Invalid session ID' }));
        return true;
    }

    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
        try {
            const d = JSON.parse(body || '{}');

            const projectStorage = resolveProjectStorage({
                cwd,
                sessionId,
                projectId: d.projectId,
                projectRoot: d.projectRoot,
                storageMode,
            });
            const projectPath = projectStorage?.projectPath;

            if (storageMode === 'project' && !projectPath) {
                res.writeHead(404).end(JSON.stringify({ error: 'Session not found (unknown project)' }));
                return;
            }

            const session = loadSessionData({ cwd, sessionId, projectPath });
            if (!session) {
                res.writeHead(404).end(JSON.stringify({ error: 'Session not found' }));
                return;
            }

            // Orange / async-only: no overlapping turns — duplicate /next races the pipeline and breaks router beats.
            const activeAsync = stepHandlers.getActiveAsyncWork(cwd, sessionId);
            if (session.asyncPending === true || activeAsync) {
                res.writeHead(409).setHeader('Content-Type', 'application/json').end(JSON.stringify({
                    error: 'async_pending',
                    message: 'Poll GET /api/a2a/sessions/{id}/async until idle before sending another /next.',
                }));
                return;
            }

            const currentStep = Number(session.currentStep) || 1;
            let prevStepData = stepHandlers.loadServerResponse(cwd, sessionId, currentStep);
            if (!prevStepData && currentStep === 1) {
                prevStepData = { context: session.context, execute: session.execute };
            }
            if (!prevStepData && currentStep > 1) {
                prevStepData = stepHandlers.loadServerResponse(cwd, sessionId, currentStep - 1);
            }
            const hasChoices = routerFormHasChoices(prevStepData);

            let submitResult = buildSubmitResult({ body: d, hasChoices });
            submitResult = normalizeRouterStepSubmit(submitResult, prevStepData);
            const submitResultError = validateSubmitResult(submitResult);
            if (submitResultError) {
                res.writeHead(400).end(JSON.stringify({ error: submitResultError }));
                return;
            }

            const nextStepNum = currentStep + 1;
            ensureStepDirectory({ cwd, sessionId, nextStepNum });
            saveClientResult({ cwd, sessionId, nextStepNum, submitResult });

            let mergedContext = mergeContext({
                prevStepData,
                sessionContext: session.context || {},
                submitResult,
                hasChoices,
            });

            const { effectiveTask, mergedContext: updatedMergedContext } = processTaskAndContext({
                mergedContext,
                submitResult,
                prevStepData,
            });
            mergedContext = updatedMergedContext;

            const requestToServer = prepareServerRequest({
                mergedContext,
                submitResult,
                effectiveTask,
            });

            saveRequestToServer({ cwd, sessionId, nextStepNum, requestToServer });

            sendHttpRequest({
                requestToServer,
                onResponse: async (xhrRes, data) => {
                    try {
                        const a2aData = parseServerResponse(data);
                        const { serverResponse, promiseData } = processResponseData({ a2aData, xhrRes });

                        const hasPromise = !!promiseData?.promiseId;
                        const hasServer = !!serverResponse;

                        if (hasPromise && !hasServer) {
                            updateSessionForPromise({ session, nextStepNum, submitResult, promiseData, mergedContext });
                            saveSessionData({ projectPath, session });
                            saveServerPromise({ cwd, sessionId, nextStepNum, promiseData });

res.setHeader('Content-Type', 'application/json');
                             res.end(JSON.stringify(createResponseAckObject(true, nextStepNum, promiseData.promiseId)));
                            return;
                        }

                        const a2aPayload = unwrapA2aResponse(serverResponse) || serverResponse;
                        const history = a2aPayload?.context?.history || serverResponse?.result?.context?.history;
                        const assistantMessage = extractAssistantMessage({ serverResponse, a2aPayload, history });

                        const savedContext = updateSessionAfterResponse({
                            session,
                            nextStepNum,
                            submitResult,
                            assistantMessage,
                            serverResponse,
                            mergedContext,
                        });

                        const postExec = savedContext?.execution;
                        const serverOnRouterBeat =
                            postExec &&
                            typeof postExec === 'object' &&
                            postExec.action === 'task' &&
                            postExec.step === 'router';

                        let finalStepNum = nextStepNum;
                        let finalServerResponse = serverResponse;
                        let finalSavedContext = savedContext;

                        const hasRealData = serverResponse || submitResult;
                        if (hasRealData) {
                            saveStepData({
                                cwd,
                                sessionId,
                                stepNum: nextStepNum,
                                serverResponse,
                                messages: session.messages,
                                mergedContext: savedContext,
                                submitResult,
                            });
                        }

                        if (serverResponse && hasServer && !hasPromise && !serverOnRouterBeat) {
                            const agentResult = await maybeChainAgentTools({
                                cwd,
                                sessionId,
                                a2aServerUrl: getA2aServerBaseUrl(),
                                startStepNum: nextStepNum,
                                serverResponse,
                                mergedContext,
                                messages: session.messages || [],
                            });
                            finalStepNum = agentResult.stepNum;
                            finalServerResponse = agentResult.serverResponse;
                            finalSavedContext = agentResult.savedContext;
                        }

                        finalizeSession({ session, finalStepNum, finalSavedContext, finalServerResponse });
                        saveSessionData({ projectPath, session });

                        res.setHeader('Content-Type', 'application/json');
                        if (!hasServer) {
const errBody = createResponseAckObject(false, nextStepNum, null, 'A2A invoke failed');
                            res.writeHead(xhrRes.statusCode >= 400 ? xhrRes.statusCode : 502);
                            res.end(JSON.stringify(errBody));
                            return;
                        }

res.end(JSON.stringify(createResponseAckObject(true, finalStepNum, null)));
                    } catch (e) {
                        console.error('[vite-plugin-a2a] Error in A2A response handler:', e?.stack || e?.message || e);
                        const detail =
                            process.env.NODE_ENV !== 'production' ? String(e?.message || e) : undefined;
                        res.writeHead(500).end(
                            JSON.stringify(
                                detail ? { error: 'Internal server error', detail } : { error: 'Internal server error' }
                            )
                        );
                    }
                },
                onError: (e) => {
                    try {
                        const detail =
                            (e && (e.message || e.code)) ||
                            (typeof e === 'string' ? e : '') ||
                            String(e);
                        console.error('[vite-plugin-a2a] A2A Server request failed:', detail);
                        session.currentStep = nextStepNum;
                        session.updatedAt = new Date().toISOString();
                        saveSessionData({ projectPath, session });

                        res.setHeader('Content-Type', 'application/json');
                        res.writeHead(503);
res.end(JSON.stringify(createResponseAckObject(false, nextStepNum, null, 'A2A server unavailable: ' + detail)));
                    } catch (err) {
                        console.error('[vite-plugin-a2a] Error in A2A error handler:', err.message);
                        res.writeHead(500).end(JSON.stringify({ error: 'Internal server error' }));
                    }
                },
            });
        } catch (e) {
            res.writeHead(400).end(JSON.stringify({ error: String(e?.message || e) }));
        }
    });

    return true;
}