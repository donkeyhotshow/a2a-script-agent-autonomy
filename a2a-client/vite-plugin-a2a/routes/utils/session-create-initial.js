/**
 * Initial context.execution from Client API POST body (create session, task-add, task-execute).
 * Manual / operator flow: set mode or execution so the session starts as agent (or dialog, etc.).
 *
 * @param {Record<string, unknown>} d - Parsed JSON body
 * @returns {{ action: string, step: string }}
 */
export function pickInitialExecution(d) {
    if (!d || typeof d !== 'object') {
        return { action: 'task', step: 'new' };
    }
    const ex = d.execution;
    if (ex && typeof ex === 'object' && typeof ex.action === 'string' && ex.action.trim()) {
        const action = ex.action.trim();
        const step = typeof ex.step === 'string' && ex.step.trim() ? ex.step.trim() : 'new';
        return { action, step };
    }
    const mode = typeof d.mode === 'string' ? d.mode.trim().toLowerCase() : '';
    if (mode === 'agent' || mode === 'dialog' || mode === 'task-decomposition') {
        return { action: mode, step: 'new' };
    }
    return { action: 'task', step: 'new' };
}
