/**
 * Session projection helpers.
 * Canonical session remains persisted in step artifacts; web receives projected DTO.
 */
import fs from 'fs';
import path from 'path';
import * as stepHandlers from '../handlers/step-handlers.js';
import { isActivePromiseStatus, isRecoverableAsyncSnapshot } from '@a2a-client/storage/promise-status.js';
import { buildExecuteProjection, buildWebExecute } from './execute-projection-dto.js';
import { collectSessionMessagesFlat } from './message-timeline.js';
import { deriveSessionStage } from './session-stage-machine.js';
import { getA2aServerBaseUrl } from '@a2a-client/shared/a2a-server-base.js';
import { loadSessionIndex, getNewSessionDir, registerStepSessionsParent, findOpenAsyncStepWithoutResponse, } from '@a2a-client/storage/newSessions.js';
import http from 'http';
function hasProjectedExecutePayload(ex) {
    return ex != null && typeof ex === 'object' && !Array.isArray(ex) && Object.keys(ex).length > 0;
}
function debugProjectionLog(event, payload) {
    if (process.env.A2A_SESSION_DTO_DEBUG !== '1')
        return;
    try {
        // Keep logs shape-only to avoid leaking full context payloads.
        console.debug(`[session-projection-dto] ${event}`, payload);
    }
    catch (err) {
        console.error('[session-projection-dto] debugProjectionLog failed', err);
    }
}
/**
 * In-flight async work: first step with an active server-promise.tson (pending/processing).
 * Also checks session-index.tson for promise metadata.
 *
 * IMPORTANT: When falling back to session-index.tson (which may have stale 'pending' status),
 * we must verify the actual promise status against the server. The session-index is not updated
 * when async completes (server-promise.tson is deleted but index.promiseStatus stays 'pending').
 *
 * NOTE: Also checks index even when server-promise.tson is missing (completed async that wasn't polled).
 */
export function getActiveAsyncWork(cwd, sessionId) {
    // First check step files
    const steps = stepHandlers.listNewSteps(cwd, sessionId);
    for (const stepNum of steps) {
        const serverPromise = stepHandlers.loadServerPromise(cwd, sessionId, stepNum);
        const promiseId = serverPromise?.promiseId;
        const st = serverPromise?.status;
        const recoverableFailed = (st === 'failed' || st === 'error') && isRecoverableAsyncSnapshot(serverPromise);
        if (promiseId && (isActivePromiseStatus(st) || recoverableFailed)) {
            return { stepNum, promiseId, serverPromise };
        }
    }
    // Fall back to checking session-index.tson - but status may be stale!
    // session-index is not updated when async completes, so we must verify with server
    // Also check index even when server-promise.tson is missing (completed async that wasn't polled)
    const index = loadSessionIndex(cwd, sessionId);
    if (index?.promiseId) {
        // If status is pending/processing/waiting, verify with server
        if (index.promiseStatus === 'pending' || index.promiseStatus === 'processing' || index.promiseStatus === 'waiting') {
            const cs = index.currentStep || 1;
            const consolidated = stepHandlers.loadNewStep(cwd, sessionId, cs);
            if (consolidated?.execute) {
                // Stale index: step has execute but index still shows pending
                // Clear the stale promise from index
                try {
                    const indexPath = path.join(getNewSessionDir(cwd, sessionId), 'session-index.tson');
                    index.promiseId = null;
                    index.promiseStatus = null;
                    index.updatedAt = new Date().toISOString();
                    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
                }
                catch (e) {
                    console.error('[session-projection-dto] failed to clear stale promise in session-index', e);
                }
                return null;
            }
            return {
                stepNum: cs,
                promiseId: index.promiseId,
                serverPromise: { status: index.promiseStatus || 'pending' },
                needsServerVerification: true, // Flag to force verification
            };
        }
        // If index shows completed but there's no server-response with execute,
        // we still need to return so /async can save the result
        if (index.promiseStatus === 'completed') {
            // Check if the latest step has the execute data
            const latestStep = index.currentStep || 1;
            const stepData = stepHandlers.loadNewStep(cwd, sessionId, latestStep);
            // Task-input forms have no choices; treat missing execute object as "need /async fetch".
            if (!stepData?.execute || typeof stepData.execute !== 'object') {
                return {
                    stepNum: latestStep,
                    promiseId: index.promiseId,
                    serverPromise: { status: 'completed' },
                    needsServerVerification: false // Already marked completed, just fetch result
                };
            }
        }
    }
    return null;
}
/**
 * In-flight async for project-mode sessions: step artifacts under `{projectPath}/.a2a/session-steps/{sessionId}`
 * (via temporary `registerStepSessionsParent`) plus snapshot fields on `.a2a/sessions/{id}.tson`.
 */
