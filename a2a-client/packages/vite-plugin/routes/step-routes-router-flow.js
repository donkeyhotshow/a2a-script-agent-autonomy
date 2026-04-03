import fs from 'fs';
import pathMod from 'path';
import { validateClientResultPayload } from '@a2a-client/shared/client-api-envelope.mjs';
import { isValidSessionId } from './middleware/validators.js';
import {
    toPublicSession,
    attachPromiseMeta,
} from './utils/session-projection-dto.js';
import { buildExecuteProjection } from './utils/execute-projection-dto.js';
import * as stepHandlers from './handlers/step-handlers.js';
import { resolveProjectPathForApi, loadSession } from '../storage/projectSessions.js';
import { registerStepSessionsParent } from '../storage/newSessions.js';

function projectSessionStepsParent(projectPath) {
    return pathMod.join(projectPath, '.a2a', 'session-steps');
}

/**
 * @returns {{ projectPath: string | null, cleanup: () => void, notFound: boolean }}
 */
function beginProjectStepContext(cwd, sessionId, url, storageMode) {
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

function loadSessionForRouter(cwd, sessionId, projectPath) {
    let session = stepHandlers.loadNewSession(cwd, sessionId);
    if (!session && projectPath) {
        session = loadSession(projectPath, sessionId);
    }
    return session;
}

/**
 * Same choice detection as session-view-model / stage machine: `form.choices` or `meta.routerChoices`.
 * @param {object|null|undefined} prevStepData - loadServerResponse / step record with execute + context
 */
export function routerFormHasChoices(prevStepData) {
    const form = prevStepData?.execute?.form;
    if (!form || typeof form !== 'object' || Array.isArray(form)) return false;
    const raw = form.choices ?? form.meta?.routerChoices;
    return Array.isArray(raw) && raw.length > 0;
}

function routerChoiceIdSet(prevStepData) {
    const form = prevStepData?.execute?.form;
    if (!form || typeof form !== 'object' || Array.isArray(form)) return new Set();
    const raw = form.choices ?? form.meta?.routerChoices;
    if (!Array.isArray(raw)) return new Set();
    const ids = new Set();
    for (const c of raw) {
        if (c && typeof c === 'object' && typeof c.id === 'string' && c.id.trim()) ids.add(c.id.trim());
    }
    return ids;
}

/**
 * If previous step was router but `task` was sent as free text, coerce to `choice` when it matches a button id.
 */
export function normalizeRouterStepSubmit(submitResult, prevStepData) {
    if (!submitResult || typeof submitResult !== 'object') return submitResult;
    const step = prevStepData?.context?.execution?.step;
    if (step !== 'router') return submitResult;
    const ids = routerChoiceIdSet(prevStepData);
    // If a choice is already set but not a known id, try to normalize it first.
    if (typeof submitResult.choice === 'string' && submitResult.choice.trim()) {
        const rawChoice = submitResult.choice.trim();
        if (ids.has(rawChoice)) return submitResult;
        const lc = rawChoice.toLowerCase();
        // Map common localized / free-text variants to canonical ids.
        if (lc === 'диалог' || lc === 'dialog' || lc === 'dialogue') {
            return { choice: 'dialog' };
        }
        if (lc === 'агент' || lc === 'agent') {
            return { choice: 'agent' };
        }
        if (lc === 'декомпозиция' || lc === 'декомпозиція' || lc === 'task-decomposition') {
            return { choice: 'task-decomposition' };
        }
        // Fall through: leave unknown choice as-is.
        return submitResult;
    }
    const msg = submitResult.message ?? prevStepData?.context?.task;
    if (typeof msg !== 'string' || !msg.trim()) return submitResult;
    const t = msg.trim();
    if (ids.has(t)) return { choice: t };
    const lcMsg = t.toLowerCase();
    if (lcMsg === 'диалог' || lcMsg === 'dialog' || lcMsg === 'dialogue') {
        return { choice: 'dialog' };
    }
    if (lcMsg === 'агент' || lcMsg === 'agent') {
        return { choice: 'agent' };
    }
    if (lcMsg === 'декомпозиция' || lcMsg === 'декомпозиція' || lcMsg === 'task-decomposition') {
        return { choice: 'task-decomposition' };
    }
    return submitResult;
}

export function buildSubmitResult({ body, hasChoices }) {
    const { result, task } = body || {};
    if (result) return result;
    if (!task) return undefined;
    return { [hasChoices ? 'choice' : 'message']: task };
}

export function validateSubmitResult(submitResult) {
    const submitResultError = validateClientResultPayload(submitResult);
    if (submitResultError) {
        return submitResultError;
    }
    return null;
}

export async function handleRouterFlow({ cwd, path, req, res, url, storageMode = 'storage' }) {
    const stepsListMatch = path.match(/^\/sessions\/([^/]+)\/steps$/);
    if (req.method === 'GET' && stepsListMatch) {
        const sessionId = stepsListMatch[1];
        const { cleanup, notFound } = beginProjectStepContext(cwd, sessionId, url, storageMode);
        if (notFound) {
            res.writeHead(404).end(JSON.stringify({ error: 'Session not found (unknown project)' }));
            return true;
        }
        try {
            const steps = stepHandlers.handleListSteps(sessionId, cwd);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ steps }));
        } catch (error) {
            res.writeHead(400).end(JSON.stringify({ error: error.message }));
        } finally {
            cleanup();
        }
        return true;
    }

    const stepDetailMatch = path.match(/^\/sessions\/([^/]+)\/steps\/(\d+)$/);
    if (req.method === 'GET' && stepDetailMatch) {
        const sessionId = stepDetailMatch[1];
        const { cleanup, notFound } = beginProjectStepContext(cwd, sessionId, url, storageMode);
        if (notFound) {
            res.writeHead(404).end(JSON.stringify({ error: 'Session not found (unknown project)' }));
            return true;
        }
        try {
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
        } finally {
            cleanup();
        }
        return true;
    }

    if (req.method === 'POST' && stepsListMatch) {
        const sessionId = stepsListMatch[1];
        void sessionId;
        res.writeHead(410).end(
            JSON.stringify({
                error: 'Deprecated endpoint. Use POST /api/a2a/sessions/:id/next.',
            })
        );
        return true;
    }

    const latestMatch = path.match(/^\/sessions\/([^/]+)\/latest$/);
    if (req.method === 'GET' && latestMatch) {
        const sessionId = latestMatch[1];
        if (!isValidSessionId(sessionId)) {
            res.writeHead(400).end(JSON.stringify({ error: 'Invalid session ID' }));
            return true;
        }
        const { projectPath, cleanup, notFound } = beginProjectStepContext(
            cwd,
            sessionId,
            url,
            storageMode
        );
        if (notFound) {
            res.writeHead(404).end(JSON.stringify({ error: 'Session not found (unknown project)' }));
            return true;
        }
        try {
            const session = loadSessionForRouter(cwd, sessionId, projectPath);
            if (!session) {
                res.writeHead(404).end(JSON.stringify({ error: 'Session not found' }));
                return true;
            }
            let latestStepNum = stepHandlers.getNewSessionLatestStep(cwd, sessionId);
            if (!latestStepNum && projectPath) {
                latestStepNum = session.currentStep || 1;
            }
            const includeContext = url.searchParams.get('includeContext') === '1';
            await attachPromiseMeta(cwd, sessionId, session);
            const response = {
                session: toPublicSession(session, includeContext),
                latestStep: latestStepNum,
            };
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(response));
            return true;
        } finally {
            cleanup();
        }
    }

    const historyMatch = path.match(/^\/sessions\/([^/]+)\/history\/(\d+)$/);
    if (req.method === 'GET' && historyMatch) {
        const sessionId = historyMatch[1];
        if (!isValidSessionId(sessionId)) {
            res.writeHead(400).end(JSON.stringify({ error: 'Invalid session ID' }));
            return true;
        }
        const fromStep = parseInt(historyMatch[2], 10);
        const { projectPath, cleanup, notFound } = beginProjectStepContext(
            cwd,
            sessionId,
            url,
            storageMode
        );
        if (notFound) {
            res.writeHead(404).end(JSON.stringify({ error: 'Session not found (unknown project)' }));
            return true;
        }
        try {
            const session = loadSessionForRouter(cwd, sessionId, projectPath);
            if (!session) {
                res.writeHead(404).end(JSON.stringify({ error: 'Session not found' }));
                return true;
            }
            console.log('[stepRoutes] history handler - cwd:', cwd, 'sessionId:', sessionId);
            const allSteps = stepHandlers.listNewSteps(cwd, sessionId);
            const stepsFrom = allSteps.filter((s) => s >= fromStep);
            const history = stepsFrom.map((stepNum) => {
                const data = stepHandlers.loadNewStep(cwd, sessionId, stepNum);
                if (!data?.execute) return { step: stepNum, data };
                return {
                    step: stepNum,
                    data: {
                        ...data,
                        execute: buildExecuteProjection(data.execute, data.context ? { context: data.context } : undefined),
                    },
                };
            });
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ history }));
            return true;
        } finally {
            cleanup();
        }
    }

    const stepFileMatch = path.match(/^\/sessions\/([^/]+)\/step\/(\d+)\/(server-promise|client-result|request-to-server|server-response)\.json$/);
    if (req.method === 'GET' && stepFileMatch) {
        const sessionId = stepFileMatch[1];
        const stepNum = parseInt(stepFileMatch[2], 10);
        const filename = `${stepFileMatch[3]}.json`;

        if (!isValidSessionId(sessionId)) {
            res.writeHead(400).end(JSON.stringify({ error: 'Invalid session ID' }));
            return true;
        }

        const { cleanup, notFound } = beginProjectStepContext(cwd, sessionId, url, storageMode);
        if (notFound) {
            res.writeHead(404).end(JSON.stringify({ error: 'Session not found (unknown project)' }));
            return true;
        }
        try {
            const data = stepHandlers.loadStepFile(cwd, sessionId, stepNum, filename);
            if (!data) {
                res.writeHead(404).end(JSON.stringify({ error: 'File not found' }));
                return true;
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
            return true;
        } finally {
            cleanup();
        }
    }

    return false;
}

