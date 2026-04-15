/**
 * Action Handler: run-script
 * 
 * Handles run-script action for executing predefined scripts.
 */

import {logger} from '@a2a/server-utils/logger';
import {spawn} from 'node:child_process';

export interface RunScriptParams {
    dryRun?: boolean;
    [key: string]: unknown;
}

export interface RunScriptInput {
    scriptId: string;
    params?: RunScriptParams;
}

export interface RunScriptOutput {
    success: boolean;
    scriptId: string;
    output?: string;
    filesModified?: string[];
    duration?: number;
    dryRun?: boolean;
    error?: string;
    errorCode?: string;
}

// Available scripts library
interface ScriptDefinition {
    name: string;
    description: string;
    command: string;
    args?: (params: RunScriptParams) => string[];
}

const SCRIPTS_LIBRARY: Record<string, ScriptDefinition> = {
    'fix-vue-imports': {
        name: 'Fix Vue Imports',
        description: 'Fix Vue component imports',
        command: 'npx',
        args: (params) => [
            'vue-tsc',
            '--noEmit',
            ...(params.dryRun ? ['--dry-run'] : []),
        ].filter(Boolean) as string[],
    },
    'lint-fix': {
        name: 'Lint Fix',
        description: 'Auto-fix linting issues',
        command: 'npx',
        args: (params) => [
            'eslint',
            '--fix',
            ...(params.stagedOnly ? ['--staged'] : []),
        ].filter(Boolean) as string[],
    },
    'format-code': {
        name: 'Format Code',
        description: 'Format code with prettier',
        command: 'npx',
        args: (params) => [
            'prettier',
            '--write',
            ...(params.extensions ? [params.extensions as string] : ['"src/**/*.{ts,js,json}"']),
        ].filter(Boolean) as string[],
    },
    'phpunit-deprecations': {
        name: 'PHPUnit Deprecations',
        description: 'Analyze PHPUnit deprecations',
        command: 'npx',
        args: (params) => [
            'phpunit',
            '--display-deprecations',
            ...(params.outputFormat === 'json' ? ['--format=json'] : []),
        ].filter(Boolean) as string[],
    },
    'build': {
        name: 'Build Project',
        description: 'Build the project',
        command: 'npm',
        args: () => ['run', 'build'],
    },
    'test': {
        name: 'Run Tests',
        description: 'Run project tests',
        command: 'npx',
        args: (params) => [
            'vitest',
            'run',
            ...(params.coverage ? ['--coverage'] : []),
        ].filter(Boolean) as string[],
    },
    'type-check': {
        name: 'Type Check',
        description: 'Run TypeScript type checking',
        command: 'npx',
        args: () => ['tsc', '--noEmit'],
    },
    'dev': {
        name: 'Dev Server',
        description: 'Start development server',
        command: 'npm',
        args: () => ['run', 'dev'],
    },
};

/**
 * Execute run-script action
 */
export async function executeRunScript(
    input: RunScriptInput
): Promise<RunScriptOutput> {
    const startTime = Date.now();
    
    logger.info('[run-script] Executing', {
        scriptId: input.scriptId,
        params: input.params,
    });

    const params = input.params || {};
    const dryRun = params.dryRun === true;

    // Check if script exists
    const script = SCRIPTS_LIBRARY[input.scriptId];
    if (!script) {
        const availableScripts = Object.keys(SCRIPTS_LIBRARY).join(', ');
        
        logger.error('[run-script] Script not found', {
            scriptId: input.scriptId,
            availableScripts,
        });

        return {
            success: false,
            scriptId: input.scriptId,
            error: `Script '${input.scriptId}' not found. Available scripts: ${availableScripts}`,
            errorCode: 'SCRIPT_NOT_FOUND',
            duration: Date.now() - startTime,
        };
    }

    try {
        // If dry run, just return preview
        if (dryRun) {
            logger.info('[run-script] Dry run mode', {scriptId: input.scriptId});
            
            return {
                success: true,
                scriptId: input.scriptId,
                output: `[Dry Run] Would execute: ${script.command} ${(script.args?.(params) || []).join(' ')}`,
                filesModified: [],
                dryRun: true,
                duration: Date.now() - startTime,
            };
        }

        // Build command arguments
        const args = script.args ? script.args(params) : [];
        
        // Execute the script
        const result = await executeCommand(script.command, args);

        const duration = Date.now() - startTime;

        if (result.exitCode === 0) {
            logger.info('[run-script] Script executed successfully', {
                scriptId: input.scriptId,
                duration,
            });

            return {
                success: true,
                scriptId: input.scriptId,
                output: result.stdout || 'Script completed successfully',
                filesModified: parseModifiedFiles(result.stdout),
                duration,
            };
        } else {
            logger.error('[run-script] Script execution failed', {
                scriptId: input.scriptId,
                exitCode: result.exitCode,
                stderr: result.stderr,
            });

            return {
                success: false,
                scriptId: input.scriptId,
                output: result.stdout,
                error: result.stderr || `Script exited with code ${result.exitCode}`,
                errorCode: 'SCRIPT_ERROR',
                duration,
            };
        }
    } catch (error) {
        logger.error('[run-script] Execution failed', {error: String(error)});
        
        return {
            success: false,
            scriptId: input.scriptId,
            error: String(error),
            errorCode: 'SCRIPT_ERROR',
            duration: Date.now() - startTime,
        };
    }
}

/**
 * Execute a command
 */
function executeCommand(
    command: string,
    args: string[],
    timeout: number = 300000 // 5 minutes default
): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
}> {
    return new Promise((resolve) => {
        let stdout = '';
        let stderr = '';
        
        const child = spawn(command, args, {
            cwd: process.cwd(),
            env: process.env,
            shell: true,
        });

        // Set up timeout
        const timeoutId = setTimeout(() => {
            child.kill('SIGTERM');
            stderr += '\nScript execution timed out';
        }, timeout);

        child.stdout?.on('data', (data: Buffer) => {
            stdout += data.toString('utf8');
        });

        child.stderr?.on('data', (data: Buffer) => {
            stderr += data.toString('utf8');
        });

        child.on('close', (code) => {
            clearTimeout(timeoutId);
            resolve({
                stdout,
                stderr,
                exitCode: code ?? -1,
            });
        });

        child.on('error', (error) => {
            clearTimeout(timeoutId);
            stderr += `\nProcess error: ${error.message}`;
            resolve({
                stdout,
                stderr,
                exitCode: -1,
            });
        });
    });
}

/**
 * Parse modified files from output (simple heuristic)
 */
function parseModifiedFiles(output: string): string[] {
    const files: string[] = [];
    
    // Look for common patterns like "Modified: src/file.ts" or "src/file.ts"
    const patterns = [
        /modified:\s*([^\s\n]+)/gi,
        /([\w/.-]+\.(ts|js|vue|jsx|tsx))\s*(modified|changed|updated)/gi,
    ];

    for (const pattern of patterns) {
        const matches = output.matchAll(pattern);
        for (const match of matches) {
            const file = match[1] || match[0];
            if (file && !files.includes(file)) {
                files.push(file);
            }
        }
    }

    return files;
}

/**
 * Get available scripts
 */
export function getAvailableScripts(): Array<{id: string; name: string; description: string}> {
    return Object.entries(SCRIPTS_LIBRARY).map(([id, def]) => ({
        id,
        name: def.name,
        description: def.description,
    }));
}
