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
    delete safe.clientSessionId;
    if (!Array.isArray(safe.history)) {
        safe.history = [];
    }
    return safe;
}
