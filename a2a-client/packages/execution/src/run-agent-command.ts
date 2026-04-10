/**
 * Shell execution for the Vite agent tool chain (execute-command).
 * Uses the same substring safety check as TerminalHandler — no command allowlist.
 * @see ./terminal/command-analyze.cjs
 */

import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const require = createRequire(import.meta.url);
const { analyzeCommand } = require('./terminal/command-analyze.cjs');

/**
 * @param {{
 *   command: string;
 *   args?: string[];
 *   cwd?: string;
 *   env?: Record<string, string>;
 *   timeout: number;
 *   maxOutput: number;
 *   shell: boolean;
 * }} options
 */
function runShellSpawn(options) {
    return new Promise((resolve) => {
        const {
            command,
            args = [],
            cwd,
            env,
            timeout,
            maxOutput,
            shell,
        } = options;

        let stdout = '';
        let stderr = '';
        let timedOut = false;

        const child = shell
            ? spawn(command, { cwd, env: { ...process.env, ...env }, shell: true })
            : spawn(command, args, { cwd, env: { ...process.env, ...env } });

        const timeoutId = setTimeout(() => {
            timedOut = true;
            child.kill('SIGTERM');
            setTimeout(() => child.kill('SIGKILL'), 5000);
        }, timeout);

        child.stdout?.on('data', (data) => {
            if (stdout.length < maxOutput) {
                stdout += data.toString('utf8');
                if (stdout.length > maxOutput) {
                    stdout = stdout.slice(0, maxOutput) + '\n... [output truncated]';
                }
            }
        });
        child.stderr?.on('data', (data) => {
            if (stderr.length < maxOutput) {
                stderr += data.toString('utf8');
                if (stderr.length > maxOutput) {
                    stderr = stderr.slice(0, maxOutput) + '\n... [output truncated]';
                }
            }
        });
        child.on('close', (code) => {
            clearTimeout(timeoutId);
            resolve({
                stdout,
                stderr,
                exitCode: code ?? (timedOut ? -1 : 0),
                timedOut,
            });
        });
        child.on('error', (error) => {
            clearTimeout(timeoutId);
            resolve({
                stdout,
                stderr: `${stderr}\nProcess error: ${error.message}`,
                exitCode: -1,
                timedOut,
            });
        });
    });
}

/**
 * @param {string} cwdAbs - absolute working directory
 * @param {Record<string, unknown>} payload - execute-command body
 */
export async function runClientExecuteCommand(cwdAbs, payload) {
    const command = typeof payload.command === 'string' ? payload.command.trim() : '';
    if (!command) {
        return {
            command: '',
            success: false,
            exitCode: -1,
            stdout: '',
            stderr: '',
            error: 'missing command',
        };
    }

    const security = analyzeCommand(command);
    if (security.blocked) {
        return {
            command,
            success: false,
            exitCode: -1,
            stdout: '',
            stderr: '',
            error: `Security block: ${security.reason}`,
        };
    }

    const shell = payload.shell !== false;
    const timeout = typeof payload.timeout === 'number' ? payload.timeout : 120000;
    const maxOutput = typeof payload.maxOutput === 'number' ? payload.maxOutput : 1024 * 1024;

    const result = await runShellSpawn({
        command,
        args: Array.isArray(payload.args) ? payload.args : [],
        cwd: cwdAbs,
        env: payload.env && typeof payload.env === 'object' ? payload.env : undefined,
        timeout,
        maxOutput,
        shell,
    });

    return {
        command,
        success: result.exitCode === 0 && !result.timedOut,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        timedOut: result.timedOut,
        error: result.timedOut ? 'Command timed out' : undefined,
    };
}
