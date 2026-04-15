/**
 * Security Guidance Hook — PreToolUse guard for dangerous file operations.
 * Вдохновлён OpenHarness plugin `security-guidance` hook pattern.
 *
 * Блокирует запись в критические пути и предупреждает об опасных командах.
 * Автоматически регистрируется при импорте модуля.
 */

import {globalToolHookRegistry} from '../tool-hook-registry.js';
import {evaluatePathRules, defaultPathRules} from '../../policy/path-rules.config.js';
import {logger} from '@a2a/server-utils/logger';

/** Dangerous shell command patterns to warn about. */
const DANGEROUS_COMMAND_PATTERNS: Array<{pattern: RegExp; reason: string}> = [
    {pattern: /rm\s+-rf?\s+\/(?!\w)/i,   reason: 'Recursive delete of root filesystem'},
    {pattern: /rm\s+-rf?\s+~\//i,        reason: 'Recursive delete of home directory'},
    {pattern: />\s*\/dev\/sda/i,          reason: 'Direct disk write — data destruction'},
    {pattern: /mkfs\./i,                  reason: 'Filesystem format command'},
    {pattern: /DROP\s+TABLE/i,            reason: 'Destructive SQL — DROP TABLE'},
    {pattern: /DROP\s+DATABASE/i,         reason: 'Destructive SQL — DROP DATABASE'},
    {pattern: /TRUNCATE\s+TABLE/i,        reason: 'Destructive SQL — TRUNCATE TABLE'},
];

function extractFilePath(input: unknown): string | undefined {
    if (!input || typeof input !== 'object') return undefined;
    const obj = input as Record<string, unknown>;
    const candidate = obj['path'] ?? obj['file_path'] ?? obj['filePath'] ?? obj['target'];
    return typeof candidate === 'string' ? candidate : undefined;
}

function extractCommand(input: unknown): string | undefined {
    if (!input || typeof input !== 'object') return undefined;
    const obj = input as Record<string, unknown>;
    const candidate = obj['command'] ?? obj['cmd'] ?? obj['script'];
    return typeof candidate === 'string' ? candidate : undefined;
}

/** Register security-guidance pre-tool-use hooks. */
export function registerSecurityGuidanceHooks(): void {
    // --- Hook 1: Path protection for write operations ---
    globalToolHookRegistry.register({
        phase: 'pre',
        toolNamePattern: 'write-file',
        name: 'security-guidance:write-file-path-check',
        async handler(_toolName, input) {
            const filePath = extractFilePath(input);
            if (!filePath) return {blocked: false};

            const decision = evaluatePathRules(filePath, defaultPathRules);
            if (!decision.allowed) {
                return {
                    blocked: true,
                    reason: `[SecurityGuidance] Write blocked: ${decision.reason} (path: ${filePath})`,
                    metadata: {filePath, matchedPattern: decision.matchedPattern},
                };
            }
            return {blocked: false};
        },
    });

    // --- Hook 2: Path protection for edit operations ---
    globalToolHookRegistry.register({
        phase: 'pre',
        toolNamePattern: 'edit-file',
        name: 'security-guidance:edit-file-path-check',
        async handler(_toolName, input) {
            const filePath = extractFilePath(input);
            if (!filePath) return {blocked: false};

            const decision = evaluatePathRules(filePath, defaultPathRules);
            if (!decision.allowed) {
                return {
                    blocked: true,
                    reason: `[SecurityGuidance] Edit blocked: ${decision.reason} (path: ${filePath})`,
                    metadata: {filePath, matchedPattern: decision.matchedPattern},
                };
            }
            return {blocked: false};
        },
    });

    // --- Hook 3: Bash command danger check ---
    globalToolHookRegistry.register({
        phase: 'pre',
        toolNamePattern: 'bash',
        name: 'security-guidance:bash-danger-check',
        async handler(_toolName, input) {
            const command = extractCommand(input);
            if (!command) return {blocked: false};

            for (const {pattern, reason} of DANGEROUS_COMMAND_PATTERNS) {
                if (pattern.test(command)) {
                    logger.warn('[SecurityGuidance] Dangerous bash command detected', {
                        command: command.slice(0, 200),
                        reason,
                    });
                    return {
                        blocked: true,
                        reason: `[SecurityGuidance] Dangerous command blocked: ${reason}`,
                        metadata: {command: command.slice(0, 200), reason},
                    };
                }
            }
            return {blocked: false};
        },
    });

    // --- Hook 4: Post-hook logging for all write operations ---
    globalToolHookRegistry.register({
        phase: 'post',
        toolNamePattern: 'write-file',
        name: 'security-guidance:write-audit-log',
        async handler(toolName, input, _output) {
            const filePath = extractFilePath(input);
            logger.info('[SecurityGuidance] File write completed', {
                toolName,
                filePath: filePath ?? 'unknown',
            });
            return {blocked: false};
        },
    });

    logger.info('[SecurityGuidanceHook] Registered 4 security hooks');
}

// Auto-register on import
registerSecurityGuidanceHooks();
