/**
 * Shared execute/context merge for Vite step routes + @a2a/sdk agent chain.
 *
 * Invoke `context` (this object): keep `history` as an **array** (`[]` when empty). Do not send root-level
 * `history` outside `context` — the server reads `context.history` (see `resolveHistoryLength`).
 */

import { unwrapA2aInvokeBody } from './client-api-envelope.mjs';
import { pickInvokeContextPatch } from './context-invoke-patch.mjs';

/**
 * Merge `workbench` from invoke patches without dropping `slots` the server omitted.
 * Shallow assign of `context.workbench` would replace `{ sections, slots: { grayRoom } }`
 * with `{ sections }` and lose gray-room / interrupt trace on the client session.
 */
function mergeWorkbenchPreserveSlots(fallbackWorkbench, mergedWorkbench) {
    if (mergedWorkbench === undefined) {
        return fallbackWorkbench;
    }
    if (!mergedWorkbench || typeof mergedWorkbench !== 'object' || Array.isArray(mergedWorkbench)) {
        return mergedWorkbench;
    }
    const fb = fallbackWorkbench && typeof fallbackWorkbench === 'object' && !Array.isArray(fallbackWorkbench) ? fallbackWorkbench : {};
    const fbSlots = fb.slots && typeof fb.slots === 'object' && !Array.isArray(fb.slots) ? fb.slots : {};
    const inSlots =
        mergedWorkbench.slots && typeof mergedWorkbench.slots === 'object' && !Array.isArray(mergedWorkbench.slots)
            ? mergedWorkbench.slots
            : {};
    const mergedSlots = {...fbSlots, ...inSlots};
    return {
        ...fb,
        ...mergedWorkbench,
        slots: mergedSlots,
    };
}

export function extractA2aExecute(serverResponse) {
    const inner = unwrapA2aInvokeBody(serverResponse);
    if (!inner) return null;
    return inner.execute ?? inner.result?.execute ?? null;
}

export function mergeResponseContext(fallbackContext = {}, serverResponse = null) {
    const base = { ...(fallbackContext || {}) };
    const inner = unwrapA2aInvokeBody(serverResponse);

    if (serverResponse?.context) {
        Object.assign(base, pickInvokeContextPatch(serverResponse.context));
    }

    if (inner?.context) {
        Object.assign(base, pickInvokeContextPatch(inner.context));
    }

    if (serverResponse?.result?.context) {
        Object.assign(base, pickInvokeContextPatch(serverResponse.result.context));
    }

    if (inner?.result?.context) {
        Object.assign(base, pickInvokeContextPatch(inner.result.context));
    }

    if (base.workbench !== undefined || fallbackContext?.workbench !== undefined) {
        base.workbench = mergeWorkbenchPreserveSlots(fallbackContext?.workbench, base.workbench);
    }

    return base;
}

export function sanitizeContextForServer(context) {
    if (!context || typeof context !== 'object' || Array.isArray(context)) {
        return {};
    }
    const safe = {...context};
    // Protocol versioning is not part of the wire contract.
    delete safe.version;
    // Client session identifiers are confidential client-only data and never sent to A2A server.
    delete safe.session_id;
    delete safe.clientSessionId;
    // Client API storage id + project scope — required on session.context locally, never sent to stateless server.
    delete safe.sessionId;
    delete safe.projectId;
    delete safe.projectRoot;

    const nested = safe.context;
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
        const nc = {...nested};
        delete nc.version;
        delete nc.session_id;
        delete nc.clientSessionId;
        delete nc.sessionId;
        delete nc.projectId;
        delete nc.projectRoot;
        safe.context = nc;
    }

    if (!Array.isArray(safe.history)) {
        safe.history = [];
    }
    return safe;
}

/**
 * Full POST /api/v1/invoke body: sanitize `context` and drop client-only top-level keys.
 * Use for every upstream invoke (Vite plugin + SDK).
 */
export function sanitizeInvokeBodyForA2aUpstream(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return body;
    }
    const out = {...body};
    delete out.sessionId;
    delete out.projectId;
    delete out.projectRoot;
    if (out.context != null && typeof out.context === 'object' && !Array.isArray(out.context)) {
        out.context = sanitizeContextForServer(out.context);
    }
    return out;
}
