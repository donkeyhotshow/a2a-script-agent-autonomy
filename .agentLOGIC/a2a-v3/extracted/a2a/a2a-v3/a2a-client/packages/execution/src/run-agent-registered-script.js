/**
 * Predefined run-script ids — keep in sync with a2a-server/src/actions/handlers/run-script.ts SCRIPTS_LIBRARY
 */

import { spawn } from 'node:child_process';

/** @type {Record<string, { command: string; args?: (params: Record<string, unknown>) => string[] }>} */
const SCRIPTS_LIBRARY = {
    'fix-vue-imports': {
        command: 'npx',
        args: (params) =>
            ['vue-tsc', '--noEmit', ...(params.dryRun ? ['--dry-run'] : [])].filter(Boolean),
    },
    'lint-fix': {
        command: 'npx',
        args: (params) =>
            ['eslint', '--fix', ...(params.stagedOnly ? ['--staged'] : [])].filter(Boolean),
    },
    'format-code': {
        command: 'npx',
        args: (params) => [
            'prettier',
            '--write',
            ...(params.extensions ? [String(params.extensions)] : ['"src/**/*.{ts,js,json}"']),
        ],
    },
    'phpunit-deprecations': {
        command: 'npx',
        args: (params) =>
            [
                'phpunit',
                '--display-deprecations',
                ...(params.outputFormat === 'json' ? ['--format=json'] : []),
            ].filter(Boolean),
    },
    build: {
        command: 'npm',
        args: () => ['run', 'build'],
    },
    test: {
        command: 'npx',
        args: (params) => ['vitest', 'run', ...(params.coverage ? ['--coverage'] : [])].filter(Boolean),
    },
    'type-check': {
        command: 'npx',
        args: () => ['tsc', '--noEmit'],
    },
    dev: {
        command: 'npm',
        args: () => ['run', 'dev'],
    },
};

function executeCommandSpawn(command, args, cwd, timeout = 300000) {
    return new Promise((resolve) => {
        let stdout = '';
        let stderr = '';

        const child = spawn(command, args, {
            cwd,
            env: process.env,
            shell: true,
        });

        const timeoutId = setTimeout(() => {
            child.kill('SIGTERM');
            stderr += '\nScript execution timed out';
        }, timeout);

        child.stdout?.on('data', (data) => {
            stdout += data.toString('utf8');
        });
        child.stderr?.on('data', (data) => {
            stderr += data.toString('utf8');
        });
        child.on('close', (code) => {
            clearTimeout(timeoutId);
            resolve({ stdout, stderr, exitCode: code ?? -1 });
        });
        child.on('error', (error) => {
            clearTimeout(timeoutId);
            stderr += `\nProcess error: ${error.message}`;
            resolve({ stdout, stderr, exitCode: -1 });
        });
    });
}

function parseModifiedFiles(output) {
    const files = [];
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
 * @param {string} projectPath
 * @param {Record<string, unknown>} payload
 */
export async function runClientRegisteredScript(projectPath, payload) {
    const scriptId = typeof payload.scriptId === 'string' ? payload.scriptId.trim() : '';
    const startTime = Date.now();

    if (!scriptId) {
        return {
            success: false,
            scriptId: '',
            error: 'missing scriptId',
            duration: 0,
        };
    }

    const params =
        payload.params && typeof payload.params === 'object' && !Array.isArray(payload.params)
            ? payload.params
            : {};

    const script = SCRIPTS_LIBRARY[scriptId];
    if (!script) {
        const availableScripts = Object.keys(SCRIPTS_LIBRARY).join(', ');
        return {
            success: false,
            scriptId,
            error: `Script '${scriptId}' not found. Available: ${availableScripts}`,
            errorCode: 'SCRIPT_NOT_FOUND',
            duration: Date.now() - startTime,
        };
    }

    if (params.dryRun === true) {
        const args = script.args ? script.args(params) : [];
        return {
            success: true,
            scriptId,
            output: `[Dry Run] Would execute: ${script.command} ${args.join(' ')}`,
            filesModified: [],
            dryRun: true,
            duration: Date.now() - startTime,
        };
    }

    const args = script.args ? script.args(params) : [];

    try {
        const result = await executeCommandSpawn(script.command, args, projectPath);

        const duration = Date.now() - startTime;

        if (result.exitCode === 0) {
            return {
                success: true,
                scriptId,
                output: result.stdout || 'Script completed successfully',
                filesModified: parseModifiedFiles(result.stdout),
                duration,
            };
        }
        return {
            success: false,
            scriptId,
            output: result.stdout,
            error: result.stderr || `Script exited with code ${result.exitCode}`,
            errorCode: 'SCRIPT_ERROR',
            duration,
        };
    } catch (error) {
        return {
            success: false,
            scriptId,
            error: String(error),
            errorCode: 'SCRIPT_ERROR',
            duration: Date.now() - startTime,
        };
    }
}
