/**
 * Action Handler: command-execution
 * 
 * Handles execute-command action with sandboxing and security.
 */

import {logger} from '../../utils/logger.js';
import {spawn} from 'node:child_process';
import * as path from 'node:path';

export interface ExecuteCommandInput {
    command: string;
    args?: string[];
    cwd?: string;
    env?: Record<string, string>;
    timeout?: number; // in milliseconds
    maxOutput?: number; // max output size in bytes
    shell?: boolean;
}

export interface ExecuteCommandOutput {
    success: boolean;
    stdout?: string;
    stderr?: string;
    exitCode?: number;
    executionTime?: number;
    timedOut?: boolean;
    error?: string;
}

export interface CommandValidationResult {
    valid: boolean;
    error?: string;
    sanitizedCommand?: string;
}

// Whitelist of allowed commands
const ALLOWED_COMMANDS = [
    'git',
    'npm',
    'npx',
    'node',
    'tsc',
    'eslint',
    'prettier',
    'cat',
    'ls',
    'dir',
    'echo',
    'mkdir',
    'cd',
    'pwd',
    'cp',
    'copy',
    'mv',
    'move',
    'rm',
    'del',
    'touch',
    'find',
    'grep',
    'head',
    'tail',
    'wc',
    'sort',
    'uniq',
    'diff',
    'zip',
    'unzip',
    'tar',
    'curl',
    'wget',
    'docker',
    'docker-compose',
    'prisma',
    'vitest',
    'jest',
    'playwright',
    'cypress',
];

// Blacklist of dangerous patterns
const DANGEROUS_PATTERNS = [
    /[;&|]\s*(?:rm|del|remove)\s+-rf/i,
    />\s*\//, // Redirect to root
    /:\(\)\s*\{[^}]*:\(\)\s*\{/i, // Fork bomb
    /\/dev\/null.*&/, // Background with null redirect suspicious patterns
    /(?:wget|curl).*\|.*(?:sh|bash|zsh)/i, // Pipe curl/wget to shell
    /eval\s*\(/i,
    /exec\s*\(/i,
    /`.*rm.*-rf.*`/, // Backtick execution
    /\$\(.*rm.*-rf.*\)/, // Command substitution with rm
];

/**
 * Execute execute-command action
 */
export async function executeCommand(
    input: ExecuteCommandInput
): Promise<ExecuteCommandOutput> {
    const startTime = Date.now();
    
    logger.info('[execute-command] Executing', {
        command: input.command,
        args: input.args,
        cwd: input.cwd,
    });

    try {
        // Validate command
        const validation = validateCommand(input);
        if (!validation.valid) {
            return {
                success: false,
                error: validation.error,
            };
        }

        // Validate working directory
        if (input.cwd) {
            const cwdValidation = validatePath(input.cwd);
            if (!cwdValidation.valid) {
                return {
                    success: false,
                    error: `Invalid working directory: ${cwdValidation.error}`,
                };
            }
        }

        // Execute command with timeout
        const timeout = input.timeout || 60000; // 1 minute default
        const maxOutput = input.maxOutput || 1024 * 1024; // 1MB default

        const result = await runCommand({
            command: input.command,
            args: input.args,
            cwd: input.cwd,
            env: input.env,
            timeout,
            maxOutput,
            shell: input.shell,
        });

        const executionTime = Date.now() - startTime;

        logger.info('[execute-command] Command executed', {
            command: input.command,
            exitCode: result.exitCode,
            executionTime,
            timedOut: result.timedOut,
        });

        return {
            success: result.exitCode === 0,
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode,
            executionTime,
            timedOut: result.timedOut,
        };
    } catch (error) {
        logger.error('[execute-command] Execution failed', {error: String(error)});
        return {
            success: false,
            error: String(error),
        };
    }
}

/**
 * Validate command for security
 */
export function validateCommand(input: ExecuteCommandInput): CommandValidationResult {
    const fullCommand = input.shell
        ? input.command
        : `${input.command} ${(input.args || []).join(' ')}`;

    // Check for dangerous patterns
    for (const pattern of DANGEROUS_PATTERNS) {
        if (pattern.test(fullCommand)) {
            return {
                valid: false,
                error: 'Command contains dangerous patterns',
            };
        }
    }

    // Check if command is in whitelist
    const commandParts = input.command.split(' ');
    const baseCommand = commandParts[0]?.toLowerCase();
    
    if (!baseCommand || !ALLOWED_COMMANDS.includes(baseCommand)) {
        return {
            valid: false,
            error: `Command '${baseCommand}' is not in the allowed list`,
        };
    }

    return {valid: true};
}

// ============== Private Helpers ==============

interface RunCommandOptions {
    command: string;
    args?: string[];
    cwd?: string;
    env?: Record<string, string>;
    timeout: number;
    maxOutput: number;
    shell?: boolean;
}

interface RunCommandResult {
    stdout: string;
    stderr: string;
    exitCode: number;
    timedOut: boolean;
}

function runCommand(options: RunCommandOptions): Promise<RunCommandResult> {
    return new Promise((resolve) => {
        const {
            command,
            args = [],
            cwd,
            env,
            timeout,
            maxOutput,
            shell = false,
        } = options;

        let stdout = '';
        let stderr = '';
        let timedOut = false;

        // Spawn process
        const child = shell
            ? spawn(command, {cwd, env: {...process.env, ...env}, shell: true})
            : spawn(command, args, {cwd, env: {...process.env, ...env}});

        // Set up timeout
        const timeoutId = setTimeout(() => {
            timedOut = true;
            child.kill('SIGTERM');
            
            // Force kill after grace period
            setTimeout(() => {
                child.kill('SIGKILL');
            }, 5000);
        }, timeout);

        // Collect stdout
        child.stdout?.on('data', (data: Buffer) => {
            if (stdout.length < maxOutput) {
                stdout += data.toString('utf8');
                if (stdout.length > maxOutput) {
                    stdout = stdout.slice(0, maxOutput) + '\n... [output truncated]';
                }
            }
        });

        // Collect stderr
        child.stderr?.on('data', (data: Buffer) => {
            if (stderr.length < maxOutput) {
                stderr += data.toString('utf8');
                if (stderr.length > maxOutput) {
                    stderr = stderr.slice(0, maxOutput) + '\n... [output truncated]';
                }
            }
        });

        // Handle process exit
        child.on('close', (code) => {
            clearTimeout(timeoutId);
            resolve({
                stdout,
                stderr,
                exitCode: code ?? (timedOut ? -1 : 0),
                timedOut,
            });
        });

        // Handle errors
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

function validatePath(dirPath: string): {valid: boolean; error?: string} {
    const resolved = path.resolve(dirPath);
    const cwd = process.cwd();

    // Prevent access outside workspace
    const allowedPrefixes = [cwd, '/tmp', '/var/tmp', process.env.HOME || ''];
    
    const isAllowed = allowedPrefixes.some(prefix => 
        prefix && resolved.startsWith(path.resolve(prefix))
    );

    if (!isAllowed) {
        return {
            valid: false,
            error: 'Path is outside allowed directories',
        };
    }

    return {valid: true};
}
