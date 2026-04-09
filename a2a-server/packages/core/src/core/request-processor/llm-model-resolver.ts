/**
 * Resolve LLM model id for AI Hub from invoke context.
 * Canonical context key: `llmModel` (string).
 *
 * Order: `LLM_MODEL`, then `Z_AI_MODEL`, else default GLM id (hub `providers.json` still decides routing).
 */

const DEFAULT_MAIN_DIALOG_MODEL = 'glm-4.7-flash';

/** Resolved once at module load (same pattern as prior MAIN_ENV_MODEL). */
export function resolveMainDialogLlmModelFromEnv(): string {
    const llm = process.env.LLM_MODEL?.trim();
    if (llm) return llm;
    const z = process.env.Z_AI_MODEL?.trim();
    if (z) return z;
    return DEFAULT_MAIN_DIALOG_MODEL;
}

const MAIN_ENV_MODEL = resolveMainDialogLlmModelFromEnv();

/** Gray room sub-calls: separate from main LLM (`A2A_GRAY_ROOM_LLM_MODEL` / `GRAY_ROOM_LLM_MODEL`). */
export function grayRoomLlmModelFallback(): string {
    return (
        process.env.A2A_GRAY_ROOM_LLM_MODEL ||
        process.env.GRAY_ROOM_LLM_MODEL ||
        DEFAULT_MAIN_DIALOG_MODEL
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
