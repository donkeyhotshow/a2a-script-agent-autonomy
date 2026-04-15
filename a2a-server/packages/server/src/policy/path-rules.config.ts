/**
 * Path-Level Permission Rules — glob-based file path protection.
 * Портировано из паттерна OpenHarness permissions/checker.py.
 *
 * Правила применяются в execute-security.service.ts для блокировки
 * записи в критические пути файловой системы.
 */

import {logger} from '@a2a/server-utils/logger';

export interface PathRule {
    /** Glob-style pattern. Supports ** and *. */
    pattern: string;
    /** true = allow, false = deny */
    allow: boolean;
    /** Human-readable reason shown in error/log */
    reason?: string;
}

/** Default deny-list rules for sensitive paths. */
export const defaultPathRules: PathRule[] = [
    // Secret / credential files
    {pattern: '**/.env',              allow: false, reason: 'Environment secrets file'},
    {pattern: '**/.env.*',            allow: false, reason: 'Environment secrets file'},
    {pattern: '**/secrets/**',        allow: false, reason: 'Secrets directory'},
    {pattern: '**/*.pem',             allow: false, reason: 'Private key / certificate'},
    {pattern: '**/*.key',             allow: false, reason: 'Private key file'},
    {pattern: '**/credentials.json',  allow: false, reason: 'Credentials file'},
    {pattern: '**/.credentials.json', allow: false, reason: 'Credentials file'},

    // Package / build artifacts
    {pattern: '**/node_modules/**',   allow: false, reason: 'Package files — use npm to manage'},
    {pattern: '**/dist/**',           allow: false, reason: 'Build output — regenerated automatically'},
    {pattern: '**/.next/**',          allow: false, reason: 'Next.js build output'},

    // Git internals
    {pattern: '**/.git/**',           allow: false, reason: 'Git internal files'},
    {pattern: '**/.git/config',       allow: false, reason: 'Git config'},

    // System paths
    {pattern: '/etc/**',              allow: false, reason: 'System configuration'},
    {pattern: '/usr/**',              allow: false, reason: 'System files'},
    {pattern: '/bin/**',              allow: false, reason: 'System binaries'},
    {pattern: '/sbin/**',             allow: false, reason: 'System binaries'},
    {pattern: 'C:/Windows/**',        allow: false, reason: 'Windows system files'},
];

/** Normalize a path for consistent matching (forward slashes, lowercase on Windows). */
function normalizePath(filePath: string): string {
    return filePath.replace(/\\/g, '/');
}

/** Check whether a pattern (glob) matches a file path. */
function matchGlob(filePath: string, pattern: string): boolean {
    const normalPath = normalizePath(filePath);
    const normalPattern = normalizePath(pattern);

    // Direct match
    if (normalPath === normalPattern) return true;

    // Convert glob to regex
    const regexStr = normalPattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&') // escape regex special chars (except * ?)
        .replace(/\\\*\\\*/g, '§DOUBLE§')       // protect **
        .replace(/\*/g, '[^/]*')                // * → match any segment chars
        .replace(/§DOUBLE§/g, '.*')             // ** → match anything including /
        .replace(/\?/g, '[^/]');                // ? → match single non-separator char

    const re = new RegExp(`^${regexStr}$`, 'i');
    return re.test(normalPath);
}

export interface PathRuleDecision {
    allowed: boolean;
    reason: string;
    matchedPattern?: string;
}

/**
 * Evaluate a file path against a list of path rules.
 * Rules are evaluated in order; first match wins.
 *
 * @param filePath - Absolute or relative file path
 * @param rules - List of rules to evaluate (defaults to defaultPathRules)
 * @returns Decision with allowed flag and reason
 */
export function evaluatePathRules(
    filePath: string,
    rules: PathRule[] = defaultPathRules,
): PathRuleDecision {
    for (const rule of rules) {
        if (matchGlob(filePath, rule.pattern)) {
            const result: PathRuleDecision = {
                allowed: rule.allow,
                reason: rule.reason ?? (rule.allow ? 'Explicitly allowed' : 'Path matches deny rule'),
                matchedPattern: rule.pattern,
            };
            if (!rule.allow) {
                logger.warn('[PathRules] Write blocked by path rule', {
                    filePath,
                    pattern: rule.pattern,
                    reason: result.reason,
                });
            }
            return result;
        }
    }
    // No rule matched — allow by default
    return {allowed: true, reason: 'No matching path rules'};
}
