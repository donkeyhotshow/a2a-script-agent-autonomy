/**
 * Dialog-mode invoke history tweaks (shared: Vite step routes + SDK /next pipeline).
 */

function historyEntryUserText(entry) {
    if (!entry || typeof entry !== 'object') return '';
    if (typeof entry.message === 'string') return entry.message;
    if (typeof entry.content === 'string') return entry.content;
    return '';
}

/**
 * Server may echo the session task into context.history when entering dialog; that line belongs in
 * `context.task` only, not in dialog history. Strip user rows matching `context.task` before the first
 * assistant entry (prefix only — repeats after assistant are kept).
 */
export function stripSpuriousTaskEchoFromDialogHistory(mergedContext) {
    if (!mergedContext || typeof mergedContext !== 'object') return;
    const task = mergedContext.task;
    if (!task || typeof task !== 'string') return;
    const exec = mergedContext.execution;
    if (!exec || exec.action !== 'dialog') return;
    const h = mergedContext.history;
    if (!Array.isArray(h) || h.length === 0) return;
    const firstAssistantIdx = h.findIndex((e) => e && e.role === 'assistant');
    const end = firstAssistantIdx === -1 ? h.length : firstAssistantIdx;
    const head = h.slice(0, end);
    const tail = h.slice(end);
    const filteredHead = head.filter(
        (e) => !(e && e.role === 'user' && historyEntryUserText(e) === task)
    );
    if (filteredHead.length !== head.length) {
        mergedContext.history = [...filteredHead, ...tail];
    }
}

/** Dialog invoke: align context.history with this user line (server history often ends with assistant). */
export function mergeDialogHistoryForInvoke(mergedContext, effectiveTask) {
    if (!mergedContext || typeof mergedContext !== 'object') return;
    if (!effectiveTask || typeof effectiveTask !== 'string') return;
    const h = Array.isArray(mergedContext.history) ? mergedContext.history.slice() : [];
    const last = h[h.length - 1];
    if (!last || last.role === 'assistant') {
        h.push({ role: 'user', message: effectiveTask });
        mergedContext.history = h;
        return;
    }
    if (last.role === 'user' && historyEntryUserText(last) !== effectiveTask) {
        h.push({ role: 'user', message: effectiveTask });
        mergedContext.history = h;
    }
}
