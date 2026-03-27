/**
 * Session projection helpers.
 * Canonical session remains persisted in step artifacts; web receives projected DTO.
 */
import * as stepHandlers from '../handlers/step-handlers.js';
import { isActivePromiseStatus } from '../../storage/promise-status.js';
import { buildExecuteProjection } from './execute-projection-dto.js';
import { collectSessionMessagesFlat } from './message-timeline.js';

/**
 * In-flight async work: first step with an active server-promise.json (pending/processing).
 */
export function getActiveAsyncWork(cwd, sessionId) {
    const steps = stepHandlers.listNewSteps(cwd, sessionId);
    for (const stepNum of steps) {
        const serverPromise = stepHandlers.loadServerPromise(cwd, sessionId, stepNum);
        if (serverPromise?.promiseId && isActivePromiseStatus(serverPromise.status)) {
            return { stepNum, promiseId: serverPromise.promiseId, serverPromise };
        }
    }
    return null;
}

/**
 * Pending async work metadata.
 */
export function attachPromiseMeta(cwd, sessionId, session) {
    const active = getActiveAsyncWork(cwd, sessionId);
    if (active) {
        session.promiseId = active.promiseId;
        session.promiseStatus = active.serverPromise.status;
        session.asyncPending = true;
        return session;
    }
    session.asyncPending = false;
    return session;
}

/**
 * includeContext=true is debug-only.
 */
export function toPublicSession(session, includeContext = false) {
    if (!session) return session;
    if (includeContext) return { ...session };
    const { context: _c, promiseId: _omitTransportId, ...rest } = session;
    const base = {
        ...rest,
        asyncPending:
            session.asyncPending ??
            !!(session.promiseId && isActivePromiseStatus(session.promiseStatus)),
        promiseStatus: session.promiseStatus ?? null,
    };
    if (rest.execute !== undefined) {
        base.execute = buildExecuteProjection(rest.execute);
    }
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
    return out;
}

export { collectSessionMessagesFlat };
