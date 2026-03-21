import { getStorageMode, isValidSessionId } from './middleware/validators.js';
import { mergeResponseContext, buildStepRecord } from './utils/builders.js';
import * as stepHandlers from './handlers/step-handlers.js';
import * as stepUtils from './utils/step-utils.js';
import { proxyToA2AServer } from './proxy/a2a-proxy.js';
import { pollA2ARequestResult } from '../daemon/a2a-result-poll.js';
import { getNewStepDir, loadNewSession, loadNewStep, loadServerPromise, loadServerResponse, saveClientResult, saveNewStep, saveNewSession, saveRequestToServer, saveServerPromise, saveServerResponse, listNewSteps, getNewSessionLatestStep, loadStepFile } from '../storage/newSessions.js';

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
            console.log('[stepRoutes] history handler - cwd:', cwd, 'sessionId:', sessionId);
            if (typeof listNewSteps !== 'function') {
                console.error('[stepRoutes] listNewSteps not defined!');
                res.writeHead(500).end(JSON.stringify({ error: 'listNewSteps unavailable' }));
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
                        // Filter context to only keep essential fields for invoke request
                        // Based on simulation: only task and execution are needed
                        const filteredContext = {};
                        if (previousStepData.result.context.task) {
                            filteredContext.task = previousStepData.result.context.task;
                        }
                        if (previousStepData.result.context.execution) {
                            filteredContext.execution = previousStepData.result.context.execution;
                        }
                        mergedContext = { ...mergedContext, ...filteredContext };
                    }

                    // Add session_id to context (required by server)
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

                    // Update context with user's choice (task/message from result)
                    if (effectiveTask) {
                        mergedContext.task = effectiveTask;
                        mergedContext.message = effectiveTask;
                        console.log('[VitePlugin] Updated context.task to:', effectiveTask);
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

                    const xhrReq = xhr.request(reqOptions, async (xhrRes) => {
                        let data = '';
                        xhrRes.on('data', (chunk) => (data += chunk));
                        xhrRes.on('end', async () => {
                            console.log('[VitePlugin] A2A response:', xhrRes.statusCode, 'data:', data.substring(0, 200));
                            try {
                                if (!data || data.trim() === '') {
                                    throw new Error('Empty response from A2A server');
                                }
                                const a2aData = JSON.parse(data);

                                if (a2aData.data?.promiseId) {
                                    console.log('[VitePlugin] Async response - promiseId:', a2aData.data.promiseId);
                                    promiseData = {
                                        promiseId: a2aData.data.promiseId,
                                        status: 'pending',
                                        submittedAt: new Date().toISOString()
                                    };
                                    saveServerPromise(cwd, sessionId, nextStepNum, promiseData);

                                    const pollR = await pollA2ARequestResult(promiseData.promiseId, {
                                        baseUrl: a2aServerUrl,
                                        maxPolls: 30,
                                        intervalMs: 1000,
                                        headers: {},
                                        onProgress: (i, pollJson) => {
                                            console.log('[VitePlugin] Poll result:', i, pollJson?.data?.status);
                                        },
                                    });
                                    if (pollR.outcome === 'completed') {
                                        serverResponse = pollR.data;
                                        promiseData = {
                                            ...promiseData,
                                            ...pollR.data,
                                            status: pollR.data.status || 'completed',
                                            checkedAt: new Date().toISOString()
                                        };
                                        saveServerPromise(cwd, sessionId, nextStepNum, promiseData);
                                    } else if (pollR.outcome === 'failed') {
                                        console.error('[VitePlugin] Promise failed:', pollR.data?.error);
                                        serverResponse = {
                                            error: pollR.data?.error || 'Promise failed',
                                            status: 'failed'
                                        };
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

                            // Execute is at root level after promise polling, not in result
                            const serverExecute = serverResponse?.execute || serverResponse?.result?.execute;
                            if (serverExecute) session.execute = serverExecute;
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

                            // Execute is at root level after promise polling, not in result
                            const responseExecute = serverResponse?.execute || serverResponse?.result?.execute || null;
                            const response = {
                                success: true,
                                session,
                                execute: responseExecute,
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

                        // FIX: Return error instead of success to avoid silent failures
                        const response = {
                            success: false,
                            session,
                            execute: null,
                            promiseId: null,
                            error: 'A2A server unavailable: ' + e.message
                        };

                        res.setHeader('Content-Type', 'application/json');
                        res.writeHead(503); // Service Unavailable
                        res.end(JSON.stringify(response));
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

            // FIX: Find the step where the promise was created, not just session.currentStep
            // The promise might be in a step that hasn't been saved as server-response.json yet
            // Search through all steps to find the one with matching promiseId
            console.log('[stepRoutes] promise handler - cwd:', cwd, 'sessionId:', sessionId);
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
            // If not found in existing steps, use currentStep (might be a new promise being created)
            const currentStep = promiseStepNum || session.currentStep || 1;
            console.log('[VitePlugin] Promise check - looking for promiseId:', promiseId, 'found at step:', currentStep);

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
                    console.log('[VitePlugin] Promise check - raw data:', data.substring(0, 500));
                    try {
                        if (!data || data.trim() === '') {
                            throw new Error('Empty response from A2A server');
                        }
                        const rawResponse = JSON.parse(data);
                        console.log('[VitePlugin] Promise check - parsed rawResponse:', JSON.stringify(rawResponse).substring(0, 500));
                        const promiseStatus = rawResponse.success ? rawResponse.data : rawResponse;
                        console.log('[VitePlugin] Promise check - promiseStatus:', JSON.stringify(promiseStatus).substring(0, 500));

                        const existingPromise = loadServerPromise(cwd, sessionId, currentStep);
                        const updatedPromise = {
                            ...existingPromise,
                            ...promiseStatus,
                            checkedAt: new Date().toISOString()
                        };
                        saveServerPromise(cwd, sessionId, currentStep, updatedPromise);

                        // A2A Server returns status implicitly - if execute is present, promise is completed
                        // Also check explicit status for backward compatibility
                        const isPromiseCompleted = promiseStatus.status === 'completed' || 
                                                 promiseStatus.status === 'done' ||
                                                 promiseStatus.execute != null;
                        
                        if (isPromiseCompleted) {
                            // FIX: Extract assistant message from execute.message (A2A Server returns it there)
                            // Also check result.message for backward compatibility
                            const assistantMessage = promiseStatus?.execute?.message || 
                                                    promiseStatus?.result?.message ||
                                                    promiseStatus?.message ||
                                                    null;
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

                        // Determine status: if execute is present, promise is completed
                        const isCompleted = !!(promiseStatus.execute || promiseStatus.status === 'completed' || promiseStatus.status === 'done');
                        
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({
                            promiseId,
                            status: promiseStatus.status || (isCompleted ? 'completed' : 'pending'),
                            result: promiseStatus.result || null,
                            execute: promiseStatus.execute || null,
                            completed: isCompleted
                            // Note: messages are stored in step files and available via /history endpoint
                        }));
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
