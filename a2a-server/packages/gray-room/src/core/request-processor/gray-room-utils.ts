/**
 * Inner context structure within gray room pipeline
 */
export interface GrayRoomInnerContext {
    session_id?: string;
    workbench?: unknown;
    files?: unknown;
    history?: unknown[];
    execution?: unknown;
    operationHistory?: unknown[];
    [key: string]: unknown;
}

/**
 * Top-level context structure for gray room pipeline
 */
export interface GrayRoomContext {
    context?: GrayRoomInnerContext;
    history?: unknown[];
    [key: string]: unknown;
}

/** Single-key `execute` payloads that must pass through to the client (tool rounds). */
export const DIALOG_TOOL_EXECUTE_KEYS = [
    'rag-search',
    'read-file',
    'write-file',
    'execute-command',
    'list-directory',
    'grep-search',
    'script',
] as const;

/** True when `execute` is a single allowed dialog tool key (tool round, not form/chat). */
export function isDialogToolExecutePayload(
    execute: Record<string, unknown> | null | undefined
): boolean {
    if (!execute || typeof execute !== 'object' || Array.isArray(execute)) {
        return false;
    }
    const keys = Object.keys(execute);
    if (keys.length !== 1) {
        return false;
    }
    return (DIALOG_TOOL_EXECUTE_KEYS as readonly string[]).includes(keys[0]!);
}

/**
 * Merge transform `context` with handler output for gray-room finalize (`continueLoop: false`).
 * Handlers update `nextCtx.context` (workbench.slots, files, compressed history); using only
 * `rawOutput.context` would drop those updates.
 */
export function mergeGrayRoomFinalizeInnerContext(
    rawInner: Record<string, unknown> | undefined,
    nextCtx: GrayRoomContext
): Record<string, unknown> | undefined {
    const nextInner = nextCtx.context;
    if (!nextInner || typeof nextInner !== 'object' || Array.isArray(nextInner)) {
        return rawInner;
    }
    if (!rawInner) {
        return nextInner;
    }
    const { history: _nextHistorySpread, ...nextInnerNoHist } = nextInner;
    const rwb = rawInner.workbench;
    const nwb = nextInner.workbench;
    let workbenchMerged: Record<string, unknown> | undefined;
    if (rwb && typeof rwb === 'object' && !Array.isArray(rwb) && nwb && typeof nwb === 'object' && !Array.isArray(nwb)) {
        const ra = rwb as Record<string, unknown>;
        const nb = nwb as Record<string, unknown>;
        const rs = ra.sections;
        const ns = nb.sections;
        const rsl = ra.slots;
        const nsl = nb.slots;
        workbenchMerged = {
            ...ra,
            ...nb,
            ...(rs || ns
                ? {
                      sections: {
                          ...(typeof rs === 'object' && rs && !Array.isArray(rs) ? (rs as Record<string, unknown>) : {}),
                          ...(typeof ns === 'object' && ns && !Array.isArray(ns) ? (ns as Record<string, unknown>) : {}),
                      },
                  }
                : {}),
            ...(rsl || nsl
                ? {
                      slots: {
                          ...(typeof rsl === 'object' && rsl && !Array.isArray(rsl) ? (rsl as Record<string, unknown>) : {}),
                          ...(typeof nsl === 'object' && nsl && !Array.isArray(nsl) ? (nsl as Record<string, unknown>) : {}),
                      },
                  }
                : {}),
        };
    } else if (nwb && typeof nwb === 'object' && !Array.isArray(nwb)) {
        workbenchMerged = nwb as Record<string, unknown>;
    } else if (rwb && typeof rwb === 'object' && !Array.isArray(rwb)) {
        workbenchMerged = rwb as Record<string, unknown>;
    }

    const nextHist = nextInner.history;
    const rawHist = rawInner.history;
    const historyMerged = Array.isArray(nextHist)
        ? nextHist
        : Array.isArray(rawHist)
          ? rawHist
          : undefined;

    return {
        ...rawInner,
        ...nextInnerNoHist,
        ...(workbenchMerged !== undefined ? {workbench: workbenchMerged} : {}),
        ...(historyMerged !== undefined ? {history: historyMerged} : {}),
        ...(nextInner.files && typeof nextInner.files === 'object' && !Array.isArray(nextInner.files)
            ? {files: nextInner.files}
            : {}),
    };
}

export interface GrayRoomOptions {
    maxInterruptTurns?: number;
    aiHubUrl?: string;
    model?: string;
    promptsTransformsPath: string;
}

/**
 * Result of a review operation in gray room
 */
export interface ReviewResult {
    passed: boolean;
    critique: string;
    turn: number;
}

/** Immutably set `context.workbench.slots[slotKey]` on a shallow-copied root context. */
export function mergeSlotIntoWorkbenchContext(
    ctx: GrayRoomContext,
    slotKey: string,
    slotValue: unknown
): GrayRoomContext {
    const root = {...ctx};
    const innerCtx = root.context ?? {};
    const wb = (innerCtx.workbench as Record<string, unknown>) ?? {};
    const slots = (wb.slots as Record<string, unknown>) ?? {};
    return {
        ...root,
        context: {
            ...innerCtx,
            workbench: {...wb, slots: {...slots, [slotKey]: slotValue}},
        },
    };
}