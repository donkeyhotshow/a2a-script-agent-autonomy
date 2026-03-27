import { validateClientResultPayload } from '../../shared/client-api-envelope.mjs';
import { isValidSessionId } from './middleware/validators.js';
import {
    toPublicSession,
    attachPromiseMeta,
} from './utils/session-projection-dto.js';
import { buildExecuteProjection } from './utils/execute-projection-dto.js';
import * as stepHandlers from './handlers/step-handlers.js';

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

export function handleRouterFlow({ cwd, path, req, res, url }) {
    const stepsListMatch = path.match(/^\/sessions\/([^/]+)\/steps$/);
    if (req.method === 'GET' && stepsListMatch) {
        try {
            const sessionId = stepsListMatch[1];
            const steps = stepHandlers.handleListSteps(sessionId, cwd);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ steps }));
        } catch (error) {
            res.writeHead(400).end(JSON.stringify({ error: error.message }));
        }
        return true;
    }

    const stepDetailMatch = path.match(/^\/sessions\/([^/]+)\/steps\/(\d+)$/);
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
        const session = stepHandlers.loadNewSession(cwd, sessionId);
        if (!session) {
            res.writeHead(404).end(JSON.stringify({ error: 'Session not found' }));
            return true;
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
        return true;
    }

    const historyMatch = path.match(/^\/sessions\/([^/]+)\/history\/(\d+)$/);
    if (req.method === 'GET' && historyMatch) {
        const sessionId = historyMatch[1];
        if (!isValidSessionId(sessionId)) {
            res.writeHead(400).end(JSON.stringify({ error: 'Invalid session ID' }));
            return true;
        }
        const fromStep = parseInt(historyMatch[2], 10);
        const session = stepHandlers.loadNewSession(cwd, sessionId);
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
                data: { ...data, execute: buildExecuteProjection(data.execute) },
            };
        });
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ history }));
        return true;
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

        const data = stepHandlers.loadStepFile(cwd, sessionId, stepNum, filename);
        if (!data) {
            res.writeHead(404).end(JSON.stringify({ error: 'File not found' }));
            return true;
        }

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
        return true;
    }

    return false;
}

