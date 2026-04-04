/**
 * Session stage state machine.
 * Derives coarse-grained UI stage from execute + context.execution + async flags.
 *
 * Stages:
 * - routing
 * - dialog-input
 * - agent-tool-loop
 * - awaiting-async
 * - completed
 */

/**
 * @param {Object} params
 * @param {Object|null} params.execute - Projected execute DTO (web-safe)
 * @param {Object|null} params.context - Canonical context object (may be undefined/null in public DTO)
 * @param {boolean} params.asyncPending - Whether there is in-flight async work
 * @param {string|null|undefined} params.status - High-level session status
 * @returns {'routing'|'dialog-input'|'agent-tool-loop'|'awaiting-async'|'completed'}
 */
export function deriveSessionStage(params) {
    const execute = params?.execute || null;
    const context = params?.context || null;
    const asyncPending = !!params?.asyncPending;
    const status = params?.status || null;

    // Completed has highest precedence.
    if (status === 'completed' || status === 'done') {
        return 'completed';
    }

    const execState = context && context.execution ? context.execution : null;
    const action = execState && typeof execState.action === 'string' ? execState.action : null;
    const step = execState && typeof execState.step === 'string' ? execState.step : null;

    // Awaiting async: promise in flight for this session.
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

    // Router stage: choices, or server task/router step (step id is `router`, not `routing`).
    if (hasChoices || action === 'router' || step === 'routing' || step === 'router') {
        return 'routing';
    }

    // Agent pipeline asking for human text (task field, etc.): dialog beat, not tool loop.
    const hasTextInputs =
        hasForm &&
        ((Array.isArray(form.input) && form.input.length > 0) ||
            (Array.isArray(form.inputs) && form.inputs.length > 0) ||
            !!(form.textarea && typeof form.textarea === 'object' && form.textarea.name));
    if (action === 'agent' && hasTextInputs) {
        return 'dialog-input';
    }

    // Agent tool loop: agent action without async pending and without dialog-style form.
    if (action === 'agent') {
        return 'agent-tool-loop';
    }

    // Dialog input: general form-based interaction or dialog action.
    if (hasForm || action === 'dialog' || step === 'dialog') {
        return 'dialog-input';
    }

    // Fallback: treat as dialog-input until a better signal is available.
    return 'dialog-input';
}

