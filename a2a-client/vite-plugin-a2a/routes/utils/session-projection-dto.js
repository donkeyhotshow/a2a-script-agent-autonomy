/**
 * Session projection helpers.
 * Canonical session remains persisted in step artifacts; web receives projected DTO.
 */
import fs from 'fs';
import path from 'path';
import * as stepHandlers from '../handlers/step-handlers.js';
import { isActivePromiseStatus } from '../../storage/promise-status.js';
import { buildExecuteProjection } from './execute-projection-dto.js';
import { collectSessionMessagesFlat } from './message-timeline.js';
import { deriveSessionStage } from './session-stage-machine.js';
import { getA2aServerBaseUrl } from '../../../shared/a2a-server-base.js';
import { loadSessionIndex, getNewSessionDir } from '../../storage/newSessions.js';
import http from 'http';

function debugProjectionLog(event, payload) {
    if (process.env.A2A_SESSION_DTO_DEBUG !== '1') return;
    try {
        // Keep logs shape-only to avoid leaking full context payloads.
        console.debug(`[session-projection-dto] ${event}`, payload);
    } catch {
        // Never fail projection on debug logging.
    }
}

/**
 * In-flight async work: first step with an active server-promise.json (pending/processing).
 * Also checks session-index.json for promise metadata.
 * 
 * IMPORTANT: When falling back to session-index.json (which may have stale 'pending' status),
 * we must verify the actual promise status against the server. The session-index is not updated
 * when async completes (server-promise.json is deleted but index.promiseStatus stays 'pending').
 * 
 * NOTE: Also checks index even when server-promise.json is missing (completed async that wasn't polled).
 */
export function getActiveAsyncWork(cwd, sessionId) {
    // First check step files
    const steps = stepHandlers.listNewSteps(cwd, sessionId);
    for (const stepNum of steps) {
        const serverPromise = stepHandlers.loadServerPromise(cwd, sessionId, stepNum);
        if (serverPromise?.promiseId && isActivePromiseStatus(serverPromise.status)) {
            return { stepNum, promiseId: serverPromise.promiseId, serverPromise };
        }
    }
    
    // Fall back to checking session-index.json - but status may be stale!
    // session-index is not updated when async completes, so we must verify with server
    // Also check index even when server-promise.json is missing (completed async that wasn't polled)
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
                    const indexPath = path.join(getNewSessionDir(cwd, sessionId), 'session-index.json');
                    index.promiseId = null;
                    index.promiseStatus = null;
                    index.updatedAt = new Date().toISOString();
                    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
                } catch (e) {
                    // Ignore index write errors
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
            if (!stepData?.execute?.form?.choices) {
                // No execute in step - need to fetch result from server
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
            } catch (e) {
                console.error('[attachPromiseMeta] Verification failed, using local status:', e.message);
            }
        }
        
        session.promiseId = active.promiseId;
        session.promiseStatus = promiseStatus;
        session.asyncPending = asyncPending;
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
        const options = {
            hostname: urlObj.hostname,
            port: parseInt(urlObj.port, 10),
            path: urlObj.pathname,
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000 // 5 second timeout
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
                        } else {
                            resolve(null);
                        }
                    } catch (e) {
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
                console.error('[verifyPromiseStatusAsync] Request timeout');
                req.destroy();
                resolve(null);
            });
            
            req.end();
        });
    } catch (e) {
        console.error('[verifyPromiseStatusAsync] Error setting up request:', e.message);
        return null;
    }
}

/**
 * includeContext=true is debug-only.
 */
export function toPublicSession(session, includeContext = false) {
    if (!session) return session;
    if (includeContext) return { ...session };
    const { context: fullContext, promiseId: _omitTransportId, ...rest } = session;
    const base = {
        ...rest,
        asyncPending:
            session.asyncPending ??
            !!(session.promiseId && isActivePromiseStatus(session.promiseStatus)),
        promiseStatus: session.promiseStatus ?? null,
    };
    if (rest.execute !== undefined) {
        base.execute = buildExecuteProjection(rest.execute, { context: fullContext });
    }
    // Public-safe context slice (mode seeds, task) — full workbench/history only with includeContext=1.
    if (fullContext && typeof fullContext === 'object') {
        const slim = {};
        if (fullContext.execution && typeof fullContext.execution === 'object') {
            slim.execution = { ...fullContext.execution };
        }
        if (typeof fullContext.task === 'string') slim.task = fullContext.task;
        if (typeof fullContext.projectId === 'string') slim.projectId = fullContext.projectId;
        if (Object.keys(slim).length > 0) base.context = slim;
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
 * POST /next ack only.
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
        ...(promiseId ? { promiseId } : {}),
    };

}

export function toPublicNextResponse(response, includeContext = false) {
    if (!response || typeof response !== 'object') return response;
    const out = { ...response };
    if (out.session) {
        out.session = includeContext ? { ...out.session } : toPublicSession(out.session, false);
    }
    const sessionExecute = out.session?.execute ?? null;
    const topExecute = out.execute ?? null;
    out.execute = topExecute || sessionExecute || null;
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
