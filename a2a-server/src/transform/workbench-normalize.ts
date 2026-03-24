/**
 * `context.workbench` — structured working state for multi-step / batched flows.
 * If a payload still carries `context.docVirtual`, fold it into `workbench.sections` once and **remove** `docVirtual`.
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

function sectionsFromRemovedDocVirtualField(dv: unknown): Record<string, string> | undefined {
  if (dv === undefined || dv === null) return undefined;
  if (typeof dv === 'string') {
    const t = dv.trim();
    return t.length === 0 ? undefined : { body: dv };
  }
  if (typeof dv === 'object' && !Array.isArray(dv)) {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(dv as Record<string, unknown>)) {
      out[k] = typeof v === 'string' ? v : JSON.stringify(v);
    }
    return Object.keys(out).length ? out : undefined;
  }
  return { value: String(dv) };
}

/**
 * Mutates invoke-shaped payload before markdown render: canonical `context.workbench`, root `workbench` for `${workbench}`.
 * Removes `context.docVirtual` after folding (no duplicate field).
 */
export function attachWorkbenchForLlmPrompt(root: Record<string, unknown>): void {
  const ctxRaw = root['context'];
  if (!ctxRaw || typeof ctxRaw !== 'object' || Array.isArray(ctxRaw)) {
    root['workbench'] = null;
    return;
  }
  const ctx = ctxRaw as Record<string, unknown>;
  const legacy = ctx['docVirtual'];

  const wb: WorkbenchState =
    ctx['workbench'] && typeof ctx['workbench'] === 'object' && !Array.isArray(ctx['workbench'])
      ? { ...(ctx['workbench'] as WorkbenchState) }
      : {};

  if (wb.sections === undefined && legacy !== undefined && legacy !== null) {
    const s = sectionsFromRemovedDocVirtualField(legacy);
    if (s) wb.sections = s;
  }

  if ('docVirtual' in ctx) {
    delete ctx['docVirtual'];
  }

  if (Object.keys(wb).length > 0) {
    ctx['workbench'] = wb;
    root['workbench'] = wb;
  } else {
    delete ctx['workbench'];
    root['workbench'] = null;
  }
}
