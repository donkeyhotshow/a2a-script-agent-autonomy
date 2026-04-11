"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_AI_HUB_URL = void 0;
exports.normalizeHttpBaseUrl = normalizeHttpBaseUrl;
exports.resolveEnvOrDefaultBaseUrl = resolveEnvOrDefaultBaseUrl;
exports.resolveAiHubBaseUrl = resolveAiHubBaseUrl;
exports.resolveAiHubBaseUrlWithModuleEnv = resolveAiHubBaseUrlWithModuleEnv;
/** Default AI Integration hub base (see AGENTS.md / docs — port 11434). */
exports.DEFAULT_AI_HUB_URL = 'http://localhost:11434';
/** Trim and remove a single trailing slash from an HTTP(S) origin or base path. */
function normalizeHttpBaseUrl(raw) {
    return String(raw).trim().replace(/\/$/, '');
}
/**
 * Non-empty `override` wins; else `process.env[envKey]`; else `fallback`.
 * Result is {@link normalizeHttpBaseUrl normalized}.
 */
function resolveEnvOrDefaultBaseUrl(override, envKey, fallback) {
    var _a;
    var raw = override != null && String(override).trim() !== ''
        ? String(override).trim()
        : String((_a = process.env[envKey]) !== null && _a !== void 0 ? _a : fallback).trim();
    return normalizeHttpBaseUrl(raw);
}
/**
 * Normalized hub base URL (no trailing slash).
 * Uses `override` when non-empty; otherwise `AI_HUB_URL`, then {@link DEFAULT_AI_HUB_URL}.
 */
function resolveAiHubBaseUrl(override) {
    return resolveEnvOrDefaultBaseUrl(override, 'AI_HUB_URL', exports.DEFAULT_AI_HUB_URL);
}
/** Prefer non-empty `override`, then `process.env[moduleEnvKey]`, then global {@link resolveAiHubBaseUrl}. */
function resolveAiHubBaseUrlWithModuleEnv(override, moduleEnvKey) {
    if (override != null && String(override).trim() !== '') {
        return resolveAiHubBaseUrl(override);
    }
    var mod = process.env[moduleEnvKey];
    if (mod != null && String(mod).trim() !== '') {
        return resolveAiHubBaseUrl(mod);
    }
    return resolveAiHubBaseUrl();
}
