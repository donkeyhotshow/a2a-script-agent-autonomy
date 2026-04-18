import { spawn } from 'node:child_process';
import { logger } from "@a2a/server-utils/logger";

/**
 * SkillLiteSandbox — process-level sandbox for skill execution.
 *
 * Runs commands in a child process with:
 *   - Hard timeout (AbortController)
 *   - stdout/stderr capture (max 1 MB)
 *   - Secret-stripping environment isolation
 *   - Allowlist enforcement (BLOCKED_PATTERNS always enforced;
 *     ALLOWLIST enforced only when A2A_SANDBOX_STRICT=1)
 *
 * The synchronous execute() is kept for backward-compat but always throws.
 * All callers must migrate to executeAsync().
 */

const MAX_BYTES = 1_024 * 1_024; // 1 MB

const BLOCKED_PATTERNS: RegExp[] = [
    /\brm\s+-rf?\s+\/\b/,
    /\bsudo\b/,
    /\bdd\b.*of=\/dev/,
    /\b(wget|curl)\s+.*\|\s*sh\b/,
    /\bmkfs\b/,
    /\bshred\b/,
];

const ALLOWLIST = new Set([
    'npm', 'npx', 'pnpm', 'yarn', 'node', 'tsx', 'tsc', 'vitest',
    'git', 'grep', 'find', 'ls', 'cat', 'head', 'tail', 'echo',
    'cp', 'mv', 'mkdir', 'touch', 'python', 'python3', 'go', 'cargo',
]);

const SECRET_PREFIXES = ['AWS_', 'OPENAI_', 'API_KEY', 'SECRET', 'TOKEN', 'PASSWORD'];

function isAllowed(command: string): { ok: boolean; reason?: string } {
    for (const re of BLOCKED_PATTERNS) {
        if (re.test(command)) {
            return { ok: false, reason: `Blocked by pattern: ${re.source}` };
        }
    }
    if (process.env['A2A_SANDBOX_STRICT'] === '1') {
        const rootBin = command.trim().split(/\s+/)[0]?.split('/')?.pop() ?? '';
        if (rootBin && !ALLOWLIST.has(rootBin)) {
            return { ok: false, reason: `Not in allowlist (strict mode): ${rootBin}` };
        }
    }
    return { ok: true };
}

function buildSafeEnv(extra: Record<string, string>): Record<string, string> {
    const env: Record<string, string> = {
        PATH: process.env['PATH'] ?? '/usr/local/bin:/usr/bin:/bin',
        HOME: process.env['HOME'] ?? '/tmp',
        ...extra,
    };
    for (const k of Object.keys(env)) {
        if (SECRET_PREFIXES.some((p) => k.includes(p))) delete env[k];
    }
    return env;
}

export class SkillLiteSandbox {
    /**
     * Execute a shell command asynchronously.
     * @returns trimmed stdout (max 10 000 chars)
     * @throws on block, timeout, or non-zero exit
     */
    async executeAsync(
        command: string,
        dir: string,
        opts: { timeoutMs?: number; env?: Record<string, string> } = {},
    ): Promise<string> {
        const guard = isAllowed(command);
        if (!guard.ok) {
            logger.error('[SkillLite] Blocked command', {
                command: command.slice(0, 80),
                reason: guard.reason,
            });
            throw new Error(`SkillLiteSandbox: blocked — ${guard.reason}`);
        }

        logger.info('[SkillLite] executeAsync', { command: command.slice(0, 120), dir });

        const timeoutMs = opts.timeoutMs ?? 60_000;
        const safeEnv = buildSafeEnv(opts.env ?? {});

        return new Promise<string>((resolve, reject) => {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);

            const chunks: Buffer[] = [];
            let total = 0;

            const child = spawn('/bin/sh', ['-c', command], {
                cwd: dir,
                env: safeEnv,
                signal: controller.signal,
                stdio: ['ignore', 'pipe', 'pipe'],
            });

            child.stdout?.on('data', (d: Buffer) => {
                total += d.length;
                if (total <= MAX_BYTES) chunks.push(d);
            });
            child.stderr?.on('data', (_d: Buffer) => { /* discard stderr */ });

            child.on('error', (err: Error) => {
                clearTimeout(timer);
                const isAbort = (err as NodeJS.ErrnoException)?.code === 'ABORT_ERR';
                reject(new Error(
                    isAbort
                        ? `SkillLiteSandbox: timed out: ${command.slice(0, 80)}`
                        : err.message,
                ));
            });

            child.on('close', (code: number | null) => {
                clearTimeout(timer);
                if (code !== 0) {
                    reject(new Error(
                        `SkillLiteSandbox: exit ${String(code)}: ${command.slice(0, 80)}`,
                    ));
                } else {
                    resolve(Buffer.concat(chunks).toString('utf8').slice(0, 10_000));
                }
            });
        });
    }

    /**
     * @deprecated Use executeAsync(). Synchronous execution is not supported.
     */
    execute(_command: string, _dir: string): string {
        throw new Error(
            'SkillLiteSandbox.execute() is sync and unsupported. Use executeAsync().',
        );
    }
}

export const skillLite = new SkillLiteSandbox();
