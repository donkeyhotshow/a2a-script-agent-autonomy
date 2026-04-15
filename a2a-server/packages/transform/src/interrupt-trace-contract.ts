/**
 * UA-S-01 — Canonical placement for gray-room interrupt trace on server → client payloads.
 *
 * **Path:** `context.workbench.slots.interruptTrace` (array of `ServerInterruptTraceEvent`).
 *
 * **Writer (runtime):** `GrayRoomOrchestrator` merges the accumulated trace here before returning
 * (`mergeInterruptTraceIntoContext`). Do not add parallel roots (e.g. `context.interruptTrace`).
 *
 * **Reader (UI):** `a2a-client/packages/web/js/task-flow/render-layout.js` — `slots?.interruptTrace`.
 * Session docs: `a2a-client/docs/SESSION-READ-MODEL.md`, `docs/SESSION-SYSTEMS-OVERVIEW.md`.
 *
 * **Goldens:** Substeps `N-sub-M` and parent step `response.json` may carry trace; see `simulations/SCHEMA.md`.
 *
 * **`grayRoom`:** `context.workbench.slots.grayRoom` — `GrayRoomControlEnvelope` (GR-S-08); written by
 * `mergeGrayRoomSlotIntoContext` from `GrayRoomOrchestrator`.
 */

import type {GrayRoomControlEnvelope, ServerInterruptTraceEvent} from './types.js';

/** Slot key under `workbench.slots` (single source of truth). */
export const INTERRUPT_TRACE_SLOT_KEY = 'interruptTrace' as const;

/** GR-S-08 — gray-room control envelope under `workbench.slots`. */
export const GRAY_ROOM_SLOT_KEY = 'grayRoom' as const;

/**
 * Slot keys owned by the server (gray room, trace). LLM `workbench.slots` merges must not overwrite these.
 */
export const SERVER_OWNED_WORKBENCH_SLOT_KEYS: ReadonlySet<string> = new Set([
    INTERRUPT_TRACE_SLOT_KEY,
    GRAY_ROOM_SLOT_KEY,
    'thinking',
    'clarify',
]);

/** Human-readable JSON path for docs and logs. */
export const INTERRUPT_TRACE_CONTEXT_PATH = 'context.workbench.slots.interruptTrace' as const;

/**
 * Merge interrupt trace into `context.workbench.slots`. Preserves other `slots` / `workbench` keys.
 */
function workbenchWithSections(
    wb: Record<string, unknown>,
    patch: Record<string, unknown>
): Record<string, unknown> {
    const rawSec = wb['sections'];
    const sections =
        rawSec && typeof rawSec === 'object' && !Array.isArray(rawSec)
            ? (rawSec as Record<string, unknown>)
            : {};
    return {
        ...wb,
        ...patch,
        sections: {...sections, ...(patch['sections'] as Record<string, unknown> | undefined)},
    };
}

function normalizeWorkbenchRecord(wb: unknown): Record<string, unknown> {
    return wb && typeof wb === 'object' && !Array.isArray(wb) ? (wb as Record<string, unknown>) : {};
}

export function mergeInterruptTraceIntoContext(
    context: Record<string, unknown>,
    trace: ServerInterruptTraceEvent[]
): Record<string, unknown> {
    const wb = normalizeWorkbenchRecord(context['workbench']);
    const slots = (wb['slots'] as Record<string, unknown>) ?? {};
    return {
        ...context,
        workbench: workbenchWithSections(wb, {
            slots: {
                ...slots,
                [INTERRUPT_TRACE_SLOT_KEY]: trace,
            },
        }),
    };
}

/**
 * Merge gray-room control envelope into `context.workbench.slots`. Preserves other slot keys.
 */
export function mergeGrayRoomSlotIntoContext(
    context: Record<string, unknown>,
    envelope: GrayRoomControlEnvelope
): Record<string, unknown> {
    const wb = normalizeWorkbenchRecord(context['workbench']);
    const slots = (wb['slots'] as Record<string, unknown>) ?? {};
    return {
        ...context,
        workbench: workbenchWithSections(wb, {
            slots: {
                ...slots,
                [GRAY_ROOM_SLOT_KEY]: envelope,
            },
        }),
    };
}
