/**
 * Router / POST /next submit parsing (shared: Vite + SDK).
 */

import { validateClientResultPayload } from './client-api-envelope.mjs';

/**
 * Same choice detection as session-view-model / stage machine: `form.choices` or `meta.routerChoices`.
 * @param {object|null|undefined} prevStepData - step record with execute + context
 */
export function routerFormHasChoices(prevStepData) {
    const form = prevStepData?.execute?.form;
    if (!form || typeof form !== 'object' || Array.isArray(form)) return false;
    const raw = form.choices ?? form.meta?.routerChoices;
    return Array.isArray(raw) && raw.length > 0;
}

function routerChoiceIdSet(prevStepData) {
    const form = prevStepData?.execute?.form;
    if (!form || typeof form !== 'object' || Array.isArray(form)) return new Set();
    const raw = form.choices ?? form.meta?.routerChoices;
    if (!Array.isArray(raw)) return new Set();
    const ids = new Set();
    for (const c of raw) {
        if (c && typeof c === 'object' && typeof c.id === 'string' && c.id.trim()) ids.add(c.id.trim());
    }
    return ids;
}

/**
 * If previous step was router but `task` was sent as free text, coerce to `choice` when it matches a button id.
 */
export function normalizeRouterStepSubmit(submitResult, prevStepData) {
    if (!submitResult || typeof submitResult !== 'object') return submitResult;
    const step = prevStepData?.context?.execution?.step;
    if (step !== 'router') return submitResult;
    const ids = routerChoiceIdSet(prevStepData);
    if (typeof submitResult.choice === 'string' && submitResult.choice.trim()) {
        const rawChoice = submitResult.choice.trim();
        if (ids.has(rawChoice)) return submitResult;
        const lc = rawChoice.toLowerCase();
        if (lc === 'диалог' || lc === 'dialog' || lc === 'dialogue') {
            return { choice: 'dialog' };
        }
        if (lc === 'агент' || lc === 'agent') {
            return { choice: 'agent' };
        }
        if (lc === 'декомпозиция' || lc === 'декомпозиція' || lc === 'task-decomposition') {
            return { choice: 'task-decomposition' };
        }
        return submitResult;
    }
    const msg = submitResult.message ?? prevStepData?.context?.task;
    if (typeof msg !== 'string' || !msg.trim()) return submitResult;
    const t = msg.trim();
    if (ids.has(t)) return { choice: t };
    const lcMsg = t.toLowerCase();
    if (lcMsg === 'диалог' || lcMsg === 'dialog' || lcMsg === 'dialogue') {
        return { choice: 'dialog' };
    }
    if (lcMsg === 'агент' || lcMsg === 'agent') {
        return { choice: 'agent' };
    }
    if (lcMsg === 'декомпозиция' || lcMsg === 'декомпозиція' || lcMsg === 'task-decomposition') {
        return { choice: 'task-decomposition' };
    }
    return submitResult;
}

export function buildSubmitResult({ body, hasChoices }) {
    const { result, task } = body || {};
    if (result) return result;
    if (!task) return undefined;
    return { [hasChoices ? 'choice' : 'message']: task };
}

export function validateSubmitResult(submitResult) {
    const submitResultError = validateClientResultPayload(submitResult);
    if (submitResultError) {
        return submitResultError;
    }
    return null;
}
