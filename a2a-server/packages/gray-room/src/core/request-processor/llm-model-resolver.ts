/** Fallback LLM model for gray room */
export function grayRoomLlmModelFallback(): string {
  return process.env['A2A_GRAY_ROOM_MODEL'] ?? process.env['A2A_LLM_MODEL'] ?? 'llama3';
}

/** Resolve LLM model from context with fallback */
export function resolveGrayRoomLlmModelFromContext(
  ctx: Record<string, unknown>,
  fallback: string
): string {
  const model = ctx['model'];
  if (typeof model === 'string' && model.trim()) return model.trim();
  return fallback;
}
