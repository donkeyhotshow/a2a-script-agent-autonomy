/**
 * Client-visible context: drop server-internal workbench slots before persistence and poll responses.
 */

import {SERVER_OWNED_WORKBENCH_SLOT_KEYS} from '../../../server-ai/src/interrupt-trace-contract.js';

/** Remove server-only workbench slots (gray room, interrupt trace, internal tool slots) — not for client API or disk. */
export function clientSafeWorkbench(wb: unknown): unknown {
    if (!wb || typeof wb !== 'object' || Array.isArray(wb)) {
        return wb;
    }
    const w = wb as Record<string, unknown>;
    const slots = w['slots'];
    if (!slots || typeof slots !== 'object' || Array.isArray(slots)) {
        return wb;
    }
    const s = slots as Record<string, unknown>;
    let removed = false;
    const slotsOut = {...s};
    for (const key of SERVER_OWNED_WORKBENCH_SLOT_KEYS) {
        if (key in slotsOut) {
            delete slotsOut[key];
            removed = true;
        }
    }
    if (!removed) {
        return wb;
    }
    return {...w, slots: slotsOut};
}

export function stripServerInternalWorkbenchFromContext(ctx: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {...ctx};
    // Never expose server-internal correlation id to clients or disk snapshots.
    delete out['session_id'];
    // Protocol versioning is not part of the client-visible contract.
    delete out['version'];
    if ('workbench' in out) {
        out['workbench'] = clientSafeWorkbench(out['workbench']);
    }
    return out;
}

/** Apply before writing `RequestResult.result` to disk so storage matches GET /requests/:id/result filtering. */
export function sanitizeRequestResultForStorage(result: Record<string, unknown>): Record<string, unknown> {
    const ctx = result['context'];
    if (!ctx || typeof ctx !== 'object' || Array.isArray(ctx)) {
        return result;
    }
    return {...result, context: stripServerInternalWorkbenchFromContext(ctx as Record<string, unknown>)};
}
