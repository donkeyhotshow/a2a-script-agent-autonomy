/**
 * Resolve LLM model id for AI Hub / Ollama proxy from invoke context.
 * Canonical context key: `llmModel` (string). Main dialog default: glm-4.7-flash (env overrides).
 */

const MAIN_ENV_MODEL =
    process.env.LLM_MODEL || process.env.Z_AI_MODEL || process.env.OLLAMA_MODEL || 'glm-4.7-flash';

/** Gray room sub-calls: separate from main LLM (`A2A_GRAY_ROOM_LLM_MODEL` / `GRAY_ROOM_LLM_MODEL`). */
export function grayRoomLlmModelFallback(): string {
    return (
        process.env.A2A_GRAY_ROOM_LLM_MODEL ||
        process.env.GRAY_ROOM_LLM_MODEL ||
        'qwen3:8b'
    );
}

export function resolveLlmModelFromContext(
    ctx: Record<string, unknown> | undefined,
    fallback: string = MAIN_ENV_MODEL
): string {
    if (!ctx) {
        return fallback;
    }
    const lm = ctx['llmModel'];
    if (typeof lm === 'string' && lm.trim().length > 0) {
        return lm.trim();
    }
    return fallback;
}

/**
 * Model for gray-room interrupt-chain LLM calls only. Uses `grayRoomLlmModel` on context, not `llmModel`.
 */
export function resolveGrayRoomLlmModelFromContext(
    ctx: Record<string, unknown> | undefined,
    fallback: string = grayRoomLlmModelFallback()
): string {
    if (!ctx) {
        return fallback;
    }
    const gm = ctx['grayRoomLlmModel'];
    if (typeof gm === 'string' && gm.trim().length > 0) {
        return gm.trim();
    }
    return fallback;
}
