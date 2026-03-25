import { getStorageMode, isValidSessionId } from './middleware/validators.js';
import {
    mergeResponseContext,
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
} from './utils/web-session-dto.js';
import { buildWebExecute } from './utils/web-execute-dto.js';
import * as stepHandlers from './handlers/step-handlers.js';
import * as stepUtils from './utils/step-utils.js';
import { proxyToA2AServer } from './proxy/a2a-proxy.js';
import { chainSyncInvokesForAgentTools } from './utils/agent-rag-chain.js';
import { getNewStepDir, loadNewSession, loadNewStep, loadServerPromise, loadServerResponse, saveClientResult, saveNewStep, saveNewSession, saveRequestToServer, saveServerPromise, saveServerResponse, listNewSteps, getNewSessionLatestStep, loadStepFile } from '../storage/newSessions.js';

import fs from 'fs';

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
    const session = loadNewSession(cwd, sessionId);
    if (!session) {
        res.writeHead(404).end(JSON.stringify({ error: 'Session not found' }));
        return;
    }

    const a2aServerUrl = process.env.A2A_SERVER_URL || 'http://localhost:3000';
    const xhr = require('http');
    const urlObj = new URL(`${a2aServerUrl}/api/v1/requests/${promiseId}/result`);

    const reqOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname,
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    };

    const xhrReq = xhr.request(reqOptions, (xhrRes) => {
        let data = '';
        xhrRes.on('data', (chunk) => (data += chunk));
        xhrRes.on('end', () => {
            try {
                if (!data || data.trim() === '') {
                    throw new Error('Empty response from A2A server');
                }
                const rawResponse = JSON.parse(data);
                const promiseStatus = rawResponse.success ? rawResponse.data : rawResponse;

                const existingPromise = loadServerPromise(cwd, sessionId, currentStep);
                const updatedPromise = {
                    ...existingPromise,
                    ...promiseStatus,
                    checkedAt: new Date().toISOString(),
                };
                saveServerPromise(cwd, sessionId, currentStep, updatedPromise);

                const isPromiseCompleted =
                    promiseStatus.status === 'completed' ||
                    promiseStatus.status === 'done' ||
                    promiseStatus.execute != null;

                if (isPromiseCompleted) {
                    const assistantMessage =
                        promiseStatus?.execute?.message ||
                        promiseStatus?.result?.message ||
                        promiseStatus?.message ||
                        null;
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
                        saveServerResponse(cwd, sessionId, currentStep, stepRecord);
                    }

                    if (promiseStatus.execute) session.execute = promiseStatus.execute;
                    session.context = stepRecord?.context || session.context;
                    session.promiseId = null;
                    session.status = 'completed';
                    session.updatedAt = new Date().toISOString();
                    saveNewSession(cwd, session);
                }

                const isCompleted = !!(
                    promiseStatus.execute ||
                    promiseStatus.status === 'completed' ||
                    promiseStatus.status === 'done'
                );
                const failed = promiseStatus.status === 'failed' || promiseStatus.status === 'error';
                const includeCtx = requestUrl.searchParams.get('includeContext') === '1';
                let safeResult = promiseStatus.result || null;
                if (!includeCtx && safeResult && typeof safeResult === 'object') {
                    safeResult = { ...safeResult };
                    delete safeResult.context;
                }
                res.setHeader('Content-Type', 'application/json');
                const statusStr = promiseStatus.status || (isCompleted ? 'completed' : 'pending');
                const asyncPending = !(isCompleted || failed);
                const webExecute = promiseStatus.execute
                    ? buildWebExecute(promiseStatus.execute)
                    : null;
                const payload = includePromiseIdInBody
                    ? {
                          promiseId,
                          status: statusStr,
                          result: safeResult,
                          execute: webExecute,
                          completed: isCompleted,
                      }
                    : {
                          asyncPending,
                          status: statusStr,
                          result: safeResult,
                          execute: webExecute,
                          completed: isCompleted,
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
            console.log('[VitePlugin] POST /steps - sessionId:', sessionId, 'storageMode:', storageMode);
            let body = '';
            req.on('data', (c) => (body += c));
            req.on('end', async () => {
                try {
                    const d = JSON.parse(body || '{}');
                    const result = await stepHandlers.handlePostStep(sessionId, d, cwd);
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(result));
                } catch (e) {
                    res.writeHead(400).end(JSON.stringify({ error: String(e?.message || e) }));
                }
            });
            return;
        }


        const latestMatch = p.match(/^\/sessions\/([^/]+)\/latest$/);
        if (req.method === 'GET' && latestMatch) {
            const sessionId = latestMatch[1];
            if (!isValidSessionId(sessionId)) {
                res.writeHead(400).end(JSON.stringify({ error: 'Invalid session ID' }));
                return;
            }
            const session = loadNewSession(cwd, sessionId);
            if (!session) {
                res.writeHead(404).end(JSON.stringify({ error: 'Session not found' }));
                return;
            }
            const latestStepNum = getNewSessionLatestStep(cwd, sessionId);
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
            const session = loadNewSession(cwd, sessionId);
            if (!session) {
                res.writeHead(404).end(JSON.stringify({ error: 'Session not found' }));
                return;
            }
            console.log('[stepRoutes] history handler - cwd:', cwd, 'sessionId:', sessionId);
            if (typeof listNewSteps !== 'function') {
                console.error('[stepRoutes] listNewSteps not defined!');
                res.writeHead(500).end(JSON.stringify({ error: 'listNewSteps unavailable' }));
                return;
            }
            const allSteps = listNewSteps(cwd, sessionId);
            const stepsFrom = allSteps.filter((s) => s >= fromStep);
            const history = stepsFrom.map((stepNum) => {
                const data = loadNewStep(cwd, sessionId, stepNum);
                if (!data?.execute) return { step: stepNum, data };
                return {
                    step: stepNum,
                    data: { ...data, execute: buildWebExecute(data.execute) },
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
                    const session = loadNewSession(cwd, sessionId);
                    if (!session) {
                        res.writeHead(404).end(JSON.stringify({ error: 'Session not found' }));
                        return;
                    }
                    
                    // Check if previous step has choices (select/radio form)
                    const prevStepData = loadServerResponse(cwd, sessionId, session.currentStep || 1);
                    const hasChoices = prevStepData?.execute?.form?.choices && prevStepData.execute.form.choices.length > 0;
                    
                    // If previous step had choices, use { choice: value } format, otherwise use { message: value }
                    const finalResult = result || (task ? { [hasChoices ? 'choice' : 'message']: task } : undefined);
                    console.log('[VitePlugin] Request body parsed - task:', task, 'result:', result, 'finalResult:', finalResult, 'hasChoices:', hasChoices);

                    const currentStep = session.currentStep || 1;
                    console.log('[VitePlugin] Saving client-result for step:', currentStep);
                    saveClientResult(cwd, sessionId, currentStep, { result: finalResult });

                    const nextStepNum = currentStep + 1;
                    const previousStepData = loadServerResponse(cwd, sessionId, currentStep);
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

                    const effectiveTask = finalResult?.message;
                    console.log('[VitePlugin] Building request - effectiveTask:', effectiveTask, 'result:', finalResult);
                    console.log('[VitePlugin] Effective task sent to server:', effectiveTask);

                    // Only set context.task if not already set in previous context
                    // Task represents the overall session context, not individual user messages
                    if (effectiveTask && !mergedContext.task) {
                        mergedContext.task = effectiveTask;
                        console.log('[VitePlugin] Set context.task to:', effectiveTask);
                    } else if (mergedContext.task) {
                        console.log('[VitePlugin] Preserved context.task from previous context:', mergedContext.task);
                    }

                    const requestToServer = {
                        context: mergedContext,
                        result: finalResult
                    };

                    saveRequestToServer(cwd, sessionId, nextStepNum, requestToServer);

                    const stepDir = getNewStepDir(cwd, sessionId, nextStepNum);
                    if (!fs.existsSync(stepDir)) fs.mkdirSync(stepDir, { recursive: true });

                    const xhr = require('http');
                    const a2aServerUrl = process.env.A2A_SERVER_URL || 'http://localhost:3000';
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

                    const xhrReq = xhr.request(reqOptions, (xhrRes) => {
                        let data = '';
                        xhrRes.on('data', (chunk) => (data += chunk));
                        xhrRes.on('end', async () => {
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
                                        saveServerPromise(cwd, sessionId, nextStepNum, promiseData);
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
                                    saveNewSession(cwd, session);

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
                                            saveServerResponse(cwd, sessionId, nextStepNum, stepRecord);
                                        }
                                    } else {
                                        saveNewStep(cwd, sessionId, nextStepNum, {
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

                                saveNewSession(cwd, session);

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
                            saveNewSession(cwd, session);

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
                        result: finalResult,
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
            if (!loadNewSession(cwd, sessionId)) {
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

            const session = loadNewSession(cwd, sessionId);
            if (!session) {
                res.writeHead(404).end(JSON.stringify({ error: 'Session not found' }));
                return;
            }

            if (typeof listNewSteps !== 'function') {
                console.error('[stepRoutes] listNewSteps not defined in promise handler!');
                res.writeHead(500).end(JSON.stringify({ error: 'listNewSteps unavailable' }));
                return;
            }
            const allSteps = listNewSteps(cwd, sessionId);
            let promiseStepNum = null;
            for (const stepNum of allSteps) {
                const promiseData = loadServerPromise(cwd, sessionId, stepNum);
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

            const data = loadStepFile(cwd, sessionId, stepNum, filename);
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
