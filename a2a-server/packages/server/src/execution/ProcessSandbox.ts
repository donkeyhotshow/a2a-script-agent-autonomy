/**
 * ProcessSandbox — process-level sandbox using Node.js child_process.
 *
 * Features:
 *   - Hard timeout via AbortController
 *   - stdout/stderr capture (max 1 MB each)
 *   - Allowlist enforcement
 *   - Minimal env isolation (strips secrets)
 */

import { spawn } from 'node:child_process';
import { logger } from '@a2a/server-utils/logger';
import type { ISandbox, SandboxOpts, SandboxResult } from './ISandbox.js';
import { AllowlistChecker } from './AllowlistChecker.js';

const MAX_BYTES = 1_024 * 1_024; // 1 MB

const SECRET_PREFIXES = ['AWS_', 'OPENAI_', 'API_KEY', 'SECRET', 'TOKEN', 'PASSWORD', 'DATABASE_URL'];

export class ProcessSandbox implements ISandbox {
    private readonly allowlist = new AllowlistChecker();

    async run(command: string, opts: SandboxOpts): Promise<SandboxResult> {
        const check = this.allowlist.check(command);
        if (!check.allowed) {
            logger.error('[ProcessSandbox] Blocked', { command: command.slice(0, 80), reason: check.reason });
            return { status: 'error', stdout: '', stderr: `Blocked: ${check.reason}`, exitCode: 126, durationMs: 0 };
        }

        const timeoutMs = opts.timeoutMs ?? 60_000;
        const start = Date.now();

        const safeEnv: Record<string, string> = {
            PATH: process.env['PATH'] ?? '/usr/local/bin:/usr/bin:/bin',
            HOME: process.env['HOME'] ?? '/tmp',
            ...(opts.env ?? {}),
        };
        for (const k of Object.keys(safeEnv)) {
            if (SECRET_PREFIXES.some((p) => k.includes(p))) delete safeEnv[k];
        }

        return new Promise<SandboxResult>((resolve) => {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);

            const chunks: { s: 'out' | 'err'; d: Buffer }[] = [];
            let total = 0;

            const child = spawn('/bin/sh', ['-c', command], {
                cwd: opts.cwd,
                env: safeEnv,
                signal: controller.signal,
                stdio: ['ignore', 'pipe', 'pipe'],
            });

            child.stdout?.on('data', (d: Buffer) => {
                total += d.length;
                if (total <= MAX_BYTES) chunks.push({ s: 'out', d });
            });
            child.stderr?.on('data', (d: Buffer) => {
                total += d.length;
                if (total <= MAX_BYTES) chunks.push({ s: 'err', d });
            });

            child.on('error', (err: Error) => {
                clearTimeout(timer);
                const isAbort = (err as NodeJS.ErrnoException).code === 'ABORT_ERR';
                if (isAbort) {
                    resolve({ status: 'timeout', stdout: '', stderr: 'Timed out', exitCode: null, durationMs: Date.now() - start });
                } else {
                    resolve({ status: 'error', stdout: '', stderr: err.message, exitCode: null, durationMs: Date.now() - start });
                }
            });

            child.on('close', (code: number | null) => {
                clearTimeout(timer);
                const stdout = chunks.filter((c) => c.s === 'out').map((c) => c.d).join('');
                const stderr = chunks.filter((c) => c.s === 'err').map((c) => c.d).join('');
                resolve({ status: code === 0 ? 'ok' : 'error', stdout, stderr, exitCode: code, durationMs: Date.now() - start });
            });
        });
    }
}
