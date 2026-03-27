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
    const hasChoices = !!(form && Array.isArray(form.choices) && form.choices.length > 0);

    // Router stage: explicit routing form with choices.
    if (hasChoices || action === 'router' || step === 'routing') {
        return 'routing';
    }

    // Agent tool loop: agent action without async pending.
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

