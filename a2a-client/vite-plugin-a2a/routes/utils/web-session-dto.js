/**
 * Web-facing session DTO: strip server context, assign message seq, public /next payload.
 *
 * FILE NAMING MAPPING (golden vs runtime):
 * +---------------------------+----------------------------+----------------------------------+
 * | Golden Simulation File    | Runtime Step File          | Purpose                          |
 * +---------------------------+----------------------------+----------------------------------+
 * | request.json             | request-to-server.json    | Payload sent to A2A Server       |
 * | response.json            | server-response.json       | Server execute/context/result   |
 * | client.json              | client-result.json         | User input (message or choice)  |
 * | received.json            | (derived from response)   | Sanitized execute for Web UI    |
 * +---------------------------+----------------------------+----------------------------------+
 * Note: runtime uses "-to-server" suffix to distinguish client→server from server→client.
 */

import { listNewSteps, loadNewStep, loadStepFile, loadServerPromise } from '../../storage/newSessions.js';
import { buildWebExecute } from './web-execute-dto.js';

function isActivePromiseStatus(status) {
    return status === 'pending' || status === 'processing';
}

/**
 * In-flight async work: first incomplete step with an active server-promise.json.
 * @returns {{ stepNum: number, promiseId: string, serverPromise: object } | null}
 */
export function getActiveAsyncWork(cwd, sessionId) {
    const steps = listNewSteps(cwd, sessionId);
    for (const stepNum of steps) {
        const completed = loadNewStep(cwd, sessionId, stepNum) != null;
        if (completed) continue;
        const serverPromise = loadServerPromise(cwd, sessionId, stepNum);
        if (serverPromise?.promiseId && isActivePromiseStatus(serverPromise.status)) {
            return { stepNum, promiseId: serverPromise.promiseId, serverPromise };
        }
    }
    return null;
}

/**
 * Flatten step files into one message list (order per step: execute.message → messages.json → client-result).
 * Assistant replies for a step live in messages.json; client-result is the user input recorded in that folder,
 * which chronologically follows the assistant turn — so messages.json must come before client-result.
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

        const clientResult = loadStepFile(cwd, sessionId, stepNum, 'client-result.json');
        if (clientResult?.result?.message) {
            const msgContent = clientResult.result.message;
            const slot = stepMessageSlotKey(stepNum, 'user', msgContent);
            if (!seenSlots.has(slot)) {
                allMessages.push({ role: 'user', content: msgContent, step: stepNum });
                seenSlots.add(slot);
            }
        }
    }

    const withSeq = allMessages.map((m, i) => ({ ...m, seq: i + 1 }));
    const lastSeq = withSeq.length ? withSeq.length : 0;
    return { messages: withSeq, lastSeq };
}

/**
 * Pending async work is stored under the in-flight step (often N+1) while session.currentStep
 * still points at the last step with server-response.json. Scan incomplete steps for server-promise.json.
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
 * @param {boolean} includeContext - only when ?includeContext=1 (debug)
 *
 * API PARAMETER → EXECUTE SHAPE TABLE:
 * +---------------------+---------------------------------------------------+
 * | Parameter           | execute shape                                    |
 * +---------------------+---------------------------------------------------+
 * | default (no param)  | DTO-sanitized via buildWebExecute()             |
 * |                     | - strips: rag-search, read-file, write-file,     |
 * |                     |   script, execute-command, list-directory,      |
 * |                     |   grep-search, file-exists, edit-patch, run-script, debug |
 * |                     | - adds: message (if no form), attachments        |
 * | ?includeContext=1   | Raw execute from server (all keys intact)       |
 * |                     | - Use only for debugging / tooling              |
 * +---------------------+---------------------------------------------------+
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
        base.execute = buildWebExecute(rest.execute);
    }
    return base;
}

/**
 * POST /next ack only — no session snapshot, execute, or messages (client daemon uses GET session / promise / messages).
 * Note: promiseId is NOT returned to Web UI - Client API daemon handles polling internally via /async endpoint.
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
        // NOTE: promiseId intentionally NOT included - Web UI should poll via /async endpoint
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