export function getProjectModeInflightPromise(cwd, sessionId, projectPath, sessionObj) {
    if (projectPath && typeof projectPath === 'string') {
        const stepsParent = path.join(projectPath, '.a2a', 'session-steps');
        registerStepSessionsParent(sessionId, stepsParent);
        try {
            const hit = getActiveAsyncWork(cwd, sessionId);
            if (hit?.promiseId)
                return { promiseId: hit.promiseId };
        }
        finally {
            registerStepSessionsParent(sessionId, null);
        }
    }
    if (sessionObj && typeof sessionObj === 'object') {
        if (sessionObj.asyncPending === true) {
            const pid = sessionObj.promiseId ||
                sessionObj.execute?.promiseId ||
                sessionObj.context?.result?.promiseId ||
                null;
            if (pid)
                return { promiseId: pid };
        }
        const pid = sessionObj.promiseId;
        if (pid) {
            const st = sessionObj.promiseStatus;
            if (st == null || st === '' || isActivePromiseStatus(st)) {
                return { promiseId: pid };
            }
        }
    }
    return null;
}
/**
 * Pending async work metadata.
 * Verifies the actual promise status via GET /api/v1/requests/:id/result to avoid stale pending state.
 *
 * CRITICAL: When getActiveAsyncWork returns with needsServerVerification flag (from session-index fallback),
 * we MUST verify against the server because session-index is not updated when async completes.
 *
 * @param {string} cwd - Working directory
 * @param {string} sessionId - Session ID
 * @param {object} session - Session object to attach metadata to
 * @param {boolean} [verifyFromServer=true] - Whether to verify promise status from A2A server (async operation)
 * @returns {Promise<object>} Session with promise metadata attached
 */
export async function attachPromiseMeta(cwd, sessionId, session, verifyFromServer = true) {
    const active = getActiveAsyncWork(cwd, sessionId);
    if (active) {
        let promiseStatus = active.serverPromise.status;
        let asyncPending = isActivePromiseStatus(promiseStatus);
        // Always verify if:
        // 1. verifyFromServer is true AND
        // 2. Either we have needsServerVerification flag (session-index fallback) OR status is pending
        const shouldVerify = verifyFromServer && (active.needsServerVerification || promiseStatus === 'pending');
        if (shouldVerify) {
            try {
                const verifiedStatus = await verifyPromiseStatusAsync(active.promiseId);
                if (verifiedStatus !== null) {
                    promiseStatus = verifiedStatus;
                    asyncPending = isActivePromiseStatus(verifiedStatus);
                }
            }
            catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                console.error('[attachPromiseMeta] Verification failed, using local status:', msg);
            }
        }
        session.promiseId = active.promiseId;
        session.promiseStatus = promiseStatus;
        session.asyncPending = asyncPending;
        return session;
    }
    const open = findOpenAsyncStepWithoutResponse(cwd, sessionId);
    if (open?.mode === 'pending') {
        session.asyncPending = true;
        session.promiseId = open.promise?.promiseId ?? session.promiseId;
        session.promiseStatus = open.promise?.status ?? session.promiseStatus;
        delete session.execute;
        return session;
    }
    if (open?.mode === 'failed' && !isRecoverableAsyncSnapshot(open.promise)) {
        session.asyncPending = false;
        session.promiseId = open.promise?.promiseId ?? session.promiseId;
        session.promiseStatus = open.promise?.status ?? 'failed';
        const err = open.promise?.error;
        const msg = (err && typeof err.message === 'string' && err.message.trim()) ||
            "We couldn't complete this step. Please try again.";
        session.execute = { message: msg };
        if (open.promise?.context && typeof open.promise.context === 'object') {
            session.context = { ...(session.context && typeof session.context === 'object' ? session.context : {}), ...open.promise.context };
        }
        return session;
    }
    session.asyncPending = false;
    return session;
}
/**
 * Verifies the current status of a promise by querying the A2A server.
 * @param {string} promiseId - The promise ID to check
 * @returns {Promise<string|null>} The current status or null if verification fails
 */
async function verifyPromiseStatusAsync(promiseId) {
    const a2aServerUrl = getA2aServerBaseUrl();
    const url = `${a2aServerUrl}/api/v1/requests/${promiseId}/result`;
    console.log('[verifyPromiseStatusAsync] Checking promise:', promiseId, 'url:', url);
    try {
        const urlObj = new URL(url);
        const portNum = urlObj.port ? parseInt(urlObj.port, 10) : urlObj.protocol === 'https:' ? 443 : 80;
        const options = {
            hostname: urlObj.hostname,
            port: Number.isFinite(portNum) ? portNum : urlObj.protocol === 'https:' ? 443 : 80,
            path: urlObj.pathname,
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            timeout: 0 // no socket timeout — promiseId /result verification must not abort on slow hub/LLM
        };
        return new Promise((resolve) => {
            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => (data += chunk));
                res.on('end', () => {
                    try {
                        if (data && data.trim() !== '') {
                            const parsed = JSON.parse(data);
                            // The response from /api/v1/requests/:id/result wraps in { success, data }
                            // or returns the status object directly depending on server implementation
                            const statusObj = parsed.data || parsed;
                            resolve(statusObj.status || null);
                        }
                        else {
                            resolve(null);
                        }
                    }
                    catch (e) {
                        console.error('[verifyPromiseStatusAsync] Failed to parse response:', e.message);
                        resolve(null);
                    }
                });
            });
            req.on('error', (e) => {
                console.error('[verifyPromiseStatusAsync] Request error:', e.message);
                resolve(null);
            });
            req.on('timeout', () => {
                console.error('[verifyPromiseStatusAsync] Request timeout (unexpected)');
                req.destroy();
                resolve(null);
            });
            req.end();
        });
    }
    catch (e) {
        console.error('[verifyPromiseStatusAsync] Error setting up request:', e.message);
        return null;
    }
}
/**
 * includeContext=true is debug-only (full context for drivers/tests).
 * Still attach `stage` / promise meta like the public path so POST /sessions matches GET projection UX.
 */
