/**
 * Resolve LLM model id for AI Hub / Ollama proxy from invoke context.
 * Canonical context key: `llmModel` (string). Env fallbacks match dialog / gray-room defaults.
 */

const ENV_MODEL =
    process.env.LLM_MODEL || process.env.Z_AI_MODEL || process.env.OLLAMA_MODEL || 'qwen3:8b';

export function resolveLlmModelFromContext(
    ctx: Record<string, unknown> | undefined,
    fallback: string = ENV_MODEL
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
