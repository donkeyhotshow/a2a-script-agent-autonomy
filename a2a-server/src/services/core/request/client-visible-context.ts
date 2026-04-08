/**
 * Client-visible context: drop server-internal workbench slots before persistence and poll responses.
 */

import {GRAY_ROOM_SLOT_KEY} from '../../../transform/interrupt-trace-contract.js';

/** Remove server-only Gray Room slot (client / storage must not see internal control state). */
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
    if (!(GRAY_ROOM_SLOT_KEY in s)) {
        return wb;
    }
    const slotsOut = {...s};
    delete slotsOut[GRAY_ROOM_SLOT_KEY];
    return {...w, slots: slotsOut};
}

export function stripServerInternalWorkbenchFromContext(ctx: Record<string, unknown>): Record<string, unknown> {
    if (!('workbench' in ctx)) {
        return ctx;
    }
    return {...ctx, workbench: clientSafeWorkbench(ctx['workbench'])};
}

/** Apply before writing `RequestResult.result` to disk so storage matches GET /requests/:id/result filtering. */
export function sanitizeRequestResultForStorage(result: Record<string, unknown>): Record<string, unknown> {
    const ctx = result['context'];
    if (!ctx || typeof ctx !== 'object' || Array.isArray(ctx)) {
        return result;
    }
    return {...result, context: stripServerInternalWorkbenchFromContext(ctx as Record<string, unknown>)};
}
