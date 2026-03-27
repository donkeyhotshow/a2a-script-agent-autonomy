import { getStorageMode, isValidSessionId } from './middleware/validators.js';
import {
    mergeResponseContext,
    mergeDialogHistoryForInvoke,
    buildStepRecord,
    extractA2aExecute,
    unwrapA2aResponse,
    pickInvokeContextPatch,
} from './utils/builders.js';
import {
    toMinimalNextAck,
    toPublicSession,
    getActiveAsyncWork,
    attachPromiseMeta,
} from './utils/session-projection-dto.js';
import { buildExecuteProjection } from './utils/execute-projection-dto.js';
import * as stepHandlers from './handlers/step-handlers.js';
import { chainSyncInvokesForAgentTools } from './utils/agent-rag-chain.js';
import { isPromisePollComplete } from '../storage/promise-status.js';

import fs from 'fs';
import http from 'http';
import { normalizePromisePollStatus, validateClientResultPayload } from '../../shared/client-api-envelope.mjs';
import { getA2aServerBaseUrl } from '../../shared/a2a-server-base.js';

const API_PREFIX = '/api/a2a';

/**
 * Poll A2A Server for one promiseId, persist step files, optionally hide transport id from JSON (web UI).
 */
function runViteClientPromisePoll({
    cwd,
    sessionId,
    promiseId,
    currentStep,
    requestUrl,
    res,
    includePromiseIdInBody,
}) {
    const session = stepHandlers.loadNewSession(cwd, sessionId);
    if (!session) {
        res.writeHead(404).end(JSON.stringify({ error: 'Session not found' }));
        return;
    }

    const a2aServerUrl = getA2aServerBaseUrl();
    const urlObj = new URL(`${a2aServerUrl}/api/v1/requests/${promiseId}/result`);

    const reqOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname,
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    };

    const xhrReq = http.request(reqOptions, (xhrRes) => {
        let data = '';
        xhrRes.on('data', (chunk) => (data += chunk));
        xhrRes.on('end', () => {
            console.log(`[VitePlugin-Poll] Status [${xhrRes.statusCode}] for promise [${promiseId}]`);
            try {
                if (!data || data.trim() === '') {
                    throw new Error('Empty response from A2A server');
                }
                const rawResponse = JSON.parse(data);
                const promiseStatus = rawResponse.success ? rawResponse.data : rawResponse;

                const existingPromise = stepHandlers.loadServerPromise(cwd, sessionId, currentStep);
                const updatedPromise = {
                    ...existingPromise,
                    ...promiseStatus,
                    checkedAt: new Date().toISOString(),
                };
                stepHandlers.saveServerPromise(cwd, sessionId, currentStep, updatedPromise);

                if (isPromisePollComplete(promiseStatus)) {
                    const assistantMessage =
                        promiseStatus?.execute?.message ||
                        promiseStatus?.result?.message ||
                        promiseStatus?.message ||
                        null;
                    console.log(`[VitePlugin-Poll] COMPLETED promise [${promiseId}] at step [${currentStep}]. msg:`, assistantMessage);
                    if (assistantMessage) {
                        session.messages = session.messages || [];
                        session.messages.push({
                            role: 'assistant',
                            content: assistantMessage,
                            step: currentStep,
                        });
                    }

                    const stepRecord = buildStepRecord({
                        sessionId,
                        stepNum: currentStep,
                        serverResponse: promiseStatus,
                        messages: session.messages || [],
                        fallbackContext: session.context || {},
                    });
                    if (stepRecord) {
                        stepHandlers.saveServerResponse(cwd, sessionId, currentStep, stepRecord);
                    }

                    if (promiseStatus.execute) session.execute = promiseStatus.execute;
                    session.context = stepRecord?.context || session.context;
                    session.promiseId = null;
                    session.status = 'completed';
                    session.updatedAt = new Date().toISOString();
                    stepHandlers.saveNewSession(cwd, session);
                }

                const normalizedStatus = normalizePromisePollStatus(promiseStatus);
                const includeCtx = requestUrl.searchParams.get('includeContext') === '1';
                let safeResult = promiseStatus.result || null;
                if (!includeCtx && safeResult && typeof safeResult === 'object') {
                    safeResult = { ...safeResult };
                    delete safeResult.context;
                }
                res.setHeader('Content-Type', 'application/json');
                const statusStr = normalizedStatus.status;
                const asyncPending = normalizedStatus.asyncPending;
                const webExecute = promiseStatus.execute
                    ? buildExecuteProjection(promiseStatus.execute)
                    : null;
                const payload = includePromiseIdInBody
                    ? {
                          promiseId,
                          status: statusStr,
                          result: safeResult,
                          execute: webExecute,
                          completed: normalizedStatus.completed,
                      }
                    : {
                          asyncPending,
                          status: statusStr,
                          result: safeResult,
                          execute: webExecute,
                          completed: normalizedStatus.completed,
                      };
                res.end(JSON.stringify(payload));
            } catch (e) {
                console.error('[VitePlugin] ERROR in promise check:', e.message, e.stack);
                res.writeHead(500).end(JSON.stringify({ error: 'Failed to parse promise response: ' + e.message }));
            }
        });
    });

    xhrReq.on('error', (e) => {
        res.writeHead(500).end(JSON.stringify({ error: 'Failed to check promise status: ' + e.message }));
    });

    xhrReq.end();
}

