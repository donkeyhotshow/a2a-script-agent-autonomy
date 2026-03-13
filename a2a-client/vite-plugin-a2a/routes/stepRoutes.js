import { getStorageMode, isValidSessionId } from './middleware/validators.js';
import { mergeResponseContext, buildStepRecord } from './utils/builders.js';
import * as stepHandlers from './handlers/step-handlers.js';
import * as stepUtils from './utils/step-utils.js';
import { proxyToA2AServer } from './proxy/a2a-proxy.js';
import { loadNewSession, loadNewStep, loadServerResponse, saveClientResult, saveRequestToServer } from '../storage/newSessions.js';

import fs from 'fs';

const API_PREFIX = '/api/a2a';

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
            const latestStep = latestStepNum > 0 ? loadNewStep(cwd, sessionId, latestStepNum) : null;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
                session,
                latestStep: latestStepNum
            }));
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
            const allSteps = listNewSteps(cwd, sessionId);
            const stepsFrom = allSteps.filter((s) => s >= fromStep);
            const history = stepsFrom.map((stepNum) => ({
                step: stepNum,
                data: loadNewStep(cwd, sessionId, stepNum)
            }));
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
                    const { result } = d;

                    const session = loadNewSession(cwd, sessionId);
                    if (!session) {
                        res.writeHead(404).end(JSON.stringify({ error: 'Session not found' }));
                        return;
                    }

                    const currentStep = session.currentStep || 1;
                    console.log('[VitePlugin] Saving client-result for step:', currentStep);
                    saveClientResult(cwd, sessionId, currentStep, { result });

                    const nextStepNum = currentStep + 1;
                    const previousStepData = loadServerResponse(cwd, sessionId, currentStep);
                    const previousContext = previousStepData?.context || {};
                    console.log('[VitePlugin] Previous step context:', previousContext);

                    let mergedContext = { ...previousContext };
                    if (previousStepData?.result?.context) {
                        mergedContext = { ...mergedContext, ...previousStepData.result.context };
                    }

                    mergedContext.session_id = sessionId;

                    const sessionContext = session.context || {};
                    const previousExecution = sessionContext.execution || {};
                    if (previousExecution.action && !mergedContext.execution) {
                        mergedContext.execution = previousExecution;
                        console.log('[VitePlugin] Preserving execution.action from session:', previousExecution.action);
                    }

                    const effectiveTask = result?.message;
                    console.log('[VitePlugin] Building request - effectiveTask:', effectiveTask, 'result:', result);
                    console.log('[VitePlugin] Effective task sent to server:', effectiveTask);
                    const requestToServer = {
                        context: mergedContext,
                        result
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

                    const xhrReq = xhr.request(reqOptions, async (xhrRes) => {
                        let data = '';
                        xhrRes.on('data', (chunk) => (data += chunk));
                        xhrRes.on('end', async () => {
                            console.log('[VitePlugin] A2A response:', xhrRes.statusCode, 'data:', data.substring(0, 200));
                            try {
                                const a2aData = JSON.parse(data || '{}');

                                if (a2aData.data?.promiseId) {
                                    console.log('[VitePlugin] Async response - promiseId:', a2aData.data.promiseId);
                                    promiseData = {
                                        promiseId: a2aData.data.promiseId,
                                        status: 'pending',
                                        submittedAt: new Date().toISOString()
                                    };
                                    saveServerPromise(cwd, sessionId, nextStepNum, promiseData);

                                    const maxPolls = 30;
                                    for (let i = 0; i < maxPolls; i++) {
                                        await new Promise((r) => setTimeout(r, 1000));
                                        try {
                                            const pollRes = await fetch(`${a2aServerUrl}/api/v1/requests/${promiseData.promiseId}/result`, {
                                                method: 'GET'
                                            });
                                            const pollData = await pollRes.json();
                                            console.log('[VitePlugin] Poll result:', i, pollData.data?.status);
                                        if (pollData.data?.status === 'completed') {
                                            serverResponse = pollData.data;
                                            promiseData = {
                                                ...promiseData,
                                                ...pollData.data,
                                                status: pollData.data.status || 'completed',
                                                checkedAt: new Date().toISOString()
                                            };
                                            saveServerPromise(cwd, sessionId, nextStepNum, promiseData);
                                            break;
                                        } else if (pollData.data?.status === 'failed') {
                                                console.error('[VitePlugin] Promise failed:', pollData.data.error);
                                                break;
                                            }
                                        } catch (pollErr) {
                                            console.error('[VitePlugin] Poll error:', pollErr.message);
                                        }
                                    }
                                } else if (xhrRes.statusCode >= 200 && xhrRes.statusCode < 300) {
                                    console.log('[VitePlugin] Sync response saved');
                                    serverResponse = a2aData;
                                } else {
                                    console.error('[VitePlugin] A2A error status:', xhrRes.statusCode);
                                }
                            } catch (parseErr) {
                                console.error('[vite-plugin-a2a] Failed to parse A2A response:', parseErr.message);
                            }

                            session.currentStep = nextStepNum;
                            session.updatedAt = new Date().toISOString();

                            let assistantMessage =
                                serverResponse?.result?.execute?.message ||
                                serverResponse?.result?.message ||
                                serverResponse?.message ||
                                null;

                            if (!assistantMessage && serverResponse?.result?.context?.history) {
                                const historyMsg = serverResponse.result.context.history.find((h) => h.role === 'assistant');
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

                            // Messages now handled by session.messages array
                            if (assistantMessage) {
                                session.messages = session.messages || [];
                                session.messages.push({
                                    role: 'assistant',
                                    content: assistantMessage,
                                    step: nextStepNum
                                });
                            }

                            session.messages = session.messages || [];

                            if (serverResponse?.result?.execute) session.execute = serverResponse.result.execute;
                            const savedContext = serverResponse
                                ? mergeResponseContext(sessionId, mergedContext, serverResponse)
                                : mergedContext;
                            session.context = savedContext;
                            const keepPromise = promiseData && promiseData.status && !['completed', 'done'].includes(promiseData.status);
                            session.promiseId = keepPromise ? promiseData.promiseId : null;

                            const hasRealData = serverResponse || result;
                            if (hasRealData) {
                                console.log('[VitePlugin] Saving step after polling:', nextStepNum);
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

                            saveNewSession(cwd, session);

                            const response = {
                                success: true,
                                session,
                                execute: serverResponse?.result?.execute || null,
                                promiseId: session.promiseId || null
                            };

                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify(response));
                        });
                    });

                    xhrReq.on('error', (e) => {
                        console.error('[vite-plugin-a2a] A2A Server request failed:', e.message);
                        session.currentStep = nextStepNum;
                        session.updatedAt = new Date().toISOString();
                        saveNewSession(cwd, session);

                        const response = {
                            success: true,
                            session,
                            execute: null,
                            promiseId: null,
                            error: 'A2A server unavailable'
                        };

                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify(response));
                    });

                    const invokePayload = {
                        context: mergedContext,
                        result,
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

            const a2aServerUrl = process.env.A2A_SERVER_URL || 'http://localhost:3000';
            const xhr = require('http');
            const urlObj = new URL(`${a2aServerUrl}/api/v1/requests/${promiseId}/result`);

            const reqOptions = {
                hostname: urlObj.hostname,
                port: urlObj.port,
                path: urlObj.pathname,
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            };

            const xhrReq = xhr.request(reqOptions, (xhrRes) => {
                let data = '';
                xhrRes.on('data', (chunk) => (data += chunk));
                xhrRes.on('end', () => {
                    try {
                        const rawResponse = JSON.parse(data || '{}');
                        const promiseStatus = rawResponse.success ? rawResponse.data : rawResponse;

                        const currentStep = session.currentStep || 1;
                        const existingPromise = loadServerPromise(cwd, sessionId, currentStep);
                        const updatedPromise = {
                            ...existingPromise,
                            ...promiseStatus,
                            checkedAt: new Date().toISOString()
                        };
                        saveServerPromise(cwd, sessionId, currentStep, updatedPromise);

                        if (promiseStatus.status === 'completed' || promiseStatus.status === 'done') {
                            // Add assistant message to session.messages
                            const assistantMessage = promiseStatus?.result?.message;
                            if (assistantMessage) {
                                session.messages = session.messages || [];
                                session.messages.push({
                                    role: 'assistant',
                                    content: assistantMessage,
                                    step: currentStep
                                });
                            }
                            
                            console.log('[VitePlugin] Promise completed, building step record for step:', currentStep);
                            const stepRecord = buildStepRecord({
                                sessionId,
                                stepNum: currentStep,
                                serverResponse: promiseStatus,
                                messages: session.messages || [],
                                fallbackContext: session.context || {}
                            });
                            console.log('[VitePlugin] Step record:', JSON.stringify(stepRecord, null, 2));
                            if (stepRecord) {
                                saveServerResponse(cwd, sessionId, currentStep, stepRecord);
                                console.log('[VitePlugin] Saved server response for step:', currentStep);
                            } else {
                                console.log('[VitePlugin] ERROR: stepRecord is null, not saving');
                            }

                            if (promiseStatus.execute) session.execute = promiseStatus.execute;
                            session.context = stepRecord?.context || session.context;
                            session.promiseId = null;
                            session.status = 'completed';
                            session.updatedAt = new Date().toISOString();
                            saveNewSession(cwd, session);
                        }

                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({
                            promiseId,
                            status: promiseStatus.status || 'pending',
                            result: promiseStatus.result || null,
                            execute: promiseStatus.execute || null,
                            completed: promiseStatus.status === 'completed' || promiseStatus.status === 'done'
                            // Note: messages are stored in step files and available via /history endpoint
                        }));
                    } catch (e) {
                        res.writeHead(500).end(JSON.stringify({ error: 'Failed to parse promise response' }));
                    }
                });
            });

            xhrReq.on('error', (e) => {
                res.writeHead(500).end(JSON.stringify({ error: 'Failed to check promise status: ' + e.message }));
            });

            xhrReq.end();
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
