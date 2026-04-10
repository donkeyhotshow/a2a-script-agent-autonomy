/**
 * Action Handler: command-execution
 * 
 * Handles execute-command action with sandboxing and security.
 */

import {logger} from '../../../utils/logger.js';
import {spawn} from 'node:child_process';
import {validatePath} from './file-operations/security.js';
import {executeAction, ValidationResult} from '../utils.js';

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

// Command tiers for security levels
const COMMAND_TIERS: Record<string, 'read-only' | 'build' | 'network'> = {
    // Read-only commands (always allowed)
    'cat': 'read-only',
    'ls': 'read-only',
    'dir': 'read-only',
    'echo': 'read-only',
    'pwd': 'read-only',
    'find': 'read-only',
    'grep': 'read-only',
    'head': 'read-only',
    'tail': 'read-only',
    'wc': 'read-only',
    'sort': 'read-only',
    'uniq': 'read-only',
    'diff': 'read-only',

    // Build commands (require ALLOW_BUILD_COMMANDS=1)
    'git': 'build',
    'npm': 'build',
    'npx': 'build',
    'node': 'build',
    'tsc': 'build',
    'eslint': 'build',
    'prettier': 'build',
    'mkdir': 'build',
    'cp': 'build',
    'copy': 'build',
    'mv': 'build',
    'move': 'build',
    'rm': 'build',
    'del': 'build',
    'touch': 'build',
    'zip': 'build',
    'unzip': 'build',
    'tar': 'build',
    'prisma': 'build',
    'vitest': 'build',
    'jest': 'build',
    'playwright': 'build',
    'cypress': 'build',

    // Network commands (require ALLOW_NETWORK_COMMANDS=1)
    'curl': 'network',
    'wget': 'network',
};

// High-risk binaries that require explicit enablement
const HIGH_RISK_COMMANDS = new Set([
    'node',
    'npx',
    'docker',
    'curl',
    'wget',
    'npm',
]);

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

    return executeAction(
        'execute-command',
        input,
        (input): ValidationResult => {
            // Validate command
            const cmdValidation = validateCommand(input);
            if (!cmdValidation.valid) {
                return cmdValidation;
            }

            // Validate working directory
            if (input.cwd) {
                const cwdValidation = validatePath(input.cwd);
                if (!cwdValidation.valid) {
                    return { valid: false, error: `Invalid working directory: ${cwdValidation.error}` };
                }
            }

            return { valid: true };
        },
        async (input) => {
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
        }
    );
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

    // Validate command against tiers and security flags
    const commandParts = input.command.split(' ');
    const baseCommand = commandParts[0]?.toLowerCase();

    if (!baseCommand) {
        return {
            valid: false,
            error: 'No command specified',
        };
    }

    const tier = COMMAND_TIERS[baseCommand];
    if (!tier) {
        return {
            valid: false,
            error: `Command '${baseCommand}' is not allowed`,
        };
    }

    // Check tier-specific permissions
    if (tier === 'build' && process.env.ALLOW_BUILD_COMMANDS !== '1') {
        return {
            valid: false,
            error: `Build commands not allowed. Set ALLOW_BUILD_COMMANDS=1`,
        };
    }

    if (tier === 'network' && process.env.ALLOW_NETWORK_COMMANDS !== '1') {
        return {
            valid: false,
            error: `Network commands not allowed. Set ALLOW_NETWORK_COMMANDS=1`,
        };
    }

    // Check high-risk command permissions
    if (HIGH_RISK_COMMANDS.has(baseCommand) && process.env.ALLOW_HIGH_RISK_COMMANDS !== '1') {
        return {
            valid: false,
            error: `High-risk command '${baseCommand}' not allowed. Set ALLOW_HIGH_RISK_COMMANDS=1`,
        };
    }

    // Shell execution requires high-risk permissions
    if (input.shell && process.env.ALLOW_HIGH_RISK_COMMANDS !== '1') {
        return {
            valid: false,
            error: 'Shell execution not allowed. Set ALLOW_HIGH_RISK_COMMANDS=1',
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

