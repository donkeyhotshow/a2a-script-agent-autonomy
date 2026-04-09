/**
 * Session view-model adapter.
 *
 * Input: web-facing payload (simulations `received.tson`, GET /sessions response).
 * Output: normalized UI state kind:
 * - choice-form
 * - input-form
 * - message+form
 * - message-only
 * - completed
 */

function messageBodyText(message) {
    if (message == null) return '';
    if (typeof message === 'string') return message;
    if (typeof message === 'object') {
        return (
            message.content ||
            message.text ||
            ''
        );
    }
    return String(message);
}

/**
 * Build normalized view model from a web session payload.
 *
 * @param {Object|null} payload - received.tson shape: may contain top-level `execute` or nested `session.execute`.
 */
export function buildSessionViewModel(payload) {
    if (!payload || typeof payload !== 'object') {
        return {
            kind: 'completed',
            execute: null,
            context: null,
            result: null,
            completed: true,
        };
    }

    const execute = payload.execute || payload.session?.execute || null;
    const context = payload.context || payload.session?.context || null;
    const result = payload.result || null;

    const form = execute && typeof execute.form === 'object' ? execute.form : null;
    const hasForm = !!form;
    const rawChoices = form?.choices ?? form?.meta?.routerChoices;
    const hasChoices = Array.isArray(rawChoices) && rawChoices.length > 0;
    const hasTextarea = !!(form && form.textarea && typeof form.textarea === 'object');
    const hasInputs = !!(form && (Array.isArray(form.input) || Array.isArray(form.inputs)));
    const isInputForm = hasTextarea || hasInputs;

    const mainText = messageBodyText(execute?.message);
    const llmText = messageBodyText(execute?.llmMessage);
    const hasMain = !!mainText && mainText.trim().length > 0;
    const hasLlm = !!llmText && llmText.trim().length > 0;
    const hasMessage = hasMain || hasLlm;

    const execution = context?.execution;
    const protocolCompleted =
        execution?.status === 'completed' ||
        execute?.completed === true ||
        (result && typeof result === 'object' && result.completed === true);

    let kind = 'message-only';

    if (hasChoices) {
        // Router / decision step: always primary choice form.
        kind = 'choice-form';
    } else if (isInputForm && hasMessage) {
        // Dialog: model message plus follow-up inputs.
        kind = 'message+form';
    } else if (isInputForm) {
        // Pure input form (no model text).
        kind = 'input-form';
    } else if (hasMessage) {
        // Message-only response (no form).
        kind = 'message-only';
    } else if (protocolCompleted || !hasForm) {
        // No visible inputs or messages and protocol marks completion.
        kind = 'completed';
    }

    return {
        kind,
        execute,
        context,
        result,
        completed: protocolCompleted || kind === 'completed',
        form,
        message: {
            mainText,
            llmText,
        },
    };
}

export function isCompletedViewModel(view) {
    if (!view || typeof view !== 'object') return false;
    if (view.completed === true) return true;
    return view.kind === 'completed';
}

