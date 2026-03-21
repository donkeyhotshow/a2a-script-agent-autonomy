/**
 * Web-facing session DTO: strip server context, assign message seq, public /next payload.
 */

import { listNewSteps, loadNewStep, loadStepFile, loadServerPromise } from '../../storage/newSessions.js';

/**
 * Flatten step files into one message list (order: per step, execute.message → client user → step messages).
 */
export function collectSessionMessagesFlat(cwd, sessionId) {
    const steps = listNewSteps(cwd, sessionId);
    const allMessages = [];
    const seenSlots = new Set();
    const stepMessageSlotKey = (stepNum, role, content) => {
        const r = role || 'assistant';
        const c =
            typeof content === 'string' ? content : content == null ? '' : String(content);
        return `${stepNum}|${r}|${c}`;
    };

    for (const stepNum of steps) {
        const stepData = loadNewStep(cwd, sessionId, stepNum);

        if (
            stepData?.execute?.message &&
            (!stepData?.messages || !stepData.messages.some((m) => m.content === stepData.execute.message))
        ) {
            const msgContent =
                typeof stepData.execute.message === 'string'
                    ? stepData.execute.message
                    : stepData.execute.message.content || stepData.execute.message.text || '';
            const slot = stepMessageSlotKey(stepNum, 'assistant', msgContent);
            if (!seenSlots.has(slot)) {
                allMessages.push({ role: 'assistant', content: msgContent, step: stepNum });
                seenSlots.add(slot);
            }
        }

        const clientResult = loadStepFile(cwd, sessionId, stepNum, 'client-result.json');
        if (clientResult?.result?.message) {
            const msgContent = clientResult.result.message;
            const slot = stepMessageSlotKey(stepNum, 'user', msgContent);
            if (!seenSlots.has(slot)) {
                allMessages.push({ role: 'user', content: msgContent, step: stepNum });
                seenSlots.add(slot);
            }
        }

        if (stepData?.messages && Array.isArray(stepData.messages) && stepData.messages.length > 0) {
            const stepMessages = stepData.messages.map((msg) => ({
                ...msg,
                step: stepNum,
            }));
            for (const msg of stepMessages) {
                const slot = stepMessageSlotKey(stepNum, msg.role, msg.content);
                if (seenSlots.has(slot)) continue;
                seenSlots.add(slot);
                allMessages.push(msg);
            }
        }
    }

    const withSeq = allMessages.map((m, i) => ({ ...m, seq: i + 1 }));
    const lastSeq = withSeq.length ? withSeq.length : 0;
    return { messages: withSeq, lastSeq };
}

export function attachPromiseMeta(cwd, sessionId, session) {
    const steps = listNewSteps(cwd, sessionId);
    const currentStep = session.currentStep || (steps.length > 0 ? steps[steps.length - 1] : 1);
    const serverPromise = loadServerPromise(cwd, sessionId, currentStep);
    if (serverPromise?.promiseId && (serverPromise.status === 'pending' || serverPromise.status === 'processing')) {
        session.promiseId = serverPromise.promiseId;
        session.promiseStatus = serverPromise.status;
    }
    return session;
}

/**
 * @param {boolean} includeContext - only when ?includeContext=1 (debug)
 */
export function toPublicSession(session, includeContext = false) {
    if (!session) return session;
    if (includeContext) return { ...session };
    const { context: _c, ...rest } = session;
    return rest;
}

/**
 * POST /next ack only — no session snapshot, execute, or messages (client daemon uses GET session / promise / messages).
 */
export function toMinimalNextAck({ success, step, promiseId, error }) {
    if (!success) {
        return { success: false, error: String(error || 'Request failed') };
    }
    return {
        success: true,
        accepted: true,
        step,
        promiseId: promiseId ?? null,
    };
}

/**
 * @deprecated Legacy rich /next payload; prefer toMinimalNextAck + GET session.
 */
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
