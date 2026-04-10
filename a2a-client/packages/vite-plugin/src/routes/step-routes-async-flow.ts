import fs from 'fs';
import pathMod from 'path';
import http from 'http';

import { buildExecuteProjection } from './utils/execute-projection-dto.js';
import { isPromisePollComplete } from '@a2a-client/storage/src/promise-status.js';
import * as stepHandlers from './handlers/step-handlers.js';
import { getA2aServerBaseUrl } from '@a2a-client/shared/a2a-server-base.js';
import { maybeChainAgentTools } from './step-routes-agent-flow.js';
import { finalizeSession } from './persistence-manager.js';
import { unwrapA2aResponse } from './utils/builders.js';
import {
   normalizePromisePollStatus,
   isRecoverableAsyncSnapshot,
   } from '@a2a-client/shared/client-api-envelope.js';
import { resolveProjectPathForApi, loadSession, saveSession } from '@a2a-client/storage/src/projectSessions.js';
import { registerStepSessionsParent } from '@a2a-client/storage/src/newSessions.js';
import { getActiveAsyncWork } from './utils/session-projection-dto.js';

function projectSessionStepsParent(projectPath) {
    return pathMod.join(projectPath, '.a2a', 'session-steps');
}

function beginProjectStepContextAsync(cwd, sessionId, url, storageMode) {
    if (storageMode !== 'project') {
        return { projectPath: null, cleanup: () => {}, notFound: false };
    }
    const projectPath = resolveProjectPathForApi(cwd, sessionId, {
        projectId: url.searchParams.get('projectId'),
        projectRoot: url.searchParams.get('projectRoot'),
    });
    if (!projectPath) {
        return { projectPath: null, cleanup: () => {}, notFound: true };
    }
    const parent = projectSessionStepsParent(projectPath);
    fs.mkdirSync(parent, { recursive: true });
    registerStepSessionsParent(sessionId, parent);
    return { projectPath, cleanup: () => registerStepSessionsParent(sessionId, null), notFound: false };
}

/**
 * Persisted promise snapshot: on failed/error, avoid re-saving full server blobs each poll
 * (large `result` / nested errors). Optional short `errorHint` for local grep.
 * @param {Record<string, unknown>} merged
 */
function compactPromiseForStorageIfNeeded(merged) {
    if (!merged || typeof merged !== 'object') return merged;
    const st = merged.status;
    if (st !== 'failed' && st !== 'error') return merged;
    const small = {
        promiseId: merged.promiseId,
        status: st,
        checkedAt: merged.checkedAt,
        retryAfter: merged.retryAfter ?? null,
        requestPhase: merged.requestPhase ?? null,
    };
    const hint =
        typeof merged.message === 'string'
            ? merged.message.slice(0, 400)
            : typeof merged.error === 'string'
              ? merged.error.slice(0, 400)
              : merged.error &&
                  typeof merged.error === 'object' &&
                  merged.error !== null &&
                  typeof merged.error.message === 'string'
                ? merged.error.message.slice(0, 400)
                : null;
    if (hint) small.errorHint = hint;
    return small;
}

/**
 * Web `/async` body: for failed/error, expose only status (+ retryAfter when recoverable) so the UI
 * shows "something failed" without re-downloading huge error payloads every poll.
 * @param {Record<string, unknown> | null | undefined} safeResult
 * @param {Record<string, unknown>} promiseStatus
 */
function buildWebAsyncResultField(safeResult, promiseStatus) {
    const st = promiseStatus?.status;
    if (st !== 'failed' && st !== 'error') return safeResult;
    const out = { status: st };
    if (isRecoverableAsyncSnapshot(promiseStatus)) {
        out.retryAfter = promiseStatus.retryAfter ?? null;
    }
    return out;
}

function loadSessionForAsync(cwd, sessionId, projectPath) {
    let session = stepHandlers.loadNewSession(cwd, sessionId);
    if (!session && projectPath) {
        session = loadSession(projectPath, sessionId);
    }
    return session;
}

