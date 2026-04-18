/**
 * AllowlistChecker — validates shell commands against a configurable allowlist.
 *
 * Blocks dangerous commands unconditionally, then checks the root binary
 * against the allowlist. In non-strict mode (default) commands not in the
 * list are still permitted. Set A2A_SANDBOX_STRICT=1 to enforce.
 */

import { logger } from '@a2a/server-utils/logger';

export interface AllowlistResult {
    allowed: boolean;
    reason?: string;
}

const BLOCKED_PATTERNS: RegExp[] = [
    /\brm\s+-rf?\s+\/\b/,
    /\bsudo\b/,
    /\bchmod\s+[0-7]{3,4}\s+\/\b/,
    /\b(wget|curl)\s+.*\|\s*sh\b/,
    /\bdd\b.*of=\/dev/,
    /\bmkfs\b/,
    /\bshred\b/,
];

const DEFAULT_ALLOWLIST = new Set([
    'npm', 'npx', 'pnpm', 'yarn',
    'node', 'tsx', 'ts-node',
    'tsc', 'vitest', 'jest', 'mocha',
    'git', 'grep', 'find', 'ls', 'cat', 'head', 'tail',
    'echo', 'cp', 'mv', 'mkdir', 'touch',
    'python', 'python3', 'pip', 'pip3',
    'go', 'cargo', 'rustc',
]);

export class AllowlistChecker {
    private readonly allowed: Set<string>;

    constructor() {
        const extra = (process.env['A2A_SANDBOX_ALLOWLIST'] ?? '')
            .split(',').map((s) => s.trim()).filter(Boolean);
        this.allowed = new Set([...DEFAULT_ALLOWLIST, ...extra]);
    }

    check(command: string): AllowlistResult {
        for (const re of BLOCKED_PATTERNS) {
            if (re.test(command)) {
                logger.warn('[Allowlist] Blocked dangerous pattern', { pattern: re.source });
                return { allowed: false, reason: `Blocked by pattern: ${re.source}` };
            }
        }

        const rootBin = this._extractRootBin(command);
        if (rootBin && this.allowed.has(rootBin)) return { allowed: true };

        if (process.env['A2A_SANDBOX_STRICT'] === '1') {
            return { allowed: false, reason: `Not in allowlist (strict mode): ${rootBin ?? command}` };
        }

        return { allowed: true };
    }

    private _extractRootBin(command: string): string | null {
        const withoutEnv = command.trim().replace(/^(\w+=\S+\s+)+/, '');
        const first = withoutEnv.split(/\s+/)[0] ?? '';
        return first.split('/').pop() ?? null;
    }
}
