/** Default AI Integration hub base (see AGENTS.md / docs — port 11434). */
export declare const DEFAULT_AI_HUB_URL = "http://localhost:11434";
/** Trim and remove a single trailing slash from an HTTP(S) origin or base path. */
export declare function normalizeHttpBaseUrl(raw: string): string;
/**
 * Non-empty `override` wins; else `process.env[envKey]`; else `fallback`.
 * Result is {@link normalizeHttpBaseUrl normalized}.
 */
export declare function resolveEnvOrDefaultBaseUrl(override: string | null | undefined, envKey: string, fallback: string): string;
/**
 * Normalized hub base URL (no trailing slash).
 * Uses `override` when non-empty; otherwise `AI_HUB_URL`, then {@link DEFAULT_AI_HUB_URL}.
 */
export declare function resolveAiHubBaseUrl(override?: string | null): string;
/** Prefer non-empty `override`, then `process.env[moduleEnvKey]`, then global {@link resolveAiHubBaseUrl}. */
export declare function resolveAiHubBaseUrlWithModuleEnv(override: string | null | undefined, moduleEnvKey: string): string;
//# sourceMappingURL=ai-hub-url.d.ts.map