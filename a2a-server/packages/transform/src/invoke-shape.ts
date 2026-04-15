/**
 * Flat server context → invoke-shaped payload for prompts transform.
 * When `context` is already nested, returns `ctx` unchanged.
 *
 * Owned by `@a2a/server-transform` to avoid depending on server-core internals.
 */
export function toInvokeShapeForPromptsTransform(ctx: Record<string, unknown>): Record<string, unknown> {
  if (!ctx || typeof ctx !== 'object' || Array.isArray(ctx)) {
    return { context: {}, task: undefined, message: undefined, result: {} };
  }
  const inner = ctx['context'];
  const hasUsableNestedContext = inner != null && typeof inner === 'object' && !Array.isArray(inner);
  if (hasUsableNestedContext) {
    return ctx;
  }
  const { context: _ignoredContext, ...rest } = ctx;
  return {
    context: rest,
    task: (rest['task'] as string | undefined) ?? (rest['message'] as string | undefined),
    message: rest['message'],
    result: (rest['result'] as Record<string, unknown> | undefined) ?? {},
  };
}

