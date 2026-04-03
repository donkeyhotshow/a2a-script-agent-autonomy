import fs from 'fs';
import http from 'http';
import pathMod from 'path';

import {
    buildStepRecord,
    extractA2aExecute,
    mergeDialogHistoryForInvoke,
    mergeResponseContext,
    pickInvokeContextPatch,
    sanitizeContextForServer,
    unwrapA2aResponse,
} from './utils/builders.js';
import { toMinimalNextAck } from './utils/session-projection-dto.js';
import * as stepHandlers from './handlers/step-handlers.js';
import { getA2aServerBaseUrl } from '@a2a-client/shared/a2a-server-base.js';
import {
    buildSubmitResult,
    normalizeRouterStepSubmit,
    routerFormHasChoices,
    validateSubmitResult,
} from './step-routes-router-flow.js';
import { maybeChainAgentTools } from './step-routes-agent-flow.js';
import { loadSession, saveSession, resolveProjectPathForApi } from '../storage/projectSessions.js';
import { registerStepSessionsParent } from '../storage/newSessions.js';

export function handleNextStep({ cwd, path, req, res, storageMode = 'storage' }) {
    const nextMatch = path.match(/^\/sessions\/([^/]+)\/next$/);
    if (!(req.method === 'POST' && nextMatch)) {
        return false;
    }

    const sessionId = nextMatch[1];
    if (!stepHandlers.isValidSessionId(sessionId)) {
        res.writeHead(400).end(JSON.stringify({ error: 'Invalid session ID' }));
        return true;
    }

    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
        try {
            const d = JSON.parse(body || '{}');

            const projectPath =
                storageMode === 'project'
                    ? resolveProjectPathForApi(cwd, sessionId, {
                          projectId: d.projectId,
                          projectRoot: d.projectRoot,
                      })
                    : null;
            if (storageMode === 'project') {
                if (!projectPath) {
                    res.writeHead(404).end(
                        JSON.stringify({ error: 'Session not found (unknown project)' })
                    );
                    return;
                }
                const stepsParent = pathMod.join(projectPath, '.a2a', 'session-steps');
                fs.mkdirSync(stepsParent, { recursive: true });
                registerStepSessionsParent(sessionId, stepsParent);
                const unreg = () => registerStepSessionsParent(sessionId, null);
                res.once('finish', unreg);
                res.once('close', unreg);
            }

            let session;
            if (projectPath) {
                session = loadSession(projectPath, sessionId);
                if (!session) {
                    registerStepSessionsParent(sessionId, null);
                    res.writeHead(404).end(JSON.stringify({ error: 'Session not found' }));
                    return;
                }
            } else {
                session = stepHandlers.loadNewSession(cwd, sessionId);
                if (!session) {
                    res.writeHead(404).end(JSON.stringify({ error: 'Session not found' }));
                    return;
                }
            }

            const currentStep = session.currentStep || 1;
            let prevStepData = stepHandlers.loadServerResponse(cwd, sessionId, currentStep);
            if (!prevStepData && projectPath && currentStep === 1) {
                prevStepData = { context: session.context, execute: session.execute };
            }
            const hasChoices = routerFormHasChoices(prevStepData);

            let submitResult = buildSubmitResult({ body: d, hasChoices });
            submitResult = normalizeRouterStepSubmit(submitResult, prevStepData);
            const submitResultError = validateSubmitResult(submitResult);
            if (submitResultError) {
                res.writeHead(400).end(
                    JSON.stringify({
                        error: submitResultError,
                    })
                );
                return;
            }
            console.log(
                '[VitePlugin] Request body parsed - task:',
                d.task,
                'result:',
                d.result,
                'submitResult:',
                submitResult,
                'hasChoices:',
                hasChoices
            );

            const nextStepNum = currentStep + 1;
            console.log(
                '[VitePlugin] Saving client-result for step:',
                nextStepNum,
                'data:',
                { result: submitResult }
            );
            stepHandlers.saveClientResult(cwd, sessionId, nextStepNum, { result: submitResult });
            console.log('[VitePlugin] Successfully saved client-result for step:', nextStepNum);

            const previousContext = prevStepData?.context || {};
            console.log('[VitePlugin] Previous step context:', previousContext);

            let mergedContext = { ...previousContext };
            if (prevStepData?.result?.context) {
                const filteredContext = pickInvokeContextPatch(prevStepData.result.context);
                mergedContext = { ...mergedContext, ...filteredContext };
            }

            const sessionContext = session.context || {};
            const previousExecution = sessionContext.execution || {};
            if (previousExecution.action && !mergedContext.execution) {
                mergedContext.execution = previousExecution;
                console.log('[VitePlugin] Preserving execution.action from session:', previousExecution.action);
            }
            if (sessionContext.llmModel && !mergedContext.llmModel) {
                mergedContext.llmModel = sessionContext.llmModel;
            }

            const effectiveTask = submitResult?.message;
            console.log(
                '[VitePlugin] Building request - effectiveTask:',
                effectiveTask,
                'result:',
                submitResult
            );
            console.log('[VitePlugin] Effective task sent to server:', effectiveTask);

            const execAction = mergedContext.execution?.action;
            const execStep = mergedContext.execution?.step;
            if (effectiveTask) {
                mergedContext.task = effectiveTask;
                if (execAction === 'dialog') {
                    mergeDialogHistoryForInvoke(mergedContext, effectiveTask);
                } else {
                    console.log('[VitePlugin] Set context.task to latest submit:', effectiveTask);
                }
            } else if (mergedContext.task) {
                console.log(
                    '[VitePlugin] Preserved context.task from previous context:',
                    mergedContext.task
                );
            }

            // First beat (task form, step new): run sync invoke so router execute is returned immediately.
            // Async-only here left the session showing stale step-1 execute until poll completed.
            const shouldSyncInvoke =
                execAction === 'task' &&
                execStep === 'new' &&
                typeof effectiveTask === 'string' &&
                effectiveTask.trim().length > 0;

            const contextForServer = sanitizeContextForServer(mergedContext);
            const requestToServer = {
                context: contextForServer,
                result: submitResult,
                ...(effectiveTask ? { task: effectiveTask } : {}),
                ...(shouldSyncInvoke ? { sync: true } : {}),
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
                headers: { 'Content-Type': 'application/json' },
            };

            const xhrReq = http.request(reqOptions, (xhrRes) => {
                let data = '';
                xhrRes.on('data', (chunk) => (data += chunk));
                xhrRes.on('end', async () => {
                    console.log(`[VitePlugin-Invoke] Response [${xhrRes.statusCode}] from A2A Server`);
                    try {
                        console.log(
                            '[VitePlugin] A2A response:',
                            xhrRes.statusCode,
                            'data:',
                            data.substring(0, 200)
                        );
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
                                    submittedAt: new Date().toISOString(),
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

                        const hasPromise = !!promiseData?.promiseId;
                        const hasServer = !!serverResponse;

                        if (hasPromise && !hasServer) {
                            session.currentStep = nextStepNum;
                            session.updatedAt = new Date().toISOString();
                            if (submitResult?.message) {
                                session.messages = session.messages || [];
                                session.messages.push({
                                    role: 'user',
                                    content: submitResult.message,
                                    step: nextStepNum,
                                });
                            }
                            session.promiseId = promiseData.promiseId;
                            session.context = mergedContext;
                            if (projectPath) saveSession(projectPath, session);
                            stepHandlers.saveNewSession(cwd, session);

                            res.setHeader('Content-Type', 'application/json');
                            res.end(
                                JSON.stringify(
                                    toMinimalNextAck({
                                        success: true,
                                        step: nextStepNum,
                                        promiseId: promiseData.promiseId,
                                    })
                                )
                            );
                            return;
                        }

                        session.currentStep = nextStepNum;
                        session.updatedAt = new Date().toISOString();

                        const a2aPayload = unwrapA2aResponse(serverResponse) || serverResponse;
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

                        if (
                            assistantMessage &&
                            typeof assistantMessage === 'string' &&
                            (assistantMessage.length < 35 || !assistantMessage.match(/[.!?]$/))
                        ) {
                            if (Array.isArray(history)) {
                                const historyMsg = history.find((h) => h.role === 'assistant');
                                if (historyMsg?.message) {
                                    assistantMessage = historyMsg.message;
                                }
                            }
                        }

                        if (submitResult?.message) {
                            session.messages = session.messages || [];
                            session.messages.push({
                                role: 'user',
                                content: submitResult.message,
                                step: nextStepNum,
                            });
                        }

                        if (assistantMessage) {
                            session.messages = session.messages || [];
                            session.messages.push({
                                role: 'assistant',
                                content: assistantMessage,
                                step: nextStepNum,
                            });
                        }

                        session.messages = session.messages || [];

                        const savedContext = serverResponse
                            ? mergeResponseContext(mergedContext, serverResponse)
                            : mergedContext;
                        session.context = savedContext;
                        session.promiseId = null;

                        let finalStepNum = nextStepNum;
                        let finalServerResponse = serverResponse;
                        let finalSavedContext = savedContext;

                        const hasRealData = serverResponse || submitResult;
                        if (hasRealData) {
                            console.log('[VitePlugin] Saving step:', nextStepNum);
                            if (serverResponse) {
                                const stepRecord = buildStepRecord({
                                    sessionId,
                                    stepNum: nextStepNum,
                                    serverResponse,
                                    messages: session.messages || [],
                                    fallbackContext: mergedContext,
                                });
                                if (stepRecord) {
                                    stepHandlers.saveServerResponse(
                                        cwd,
                                        sessionId,
                                        nextStepNum,
                                        stepRecord
                                    );
                                }
                            } else {
                                stepHandlers.saveNewStep(cwd, sessionId, nextStepNum, {
                                    step: nextStepNum,
                                    execute: null,
                                    messages: session.messages || [],
                                    context: mergedContext,
                                    result: submitResult,
                                });
                            }
                        }

                        if (serverResponse && hasServer && !hasPromise && (execAction !== 'task' || mergedContext.execution?.step !== 'router')) {
                            const agentResult = await maybeChainAgentTools({
                                cwd,
                                sessionId,
                                a2aServerUrl,
                                startStepNum: nextStepNum,
                                serverResponse,
                                mergedContext,
                                messages: session.messages || [],
                            });
                            finalStepNum = agentResult.stepNum;
                            finalServerResponse = agentResult.serverResponse;
                            finalSavedContext = agentResult.savedContext;
                        }

                        session.currentStep = finalStepNum;
                        session.context = finalSavedContext;
                        const finalExecute = extractA2aExecute(finalServerResponse);
                        if (finalExecute) {
                            session.execute = finalExecute;
                        }

                        if (projectPath) saveSession(projectPath, session);
                        stepHandlers.saveNewSession(cwd, session);

                        res.setHeader('Content-Type', 'application/json');
                        if (!hasServer) {
                            const errBody = toMinimalNextAck({
                                success: false,
                                step: nextStepNum,
                                promiseId: null,
                                error: parseErrMsg || 'A2A invoke failed',
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
                                    promiseId: null,
                                })
                            )
                        );
                    } catch (e) {
                        console.error(
                            '[vite-plugin-a2a] Error in A2A response handler:',
                            e.message
                        );
                        res.writeHead(500).end(JSON.stringify({ error: 'Internal server error' }));
                    }
                });
            });

            xhrReq.on('error', (e) => {
                try {
                    console.error('[vite-plugin-a2a] A2A Server request failed:', e.message);
                    session.currentStep = nextStepNum;
                    session.updatedAt = new Date().toISOString();
                    if (projectPath) saveSession(projectPath, session);
                    stepHandlers.saveNewSession(cwd, session);

                    res.setHeader('Content-Type', 'application/json');
                    res.writeHead(503);
                    res.end(
                        JSON.stringify(
                            toMinimalNextAck({
                                success: false,
                                step: nextStepNum,
                                promiseId: null,
                                error: 'A2A server unavailable: ' + e.message,
                            })
                        )
                    );
                } catch (err) {
                    console.error(
                        '[vite-plugin-a2a] Error in A2A error handler:',
                        err.message
                    );
                    res.writeHead(500).end(JSON.stringify({ error: 'Internal server error' }));
                }
            });

            const invokePayload = requestToServer;
            console.log(
                '[VitePlugin] === SENDING TO A2A SERVER ===',
                Object.keys(invokePayload)
            );
            xhrReq.write(JSON.stringify(invokePayload));
            xhrReq.end();
        } catch (e) {
            res.writeHead(400).end(JSON.stringify({ error: String(e?.message || e) }));
        }
    });

    return true;
}
