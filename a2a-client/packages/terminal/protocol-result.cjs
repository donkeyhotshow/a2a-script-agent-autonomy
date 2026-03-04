/**
 * Protocol result shape for execute-command.
 * Task: tasks/client/11-terminal-execute-command-protocol-alignment.md
 *
 * result["execute-command"] = { command, exitCode, stdout, stderr }
 * api-server adapter returns this shape; safety per Task 39 (allowed commands, cwd, timeout)
 */

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * Run command and return protocol shape for result["execute-command"]
 * @param {string} command
 * @param {{ cwd?: string, timeout?: number }} options
 * @returns {Promise<{ command: string, exitCode: number, stdout: string, stderr: string }>}
 */
async function executeCommandForResult(command, options = {}) {
    try {
        const { stdout, stderr } = await execAsync(command, {
            cwd: options.cwd,
            timeout: options.timeout || 60000,
            maxBuffer: 1024 * 1024 // 1MB buffer
        });

        return {
            command,
            exitCode: 0,
            stdout: stdout || '',
            stderr: stderr || ''
        };
    } catch (error) {
        // Command failed or timed out
        return {
            command,
            exitCode: error.code || 1,
            stdout: error.stdout || '',
            stderr: error.stderr || error.message || ''
        };
    }
}

module.exports = { executeCommandForResult };