export function toPublicSession(session, includeContext = false) {
    if (!session)
        return session;
    if (includeContext) {
        const out = { ...session };
        out.asyncPending =
            session.asyncPending ??
                !!(session.promiseId && isActivePromiseStatus(session.promiseStatus));
        out.promiseStatus = session.promiseStatus ?? null;
        out.stage = deriveSessionStage({
            execute: out.execute ?? null,
            context: out.context ?? null,
            asyncPending: out.asyncPending,
            status: out.status ?? null,
        });
        debugProjectionLog('toPublicSession', {
            includeContext: true,
            asyncPending: out.asyncPending,
            stage: out.stage,
            executeKeys: out.execute && typeof out.execute === 'object' ? Object.keys(out.execute) : [],
        });
        return out;
    }
    const { context: fullContext, promiseId: _omitTransportId, ...rest } = session;
    const base = {
        ...rest,
        asyncPending: session.asyncPending ??
            !!(session.promiseId && isActivePromiseStatus(session.promiseStatus)),
        promiseStatus: session.promiseStatus ?? null,
    };
    if (rest.execute !== undefined) {
        base.execute = buildExecuteProjection(rest.execute, { context: fullContext });
    }
    // Public-safe context slice: task/projectId + minimal execution (pipeline/routing) —
    // full workbench/history only with includeContext=1.
    if (fullContext && typeof fullContext === 'object') {
        const slim = {};
        if (typeof fullContext.task === 'string')
            slim.task = fullContext.task;
        if (typeof fullContext.projectId === 'string')
            slim.projectId = fullContext.projectId;
        const ex = fullContext.execution;
        if (ex && typeof ex === 'object' && !Array.isArray(ex)) {
            const execSlim = {};
            if (typeof ex.action === 'string')
                execSlim.action = ex.action;
            if (typeof ex.step === 'string')
                execSlim.step = ex.step;
            if (typeof ex.status === 'string')
                execSlim.status = ex.status;
            if (Object.keys(execSlim).length > 0)
                slim.execution = execSlim;
        }
        if (Object.keys(slim).length > 0)
            base.context = slim;
    }
    // Attach coarse-grained stage for Web UI / adapters.
    base.stage = deriveSessionStage({
        execute: base.execute ?? null,
        context: session.context ?? null,
        asyncPending: base.asyncPending,
        status: base.status ?? null,
    });
    debugProjectionLog('toPublicSession', {
        includeContext: false,
        asyncPending: base.asyncPending,
        stage: base.stage,
        executeKeys: base.execute && typeof base.execute === 'object' ? Object.keys(base.execute) : [],
    });
    return base;
}
/**
 * POST /next ack only (Vite Client API).
 * `promiseId` is used only to set `asyncPending`; it is **not** included in the JSON (transport id stays off the wire).
 */
export function toMinimalNextAck({ success, step, promiseId, error }) {
    if (!success) {
        return { success: false, error: String(error || 'Request failed') };
    }
    const asyncPending = !!promiseId;
    return {
        success: true,
        accepted: true,
        step,
        asyncPending,
    };
}
export function toPublicNextResponse(response, includeContext = false) {
    if (!response || typeof response !== 'object')
        return response;
    const out = { ...response };
    if (out.session) {
        out.session = includeContext ? { ...out.session } : toPublicSession(out.session, false);
    }
    const sessionExecute = out.session?.execute ?? null;
    const topExecute = out.execute ?? null;
    const sessionContext = out.session?.context && typeof out.session.context === 'object' && !Array.isArray(out.session.context)
        ? out.session.context
        : undefined;
    let resolvedExecute = null;
    if (hasProjectedExecutePayload(sessionExecute)) {
        resolvedExecute = sessionExecute;
    }
    else if (topExecute != null && typeof topExecute === 'object' && !Array.isArray(topExecute)) {
        const sanitized = buildWebExecute(topExecute, sessionContext ? { context: sessionContext } : undefined);
        if (hasProjectedExecutePayload(sanitized)) {
            resolvedExecute = sanitized;
        }
    }
    if (resolvedExecute == null) {
        resolvedExecute = sessionExecute ?? topExecute ?? null;
    }
    out.execute = resolvedExecute;
    if (!includeContext) {
        delete out.context;
    }
    debugProjectionLog('toPublicNextResponse', {
        includeContext,
        hasSession: !!out.session,
        executeKeys: out.execute && typeof out.execute === 'object' ? Object.keys(out.execute) : [],
    });
    return out;
}
export { collectSessionMessagesFlat };