export function createStepRoutes({ cwd }) {
    return (req, res, next) => {
        if (!req.url?.startsWith(`${API_PREFIX}/sessions`)) {
            return next();
        }

        const url = new URL(req.url, 'http://localhost');
        const p = url.pathname.slice(API_PREFIX.length);
        const storageMode = getStorageMode(req);
        if (storageMode !== 'storage') {
            return next();
        }

        const stepsListMatch = p.match(/^\/sessions\/([^/]+)\/steps$/);
        if (req.method === 'GET' && stepsListMatch) {
            try {
                const sessionId = stepsListMatch[1];
                const steps = stepHandlers.handleListSteps(sessionId, cwd);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ steps }));
            } catch (error) {
                res.writeHead(400).end(JSON.stringify({ error: error.message }));
            }
            return;
        }

        const stepDetailMatch = p.match(/^\/sessions\/([^/]+)\/steps\/(\d+)$/);
        if (req.method === 'GET' && stepDetailMatch) {
            try {
                const sessionId = stepDetailMatch[1];
                const stepNum = parseInt(stepDetailMatch[2], 10);
                const step = stepHandlers.handleStepDetail(sessionId, stepNum, cwd);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(step));
            } catch (error) {
                if (error.message === 'Step not found') {
                    res.writeHead(404).end(JSON.stringify({ error: error.message }));
                } else {
                    res.writeHead(400).end(JSON.stringify({ error: error.message }));
                }
            }
            return;
        }



        if (req.method === 'POST' && stepsListMatch) {
            const sessionId = stepsListMatch[1];
            void sessionId;
            res.writeHead(410).end(
                JSON.stringify({
                    error: 'Deprecated endpoint. Use POST /api/a2a/sessions/:id/next.',
                })
            );
            return;
        }


        const latestMatch = p.match(/^\/sessions\/([^/]+)\/latest$/);
        if (req.method === 'GET' && latestMatch) {
            const sessionId = latestMatch[1];
            if (!isValidSessionId(sessionId)) {
                res.writeHead(400).end(JSON.stringify({ error: 'Invalid session ID' }));
                return;
            }
            const session = stepHandlers.loadNewSession(cwd, sessionId);
            if (!session) {
                res.writeHead(404).end(JSON.stringify({ error: 'Session not found' }));
                return;
            }
            const latestStepNum = stepHandlers.getNewSessionLatestStep(cwd, sessionId);
            const includeContext = url.searchParams.get('includeContext') === '1';
            attachPromiseMeta(cwd, sessionId, session);
            const response = {
                session: toPublicSession(session, includeContext),
                latestStep: latestStepNum,
            };
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(response));
            return;
        }

        const historyMatch = p.match(/^\/sessions\/([^/]+)\/history\/(\d+)$/);
        if (req.method === 'GET' && historyMatch) {
            const sessionId = historyMatch[1];
            if (!isValidSessionId(sessionId)) {
                res.writeHead(400).end(JSON.stringify({ error: 'Invalid session ID' }));
                return;
            }
            const fromStep = parseInt(historyMatch[2], 10);
            const session = stepHandlers.loadNewSession(cwd, sessionId);
            if (!session) {
                res.writeHead(404).end(JSON.stringify({ error: 'Session not found' }));
                return;
            }
            console.log('[stepRoutes] history handler - cwd:', cwd, 'sessionId:', sessionId);
            const allSteps = stepHandlers.listNewSteps(cwd, sessionId);
            const stepsFrom = allSteps.filter((s) => s >= fromStep);
            const history = stepsFrom.map((stepNum) => {
                const data = stepHandlers.loadNewStep(cwd, sessionId, stepNum);
                if (!data?.execute) return { step: stepNum, data };
                return {
                    step: stepNum,
                    data: { ...data, execute: buildExecuteProjection(data.execute) },
                };
            });
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ history }));
            return;
        }

        const nextMatch = p.match(/^\/sessions\/([^/]+)\/next$/);
        if (req.method === 'POST' && nextMatch) {
            const sessionId = nextMatch[1];
            if (!isValidSessionId(sessionId)) {
                res.writeHead(400).end(JSON.stringify({ error: 'Invalid session ID' }));
                return;
            }
            let body = '';
            req.on('data', (c) => (body += c));
            req.on('end', () => {
                try {
                    const d = JSON.parse(body || '{}');
                    const { result, task } = d;
                    // Support both "result" and "task" in request body
                    
                    // First load session to get current step
                    const session = stepHandlers.loadNewSession(cwd, sessionId);
                    if (!session) {
                        res.writeHead(404).end(JSON.stringify({ error: 'Session not found' }));
                        return;
                    }
                    
                    // Check if previous step has choices (select/radio form)
                    const prevStepData = stepHandlers.loadServerResponse(cwd, sessionId, session.currentStep || 1);
                    const hasChoices = prevStepData?.execute?.form?.choices && prevStepData.execute.form.choices.length > 0;
                    
                    // If previous step had choices, use { choice: value } format, otherwise use { message: value }.
                    const submitResult = result || (task ? { [hasChoices ? 'choice' : 'message']: task } : undefined);
                    const submitResultError = validateClientResultPayload(submitResult);
                    if (submitResultError) {
                        res.writeHead(400).end(
                            JSON.stringify({
                                error: submitResultError
                            })
                        );
                        return;
                    }
                    console.log('[VitePlugin] Request body parsed - task:', task, 'result:', result, 'submitResult:', submitResult, 'hasChoices:', hasChoices);

                    const currentStep = session.currentStep || 1;
                    const nextStepNum = currentStep + 1;
                    console.log('[VitePlugin] Saving client-result for step:', nextStepNum, 'data:', { result: submitResult });
                    stepHandlers.saveClientResult(cwd, sessionId, nextStepNum, { result: submitResult });
                    console.log('[VitePlugin] Successfully saved client-result for step:', nextStepNum);
                    const previousStepData = stepHandlers.loadServerResponse(cwd, sessionId, currentStep);
                    const previousContext = previousStepData?.context || {};
                    console.log('[VitePlugin] Previous step context:', previousContext);

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
                        console.log('[VitePlugin] Preserving execution.action from session:', previousExecution.action);
                    }

                    const effectiveTask = submitResult?.message;
                    console.log('[VitePlugin] Building request - effectiveTask:', effectiveTask, 'result:', submitResult);
                    console.log('[VitePlugin] Effective task sent to server:', effectiveTask);

                    const execAction = mergedContext.execution?.action;
                    // Dialog: each user line is the active utterance; keep context.task in sync with result.message
                    // (avoids stale task in request-to-server.json; server invoke also maps result.message → task).
                    if (effectiveTask && execAction === 'dialog') {
                        mergedContext.task = effectiveTask;
                        mergeDialogHistoryForInvoke(mergedContext, effectiveTask);
                    } else if (effectiveTask && !mergedContext.task) {
                        mergedContext.task = effectiveTask;
                        console.log('[VitePlugin] Set context.task to:', effectiveTask);
                    } else if (mergedContext.task) {
                        console.log('[VitePlugin] Preserved context.task from previous context:', mergedContext.task);
                    }

                    const requestToServer = {
                        context: mergedContext,
                        result: submitResult
                    };

                    stepHandlers.saveRequestToServer(cwd, sessionId, nextStepNum, requestToServer);

                    const stepDir = stepHandlers.getNewStepDir(cwd, sessionId, nextStepNum);
                    if (!fs.existsSync(stepDir)) fs.mkdirSync(stepDir, { recursive: true });

                    const a2aServerUrl = getA2aServerBaseUrl();
                    const urlObj = new URL(`${a2aServerUrl}/api/v1/invoke`);

                    let serverResponse = null;
                    let promiseData = null;

                    const reqOptions = {
                        hostname: urlObj.hostname,
                        port: urlObj.port,
                        path: urlObj.pathname,
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    };

                    const xhrReq = http.request(reqOptions, (xhrRes) => {
                        let data = '';
                        xhrRes.on('data', (chunk) => (data += chunk));
                        xhrRes.on('end', async () => {
                            console.log(`[VitePlugin-Invoke] Response [${xhrRes.statusCode}] from A2A Server`);
                            try {
                                console.log('[VitePlugin] A2A response:', xhrRes.statusCode, 'data:', data.substring(0, 200));
                                let parseErrMsg = null;
                                try {
                                    if (!data || data.trim() === '') {
                                        throw new Error('Empty response from A2A server');
                                    }
                                    const a2aData = JSON.parse(data);

                                    if (a2aData.data?.promiseId) {
                                        console.log(
                                            '[VitePlugin] Async invoke — promiseId (daemon completes via GET /promise):',
                                            a2aData.data.promiseId
                                        );
                                        promiseData = {
                                            promiseId: a2aData.data.promiseId,
                                            status: 'pending',
                                            submittedAt: new Date().toISOString()
                                        };
                                        stepHandlers.saveServerPromise(cwd, sessionId, nextStepNum, promiseData);
                                    } else if (xhrRes.statusCode >= 200 && xhrRes.statusCode < 300) {
                                        console.log('[VitePlugin] Sync invoke response');
                                        serverResponse = a2aData;
                                    } else {
                                        console.error('[VitePlugin] A2A error status:', xhrRes.statusCode);
                                    }
                                } catch (parseErr) {
                                    parseErrMsg = parseErr?.message || String(parseErr);
                                    console.error('[vite-plugin-a2a] Failed to parse A2A response:', parseErrMsg);
                                }

                                const hasPromise = !!(promiseData?.promiseId);
                                const hasServer = !!serverResponse;

                                // Async: ack immediately — no server-response.json until client polls GET /promise
                                if (hasPromise && !hasServer) {
                                    session.currentStep = nextStepNum;
                                    session.updatedAt = new Date().toISOString();
                                    if (result?.message) {
                                        session.messages = session.messages || [];
                                        session.messages.push({
                                            role: 'user',
                                            content: result.message,
                                            step: nextStepNum
                                        });
                                    }
                                    session.promiseId = promiseData.promiseId;
                                    session.context = mergedContext;
                                    stepHandlers.saveNewSession(cwd, session);

                                    res.setHeader('Content-Type', 'application/json');
                                    res.end(
                                        JSON.stringify(
                                            toMinimalNextAck({
                                                success: true,
                                                step: nextStepNum,
                                                promiseId: promiseData.promiseId
                                            })
                                        )
                                    );
                                    return;
                                }

                                session.currentStep = nextStepNum;
                                session.updatedAt = new Date().toISOString();

                                const a2aPayload = unwrapA2aResponse(serverResponse) || serverResponse;
                                // For dialog mode, prefer context.history when execute.message is just a form label
                                const history =
                                    a2aPayload?.context?.history || serverResponse?.result?.context?.history;
                                let assistantMessage =
                                    a2aPayload?.execute?.message ||
                                    serverResponse?.result?.execute?.message ||
                                    a2aPayload?.result?.execute?.message ||
                                    serverResponse?.result?.message ||
                                    a2aPayload?.message ||
                                    serverResponse?.message ||
                                    null;
                                // If assistantMessage is short (likely form label), fallback to history
                                if (assistantMessage && typeof assistantMessage === 'string' && 
                                    (assistantMessage.length < 35 || !assistantMessage.match(/[.!?]$/))) {
                                    if (Array.isArray(history)) {
                                        const historyMsg = history.find((h) => h.role === 'assistant');
                                        if (historyMsg?.message) {
                                            assistantMessage = historyMsg.message;
                                        }
                                    }
                                }

                                if (result?.message) {
                                    session.messages = session.messages || [];
                                    session.messages.push({
                                        role: 'user',
                                        content: result.message,
                                        step: nextStepNum
                                    });
                                }

                                if (assistantMessage) {
                                    session.messages = session.messages || [];
                                    session.messages.push({
                                        role: 'assistant',
                                        content: assistantMessage,
                                        step: nextStepNum
                                    });
                                }

                                session.messages = session.messages || [];

                                const savedContext = serverResponse
                                    ? mergeResponseContext(sessionId, mergedContext, serverResponse)
                                    : mergedContext;
                                session.context = savedContext;
                                session.promiseId = null;

                                let finalStepNum = nextStepNum;
                                let finalServerResponse = serverResponse;
                                let finalSavedContext = savedContext;

                                const hasRealData = serverResponse || result;
                                if (hasRealData) {
                                    console.log('[VitePlugin] Saving step:', nextStepNum);
                                    if (serverResponse) {
                                        const stepRecord = buildStepRecord({
                                            sessionId,
                                            stepNum: nextStepNum,
                                            serverResponse,
                                            messages: session.messages || [],
                                            fallbackContext: mergedContext
                                        });
                                        if (stepRecord) {
                                            stepHandlers.saveServerResponse(cwd, sessionId, nextStepNum, stepRecord);
                                        }
                                    } else {
                                        stepHandlers.saveNewStep(cwd, sessionId, nextStepNum, {
                                            step: nextStepNum,
                                            execute: null,
                                            messages: session.messages || [],
                                            context: mergedContext,
                                            result
                                        });
                                    }
                                }

                                if (serverResponse && hasServer && !hasPromise) {
                                    try {
                                        const out = await chainSyncInvokesForAgentTools({
                                            cwd,
                                            sessionId,
                                            a2aServerUrl,
                                            startStepNum: nextStepNum,
                                            serverResponse,
                                            mergedContext,
                                            messages: session.messages || [],
                                        });
                                        finalStepNum = out.stepNum;
                                        finalServerResponse = out.serverResponse;
                                        finalSavedContext = out.savedContext;
                                    } catch (chainErr) {
                                        console.error(
                                            '[VitePlugin] agent tool chain:',
                                            chainErr?.message || chainErr
                                        );
                                    }
                                }

                                session.currentStep = finalStepNum;
                                session.context = finalSavedContext;
                                const finalExecute = extractA2aExecute(finalServerResponse);
                                if (finalExecute) {
                                    session.execute = finalExecute;
                                }

                                stepHandlers.saveNewSession(cwd, session);

                                res.setHeader('Content-Type', 'application/json');
                                if (!hasServer) {
                                    const errBody = toMinimalNextAck({
                                        success: false,
                                        step: nextStepNum,
                                        promiseId: null,
                                        error: parseErrMsg || 'A2A invoke failed'
                                    });
                                    res.writeHead(xhrRes.statusCode >= 400 ? xhrRes.statusCode : 502);
                                    res.end(JSON.stringify(errBody));
                                    return;
                                }

                                res.end(
                                    JSON.stringify(
                                        toMinimalNextAck({
                                            success: true,
                                            step: finalStepNum,
                                            promiseId: null
                                        })
                                    )
                                );
                            } catch (e) {
                                console.error('[vite-plugin-a2a] Error in A2A response handler:', e.message);
                                res.writeHead(500).end(JSON.stringify({ error: 'Internal server error' }));
                            }
                        });
                    });

                    xhrReq.on('error', (e) => {
                        try {
                            console.error('[vite-plugin-a2a] A2A Server request failed:', e.message);
                            session.currentStep = nextStepNum;
                            session.updatedAt = new Date().toISOString();
                            stepHandlers.saveNewSession(cwd, session);

                            res.setHeader('Content-Type', 'application/json');
                            res.writeHead(503);
                            res.end(
                                JSON.stringify(
                                    toMinimalNextAck({
                                        success: false,
                                        step: nextStepNum,
                                        promiseId: null,
                                        error: 'A2A server unavailable: ' + e.message
                                    })
                                )
                            );
                        } catch (err) {
                            console.error('[vite-plugin-a2a] Error in A2A error handler:', err.message);
                            res.writeHead(500).end(JSON.stringify({ error: 'Internal server error' }));
                        }
                    });

                    const invokePayload = {
                        context: mergedContext,
                        result: submitResult,
                        ...(effectiveTask ? { task: effectiveTask } : {})
                    };
                    console.log('[VitePlugin] === SENDING TO A2A SERVER ===', Object.keys(invokePayload));
                    xhrReq.write(JSON.stringify(invokePayload));
                    xhrReq.end();
                } catch (e) {
                    res.writeHead(400).end(JSON.stringify({ error: String(e?.message || e) }));
                }
            });
            return;
        }

        const asyncMatch = p.match(/^\/sessions\/([^/]+)\/async$/);
        if (req.method === 'GET' && asyncMatch) {
            const sessionId = asyncMatch[1];
            if (!isValidSessionId(sessionId)) {
                res.writeHead(400).end(JSON.stringify({ error: 'Invalid session ID' }));
                return;
            }
            if (!stepHandlers.loadNewSession(cwd, sessionId)) {
                res.writeHead(404).end(JSON.stringify({ error: 'Session not found' }));
                return;
            }
            const hit = getActiveAsyncWork(cwd, sessionId);
            if (!hit) {
                res.setHeader('Content-Type', 'application/json');
                res.end(
                    JSON.stringify({
                        asyncPending: false,
                        completed: true,
                        status: 'idle',
                        execute: null,
                        result: null,
                    })
                );
                return;
            }
            runViteClientPromisePoll({
                cwd,
                sessionId,
                promiseId: hit.promiseId,
                currentStep: hit.stepNum,
                requestUrl: url,
                res,
                includePromiseIdInBody: false,
            });
            return;
        }

        const promiseMatch = p.match(/^\/sessions\/([^/]+)\/promise\/([^/]+)$/);
        if (req.method === 'GET' && promiseMatch) {
            const sessionId = promiseMatch[1];
            const promiseId = promiseMatch[2];
            if (!isValidSessionId(sessionId)) {
                res.writeHead(400).end(JSON.stringify({ error: 'Invalid session ID' }));
                return;
            }

            const session = stepHandlers.loadNewSession(cwd, sessionId);
            if (!session) {
                res.writeHead(404).end(JSON.stringify({ error: 'Session not found' }));
                return;
            }

            const allSteps = stepHandlers.listNewSteps(cwd, sessionId);
            let promiseStepNum = null;
            for (const stepNum of allSteps) {
                const promiseData = stepHandlers.loadServerPromise(cwd, sessionId, stepNum);
                if (promiseData?.promiseId === promiseId) {
                    promiseStepNum = stepNum;
                    break;
                }
            }
            const currentStep = promiseStepNum || session.currentStep || 1;
            console.log('[VitePlugin] Promise check - looking for promiseId:', promiseId, 'found at step:', currentStep);

            runViteClientPromisePoll({
                cwd,
                sessionId,
                promiseId,
                currentStep,
                requestUrl: url,
                res,
                includePromiseIdInBody: true,
            });
            return;
        }

        const stepFileMatch = p.match(/^\/sessions\/([^/]+)\/step\/(\d+)\/(server-promise|client-result|request-to-server|server-response)\.json$/);
        if (req.method === 'GET' && stepFileMatch) {
            const sessionId = stepFileMatch[1];
            const stepNum = parseInt(stepFileMatch[2], 10);
            const filename = `${stepFileMatch[3]}.json`;

            if (!isValidSessionId(sessionId)) {
                res.writeHead(400).end(JSON.stringify({ error: 'Invalid session ID' }));
                return;
            }

            const data = stepHandlers.loadStepFile(cwd, sessionId, stepNum, filename);
            if (!data) {
                res.writeHead(404).end(JSON.stringify({ error: 'File not found' }));
                return;
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
            return;
        }

        next();
    };
}
