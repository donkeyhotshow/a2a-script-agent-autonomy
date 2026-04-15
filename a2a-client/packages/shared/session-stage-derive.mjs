import { routerFormHasChoices } from './router-submit.js';

/**
 * Derive UI/session stage for Client API projection (Vite + SDK parity).
 * @param {Record<string, unknown>|null|undefined} params
 * @returns {string|null}
 */
export function deriveSessionStage(params) {
  if (params == null || typeof params !== 'object') return 'dialog-input';

  const { execute, context, asyncPending, status } = params;

  if (status === 'completed' || status === 'done') return 'completed';
  if (asyncPending === true) return 'awaiting-async';

  const exec =
    execute && typeof execute === 'object' && !Array.isArray(execute) ? execute : null;
  const ctxExec =
    context &&
    typeof context === 'object' &&
    context.execution &&
    typeof context.execution === 'object' &&
    !Array.isArray(context.execution)
      ? context.execution
      : null;

  const stepData = { execute: exec, context };

  if (routerFormHasChoices(stepData)) return 'routing';
  if (ctxExec?.action === 'router' || ctxExec?.step === 'routing') return 'routing';

  if (ctxExec?.action === 'agent') {
    const form = exec?.form;
    if (form && typeof form === 'object' && !Array.isArray(form)) {
      if (Array.isArray(form.input) && form.input.length > 0) return 'dialog-input';
      if (form.textarea && typeof form.textarea === 'object') return 'dialog-input';
    }
    return 'agent-tool-loop';
  }

  if (ctxExec?.action === 'dialog' || ctxExec?.step === 'dialog') return 'dialog-input';

  if (exec) {
    const form = exec.form;
    if (form && typeof form === 'object' && !Array.isArray(form)) {
      if (Array.isArray(form.input) && form.input.length > 0) return 'dialog-input';
      if (form.textarea && typeof form.textarea === 'object') return 'dialog-input';
    }
    if (typeof exec.message === 'string') return 'dialog-input';
  }

  return 'dialog-input';
}
