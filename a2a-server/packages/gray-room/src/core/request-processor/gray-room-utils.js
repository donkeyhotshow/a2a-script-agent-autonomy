/** Single-key `execute` payloads that must pass through to the client (tool rounds). */
export const DIALOG_TOOL_EXECUTE_KEYS = [
    'rag-search',
    'read-file',
    'write-file',
    'execute-command',
    'list-directory',
    'grep-search',
    'script',
];
/** True when `execute` is a single allowed dialog tool key (tool round, not form/chat). */
export function isDialogToolExecutePayload(execute) {
    if (!execute || typeof execute !== 'object' || Array.isArray(execute)) {
        return false;
    }
    const keys = Object.keys(execute);
    if (keys.length !== 1) {
        return false;
    }
    return DIALOG_TOOL_EXECUTE_KEYS.includes(keys[0]);
}
/**
 * Merge transform `context` with handler output for gray-room finalize (`continueLoop: false`).
 * Handlers update `nextCtx.context` (workbench.slots, files, compressed history); using only
 * `rawOutput.context` would drop those updates.
 */
export function mergeGrayRoomFinalizeInnerContext(rawInner, nextCtx) {
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
    let workbenchMerged;
    if (rwb && typeof rwb === 'object' && !Array.isArray(rwb) && nwb && typeof nwb === 'object' && !Array.isArray(nwb)) {
        const ra = rwb;
        const nb = nwb;
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
                        ...(typeof rs === 'object' && rs && !Array.isArray(rs) ? rs : {}),
                        ...(typeof ns === 'object' && ns && !Array.isArray(ns) ? ns : {}),
                    },
                }
                : {}),
            ...(rsl || nsl
                ? {
                    slots: {
                        ...(typeof rsl === 'object' && rsl && !Array.isArray(rsl) ? rsl : {}),
                        ...(typeof nsl === 'object' && nsl && !Array.isArray(nsl) ? nsl : {}),
                    },
                }
                : {}),
        };
    }
    else if (nwb && typeof nwb === 'object' && !Array.isArray(nwb)) {
        workbenchMerged = nwb;
    }
    else if (rwb && typeof rwb === 'object' && !Array.isArray(rwb)) {
        workbenchMerged = rwb;
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
        ...(workbenchMerged !== undefined ? { workbench: workbenchMerged } : {}),
        ...(historyMerged !== undefined ? { history: historyMerged } : {}),
        ...(nextInner.files && typeof nextInner.files === 'object' && !Array.isArray(nextInner.files)
            ? { files: nextInner.files }
            : {}),
    };
}
/** Immutably set `context.workbench.slots[slotKey]` on a shallow-copied root context. */
export function mergeSlotIntoWorkbenchContext(ctx, slotKey, slotValue) {
    const root = { ...ctx };
    const innerCtx = root.context ?? {};
    const wb = innerCtx.workbench ?? {};
    const slots = wb.slots ?? {};
    return {
        ...root,
        context: {
            ...innerCtx,
            workbench: { ...wb, slots: { ...slots, [slotKey]: slotValue } },
        },
    };
}
//# sourceMappingURL=gray-room-utils.js.map