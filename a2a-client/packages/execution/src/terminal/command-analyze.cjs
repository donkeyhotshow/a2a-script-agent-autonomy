'use strict';

/**
 * Lightweight command safety (substring blocklist only — no allowlist).
 * Shared by terminal-handler.cjs and run-agent-command.js (agent tool chain).
 *
 * @param {string} command
 * @returns {{ blocked: boolean; reason?: string }}
 */
function analyzeCommand(command) {
    if (!command || typeof command !== 'string') {
        return { blocked: false };
    }

    const cmd = command.toLowerCase().trim();

    const dangerousPatterns = [
        'rm -rf /',
        'format',
        'del /f /s /q',
        'rmdir /s /q',
        'shutdown',
        'taskkill',
        'net user',
        'reg delete',
        'attrib -r -s -h',
    ];

    for (const pattern of dangerousPatterns) {
        if (cmd.includes(pattern.toLowerCase())) {
            return {
                blocked: true,
                reason: `Command contains potentially dangerous pattern: ${pattern}`,
            };
        }
    }

    return { blocked: false };
}

module.exports = { analyzeCommand };
