/** Default AI Integration hub base (see AGENTS.md / docs — port 11434). */
export const DEFAULT_AI_HUB_URL = 'http://localhost:11434';

/** Trim and remove a single trailing slash from an HTTP(S) origin or base path. */
export function normalizeHttpBaseUrl(raw: string): string {
    return String(raw).trim().replace(/\/$/, '');
}

/**
 * Non-empty `override` wins; else `process.env[envKey]`; else `fallback`.
 * Result is {@link normalizeHttpBaseUrl normalized}.
 */
export function resolveEnvOrDefaultBaseUrl(
    override: string | null | undefined,
    envKey: string,
    fallback: string
): string {
    const raw =
        override != null && String(override).trim() !== ''
            ? String(override).trim()
            : String(process.env[envKey] ?? fallback).trim();
    return normalizeHttpBaseUrl(raw);
}

/**
 * Normalized hub base URL (no trailing slash).
 * Uses `override` when non-empty; otherwise `AI_HUB_URL`, then {@link DEFAULT_AI_HUB_URL}.
 */
export function resolveAiHubBaseUrl(override?: string | null): string {
    return resolveEnvOrDefaultBaseUrl(override, 'AI_HUB_URL', DEFAULT_AI_HUB_URL);
}

/** Prefer non-empty `override`, then `process.env[moduleEnvKey]`, then global {@link resolveAiHubBaseUrl}. */
export function resolveAiHubBaseUrlWithModuleEnv(
    override: string | null | undefined,
    moduleEnvKey: string
): string {
    if (override != null && String(override).trim() !== '') {
        return resolveAiHubBaseUrl(override);
    }
    const mod = process.env[moduleEnvKey];
    if (mod != null && String(mod).trim() !== '') {
        return resolveAiHubBaseUrl(mod);
    }
    return resolveAiHubBaseUrl();
}
