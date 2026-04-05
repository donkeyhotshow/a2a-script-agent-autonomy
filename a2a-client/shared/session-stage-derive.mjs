/**
 * Coarse UI stage from execute + context.execution + async flags (shared: Vite + SDK).
 */

/**
 * @param {Object} params
 * @param {Object|null} params.execute
 * @param {Object|null} params.context
 * @param {boolean} params.asyncPending
 * @param {string|null|undefined} params.status
 * @returns {'routing'|'dialog-input'|'agent-tool-loop'|'awaiting-async'|'completed'}
 */
export function deriveSessionStage(params) {
    const execute = params?.execute || null;
    const context = params?.context || null;
    const asyncPending = !!params?.asyncPending;
    const status = params?.status || null;

    if (status === 'completed' || status === 'done') {
        return 'completed';
    }

    const execState = context && context.execution ? context.execution : null;
    const action = execState && typeof execState.action === 'string' ? execState.action : null;
    const step = execState && typeof execState.step === 'string' ? execState.step : null;

    if (asyncPending) {
        return 'awaiting-async';
    }

    const form = execute && typeof execute === 'object' ? execute.form : null;
    const hasForm = !!form;
    const rawChoices =
        form && typeof form === 'object' && !Array.isArray(form)
            ? form.choices ?? form.meta?.routerChoices
            : null;
    const hasChoices = Array.isArray(rawChoices) && rawChoices.length > 0;

    if (hasChoices || action === 'router' || step === 'routing' || step === 'router') {
        return 'routing';
    }

    const hasTextInputs =
        hasForm &&
        ((Array.isArray(form.input) && form.input.length > 0) ||
            (Array.isArray(form.inputs) && form.inputs.length > 0) ||
            !!(form.textarea && typeof form.textarea === 'object' && form.textarea.name));
    if (action === 'agent' && hasTextInputs) {
        return 'dialog-input';
    }

    if (action === 'agent') {
        return 'agent-tool-loop';
    }

    if (hasForm || action === 'dialog' || step === 'dialog') {
        return 'dialog-input';
    }

    return 'dialog-input';
}