function runViteClientPromisePoll({
    cwd,
    sessionId,
    promiseId,
    currentStep,
    requestUrl,
    res,
    includePromiseIdInBody,
    projectPath,
}) {
    const session = loadSessionForAsync(cwd, sessionId, projectPath);
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
        xhrRes.on('end', async () => {
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
                stepHandlers.saveServerPromise(
                    cwd,
                    sessionId,
                    currentStep,
                    compactPromiseForStorageIfNeeded(updatedPromise)
                );

                /** For wire projection after optional client tool chain */
                let wireServerBody = promiseStatus;
                let completedPollHandled = false;

                if (isPromisePollComplete(updatedPromise)) {
                    completedPollHandled = true;
                    const assistantMessage =
                        promiseStatus?.execute?.message ||
                        promiseStatus?.result?.message ||
                        promiseStatus?.message ||
                        null;
                    console.log(
                        `[VitePlugin-Poll] COMPLETED promise [${promiseId}] at step [${currentStep}]. msg:`,
                        assistantMessage
                    );
                    if (assistantMessage) {
                        session.messages = session.messages || [];
                        session.messages.push({
                            role: 'assistant',
                            content: assistantMessage,
                            step: currentStep,
                        });
                    }

                    const stepRecord = stepHandlers.buildStepRecordFromPromise({
                        sessionId,
                        stepNum: currentStep,
                        serverResponse: promiseStatus,
                        messages: session.messages || [],
                        fallbackContext: session.context || {},
                    });
                    if (stepRecord) {
                        stepHandlers.saveServerResponse(cwd, sessionId, currentStep, stepRecord);
                    }

                    const mergedForChain =
                        (stepRecord && stepRecord.context) ||
                        promiseStatus.context ||
                        session.context ||
                        {};
                    let chainOut = {
                        stepNum: currentStep,
                        savedContext: mergedForChain,
                        serverResponse: promiseStatus,
                    };
                    try {
                        chainOut = await maybeChainAgentTools({
                            cwd,
                            sessionId,
                            a2aServerUrl: getA2aServerBaseUrl(),
                            startStepNum: currentStep,
                            serverResponse: promiseStatus,
                            mergedContext: mergedForChain,
                            messages: session.messages || [],
                        });
                    } catch (chainErr) {
                        console.error('[VitePlugin-Poll] agent tool chain:', chainErr?.message || chainErr);
                    }

                    finalizeSession({
                        session,
                        finalStepNum: chainOut.stepNum,
                        finalSavedContext: chainOut.savedContext,
                        finalServerResponse: chainOut.serverResponse,
                    });

                    const wrapped = chainOut.serverResponse;
                    const nextPid =
                        (wrapped && wrapped.data && wrapped.data.promiseId) ||
                        (unwrapA2aResponse(wrapped) && unwrapA2aResponse(wrapped).promiseId) ||
                        null;
                    if (nextPid) {
                        session.promiseId = String(nextPid);
                        session.promiseStatus = 'pending';
                        stepHandlers.saveServerPromise(cwd, sessionId, chainOut.stepNum, {
                            promiseId: String(nextPid),
                            status: 'pending',
                        });
                    } else {
                        session.promiseId = null;
                        session.promiseStatus = 'completed';
                    }

                    session.status =
                        session.promiseId || (session.execute && typeof session.execute === 'object')
                            ? 'active'
                            : 'completed';
                    session.updatedAt = new Date().toISOString();

                    if (projectPath) {
                        saveSession(projectPath, session);
                    }
                    stepHandlers.saveNewSession(cwd, session);

                    stepHandlers.saveServerPromise(cwd, sessionId, currentStep, {
                        promiseId: promiseId,
                        status: 'completed',
                        completedAt: new Date().toISOString(),
                    });

                    wireServerBody =
                        unwrapA2aResponse(chainOut.serverResponse) || chainOut.serverResponse || promiseStatus;
                }

                // Merge disk promise (retryAfter, requestPhase) so recoverable failed + backoff stays asyncPending.
                let normalizedStatus;
                if (completedPollHandled) {
                    if (session.promiseId) {
                        normalizedStatus = {
                            status: 'processing',
                            completed: false,
                            failed: false,
                            asyncPending: true,
                            requestPhase: null,
                            retryAfter: null,
                        };
                    } else {
                        normalizedStatus = normalizePromisePollStatus({
                            ...updatedPromise,
                            execute: wireServerBody.execute,
                            result: wireServerBody.result,
                            status: wireServerBody.status || updatedPromise.status,
                        });
                    }
                } else {
                    normalizedStatus = normalizePromisePollStatus(updatedPromise);
                }
                const includeCtx = requestUrl.searchParams.get('includeContext') === '1';
                let safeResult = wireServerBody.result || null;
                if (!includeCtx && safeResult && typeof safeResult === 'object') {
                    safeResult = { ...safeResult };
                    delete safeResult.context;
                }
                const statusStr = normalizedStatus.status;
                const errWire = statusStr === 'failed' || statusStr === 'error';
                safeResult = buildWebAsyncResultField(safeResult, wireServerBody);
                res.setHeader('Content-Type', 'application/json');
                const asyncPending = normalizedStatus.asyncPending;
                const pollCtx = wireServerBody.context;
                const webExecute =
                    errWire || !wireServerBody.execute
                        ? null
                        : buildExecuteProjection(wireServerBody.execute, {
                              context:
                                  pollCtx && typeof pollCtx === 'object' && pollCtx !== null
                                      ? pollCtx
                                      : undefined,
                          });
                const payload = includePromiseIdInBody
                    ? {
                          promiseId,
                          status: statusStr,
                          result: safeResult,
                          execute: webExecute,
                          completed: normalizedStatus.completed,
                          requestPhase: normalizedStatus.requestPhase,
                          retryAfter: normalizedStatus.retryAfter,
                      }
                    : {
                          asyncPending,
                          status: statusStr,
                          result: safeResult,
                          execute: webExecute,
                          completed: normalizedStatus.completed,
                          requestPhase: normalizedStatus.requestPhase,
                          retryAfter: normalizedStatus.retryAfter,
                      };
                // Drivers (Task Monitor) need execution.step/action for stall detection; not in web DTO execute.
                if (
                    includeCtx &&
                    pollCtx &&
                    typeof pollCtx === 'object' &&
                    pollCtx.execution &&
                    typeof pollCtx.execution === 'object'
                ) {
                    payload.context = { execution: pollCtx.execution };
                }
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

export async function handleAsyncFlow({ cwd, url, path, req, res, storageMode = 'storage' }) {
    const asyncMatch = path.match(/^\/sessions\/([^/]+)\/async$/);
    if (req.method === 'GET' && asyncMatch) {
        const sessionId = asyncMatch[1];
        if (!stepHandlers.isValidSessionId(sessionId)) {
            res.writeHead(400).end(JSON.stringify({ error: 'Invalid session ID' }));
            return true;
        }
        const { projectPath, cleanup, notFound } = beginProjectStepContextAsync(
            cwd,
            sessionId,
            url,
            storageMode
        );
        if (notFound) {
            res.writeHead(404).end(JSON.stringify({ error: 'Session not found (unknown project)' }));
            return true;
        }
        const unreg = () => cleanup();
        res.once('finish', unreg);
        res.once('close', unreg);

        if (!loadSessionForAsync(cwd, sessionId, projectPath)) {
            cleanup();
            res.writeHead(404).end(JSON.stringify({ error: 'Session not found' }));
            return true;
        }
        const session = loadSessionForAsync(cwd, sessionId, projectPath);
        // Use getActiveAsyncWork from session-projection-dto to also find completed async
        // that hasn't been saved to step files yet (from session-index fallback)
        const hit = getActiveAsyncWork(cwd, sessionId);
        if (!hit) {
            cleanup();
            // Idle envelope: no in-flight promise — omit execute/result (WEB_UI_PROTOCOL / e2e waitingAsyncIdle).
            res.setHeader('Content-Type', 'application/json');
            res.end(
                JSON.stringify({
                    asyncPending: false,
                    completed: true,
                    status: 'idle',
                    result: null,
                })
            );
            return true;
        }
        runViteClientPromisePoll({
            cwd,
            sessionId,
            promiseId: hit.promiseId,
            currentStep: hit.stepNum,
            requestUrl: url,
            res,
            includePromiseIdInBody: false,
            projectPath,
        });
        return true;
    }

    const promiseMatch = path.match(/^\/sessions\/([^/]+)\/promise\/([^/]+)$/);
    if (req.method === 'GET' && promiseMatch) {
        const sessionId = promiseMatch[1];
        const promiseId = promiseMatch[2];
        if (!stepHandlers.isValidSessionId(sessionId)) {
            res.writeHead(400).end(JSON.stringify({ error: 'Invalid session ID' }));
            return true;
        }

        const { projectPath, cleanup, notFound } = beginProjectStepContextAsync(
            cwd,
            sessionId,
            url,
            storageMode
        );
        if (notFound) {
            res.writeHead(404).end(JSON.stringify({ error: 'Session not found (unknown project)' }));
            return true;
        }
        const unreg = () => cleanup();
        res.once('finish', unreg);
        res.once('close', unreg);

        const session = loadSessionForAsync(cwd, sessionId, projectPath);
        if (!session) {
            cleanup();
            res.writeHead(404).end(JSON.stringify({ error: 'Session not found' }));
            return true;
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
        console.log(
            '[VitePlugin] Promise check - looking for promiseId:',
            promiseId,
            'found at step:',
            currentStep
        );

        runViteClientPromisePoll({
            cwd,
            sessionId,
            promiseId,
            currentStep,
            requestUrl: url,
            res,
            includePromiseIdInBody: true,
            projectPath,
        });
        return true;
    }

    return false;
}

