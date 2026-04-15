/** Resolve execution block from context */
export function resolveExecution(ctx: Record<string, unknown>): Record<string, unknown> | undefined {
  const exec = ctx['execution'];
  if (exec && typeof exec === 'object' && !Array.isArray(exec)) {
    return exec as Record<string, unknown>;
  }
  return undefined;
}

/** Resolve history length from context */
export function resolveHistoryLength(ctx: Record<string, unknown>): number {
  const history = ctx['history'];
  if (Array.isArray(history)) return history.length;
  return 0;
}

/** Convert context to invoke shape for prompts transform */
export function toInvokeShapeForPromptsTransform(ctx: Record<string, unknown>): Record<string, unknown> {
  return ctx;
}
