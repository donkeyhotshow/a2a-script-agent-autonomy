/**
 * Protocol result shape for execute-command – stub.
 * Task: tasks/client/11-terminal-execute-command-protocol-alignment.md
 *
 * TODO(11): result["execute-command"] = { command, exitCode, stdout, stderr }
 * TODO(11): api-server adapter returns this shape; safety per Task 39 (allowed commands, cwd, timeout)
 */

/**
 * TODO(11): implement – run command and return protocol shape for result["execute-command"]
 * @param {string} command
 * @param {{ cwd?: string, timeout?: number }} options
 * @returns {Promise<{ command: string, exitCode: number, stdout: string, stderr: string }>}
 */
async function executeCommandForResult(command, options = {}) {
    throw new Error('TODO Task 11: implement executeCommandForResult – see tasks/client/11-terminal-execute-command-protocol-alignment.md');
}

module.exports = { executeCommandForResult };
