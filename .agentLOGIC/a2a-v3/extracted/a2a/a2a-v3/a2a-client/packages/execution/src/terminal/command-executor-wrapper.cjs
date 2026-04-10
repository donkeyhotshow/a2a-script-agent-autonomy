// Minimal CommandExecutor implementation expected by `terminal-handler.cjs`.
// Used at runtime by `a2a-client`'s `execution` package.
const { spawn } = require('child_process');

class CommandExecutor {
  constructor(logger = console, errorHandler = null) {
    this.logger = logger;
    this.errorHandler = errorHandler;
  }

  /**
   * @param {string} command
   * @param {number} timeoutSeconds
   * @param {boolean} isBackground
   * @param {string} cwd
   */
  async runCommand(command, timeoutSeconds, isBackground, cwd) {
    // Best-effort "background" execution: detach and return success immediately.
    if (isBackground) {
      const child = spawn('cmd.exe', ['/c', command], {
        cwd: cwd || process.cwd(),
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
      return { stdout: '', stderr: '', return_code: 0, exitCode: 0 };
    }

    return await new Promise((resolve) => {
      let stdout = '';
      let stderr = '';

      const child = spawn('cmd.exe', ['/c', command], {
        cwd: cwd || process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      const timeoutMs = Math.max(1, Number(timeoutSeconds || 60)) * 1000;
      const timer = setTimeout(() => {
        try {
          child.kill();
        } catch {
          // ignore
        }
        resolve({ stdout, stderr, return_code: 1, exitCode: 1 });
      }, timeoutMs);

      child.stdout.on('data', (d) => {
        stdout += String(d);
      });
      child.stderr.on('data', (d) => {
        stderr += String(d);
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        const message = err && err.message ? err.message : String(err);
        resolve({ stdout, stderr: message, return_code: 1, exitCode: 1 });
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        const exitCode = code ?? 0;
        resolve({ stdout, stderr, return_code: exitCode, exitCode });
      });
    });
  }
}

module.exports = { CommandExecutor };

