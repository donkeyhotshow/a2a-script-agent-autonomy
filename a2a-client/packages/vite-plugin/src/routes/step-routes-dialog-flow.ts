import fs from 'fs';
import crypto from 'node:crypto';
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
import { A2A_TRACE_CONTEXT_KEY } from '@a2a-client/shared/a2a-trace-constants.mjs';

function logClientApiNext(evt, fields) {
    console.log(
        JSON.stringify({
            ts: new Date().toISOString(),
            svc: 'a2a-client-api',
            evt,
            ...fields,
        })
    );
}

/**
 * Contract: build transport ack payload for /sessions/{id}/next.
 * Inputs:
 * - success: boolean execution status for this transport call.
 * - step: number current persisted step index.
 * - promiseId: string|null async request id when server returned deferred execution.
 * - error: string|null terminal transport error detail.
 * Output:
 * - JSON-serializable object { success, step, promiseId, error }.
 * Side effects:
 * - None (pure function).
 * Assumption:
 * - Caller owns HTTP status code; this object is body-only.
 */
function createResponseAckObject(success, step, promiseId, error = null, traceId = null) {
    const o = {
        success: success,
        step: step,
        promiseId: promiseId,
        error: error
    };
    if (traceId) {
        o.traceId = traceId;
    }
    return o;
}

function respondJsonOnce(res, statusCode, payload) {
    if (res.writableEnded || res.headersSent) return;
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(payload));
}

export function handleNextStep({ cwd, path, req, res, storageMode = 'storage' }) {
    const nextMatch = path.match(/^\/sessions\/([^/]+)\/next$/);
    if (!(req.method === 'POST' && nextMatch)) {
        return false;
    }

    const sessionId = nextMatch[1];
    if (!validateSessionId(sessionId)) {
        respondJsonOnce(res, 400, { error: 'Invalid session ID' });
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
                respondJsonOnce(res, 404, { error: 'Session not found (unknown project)' });
                return;
            }

            const session = loadSessionData({ cwd, sessionId, projectPath });
            if (!session) {
                respondJsonOnce(res, 404, { error: 'Session not found' });
                return;
            }

            const inboundTraceRaw = req.headers?.['x-a2a-trace-id'];
            const inboundTrace = typeof inboundTraceRaw === 'string' ? inboundTraceRaw.trim() : '';
            const traceId = inboundTrace || crypto.randomUUID();

            // Constraint: async-only single-flight. Reject overlapping /next calls to avoid router-state race conditions.
            const activeAsync = stepHandlers.getActiveAsyncWork(cwd, sessionId);
            if (session.asyncPending === true || activeAsync) {
                logClientApiNext('http.next.rejected', {
                    trace_id: traceId,
                    session_id: sessionId,
                    step: Number(session.currentStep) || 1,
                    reason: 'async_pending',
                });
                respondJsonOnce(res, 409, {
                    error: 'async_pending',
                    message: 'Poll GET /api/a2a/sessions/{id}/async until idle before sending another /next.',
                    traceId,
                });
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
                respondJsonOnce(res, 400, { error: submitResultError });
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
            mergedContext[A2A_TRACE_CONTEXT_KEY] = traceId;

            const requestToServer = prepareServerRequest({
                mergedContext,
                submitResult,
                effectiveTask,
            });

            saveRequestToServer({ cwd, sessionId, nextStepNum, requestToServer });
            logClientApiNext('http.next.accepted', {
                trace_id: traceId,
                session_id: sessionId,
                step: nextStepNum,
            });

            sendHttpRequest({
                traceId,
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

                            respondJsonOnce(
                                res,
                                200,
                                createResponseAckObject(true, nextStepNum, promiseData.promiseId, null, traceId)
                            );
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

                        if (!hasServer) {
                            const errBody = createResponseAckObject(false, nextStepNum, null, 'A2A invoke failed', traceId);
                            respondJsonOnce(res, xhrRes.statusCode >= 400 ? xhrRes.statusCode : 502, errBody);
                            return;
                        }

                        respondJsonOnce(res, 200, createResponseAckObject(true, finalStepNum, null, null, traceId));
                    } catch (e) {
                        console.error('[vite-plugin-a2a] Error in A2A response handler:', e?.stack || e?.message || e);
                        const detail =
                            process.env.NODE_ENV !== 'production' ? String(e?.message || e) : undefined;
                        respondJsonOnce(
                            res,
                            500,
                            detail ? { error: 'Internal server error', detail } : { error: 'Internal server error' }
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

                        respondJsonOnce(
                            res,
                            503,
                            createResponseAckObject(false, nextStepNum, null, 'A2A server unavailable: ' + detail, traceId)
                        );
                    } catch (err) {
                        console.error('[vite-plugin-a2a] Error in A2A error handler:', err.message);
                        respondJsonOnce(res, 500, { error: 'Internal server error' });
                    }
                },
            });
        } catch (e) {
            respondJsonOnce(res, 400, { error: String(e?.message || e) });
        }
    });

    return true;
}