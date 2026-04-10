/**
 * `context.workbench` — structured working state for multi-step / batched flows.
 */

export type WorkbenchState = {
  sections?: Record<string, string>;
  batch?: {
    items?: unknown[];
    cursor?: number;
    label?: string;
  };
  slots?: Record<string, unknown>;
};

/**
 * Mutates invoke-shaped payload before markdown render: canonical `context.workbench`, root `workbench` for `${workbench}`.
 */
export function attachWorkbenchForLlmPrompt(root: Record<string, unknown>): void {
  const ctxRaw = root['context'];
  if (!ctxRaw || typeof ctxRaw !== 'object' || Array.isArray(ctxRaw)) {
    root['workbench'] = null;
    return;
  }
  const ctx = ctxRaw as Record<string, unknown>;

  const wb: WorkbenchState =
    ctx['workbench'] && typeof ctx['workbench'] === 'object' && !Array.isArray(ctx['workbench'])
      ? { ...(ctx['workbench'] as WorkbenchState) }
      : {};

  if (Object.keys(wb).length > 0) {
    ctx['workbench'] = wb;
    root['workbench'] = wb;
  } else {
    delete ctx['workbench'];
    root['workbench'] = null;
  }
}
