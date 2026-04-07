import { logger } from '../utils/logger.js';
import { execSync } from 'node:child_process';

/**
 * Stub “L3” sandbox — **not** isolated. `execSync(command)` is shell-equivalent RCE if `command` is ever
 * influenced by LLM, HTTP, or user input. Before wiring callers: real sandbox (bwrap/seatbelt) + fixed
 * allowlist, or `spawnSync` with `argv` only (no shell string). See purple hunt log in
 * `docs/PURPLE-ALERT-HARMFUL-HUNT.md`.
 */
export class SkillLiteSandbox {
  /**
   * Execute with OS-native hard isolation (L3)
   * Using Seatbelt (macOS) or Bubblewrap (Linux) or just restricted shell mock
   */
  execute(command: string, dir: string): string {
    logger.info('[SkillLite] Executing in L3 Sandbox', { command, dir });
    
    // In production, this would prep the bwrap/seatbelt command
    // Example: bwrap --ro-bind /usr /usr --dir /tmp --unshare-all ...
    
    try {
      // Mocked restricted execution (insecure if command is untrusted — see file-level note)
      const output = execSync(command, { cwd: dir, timeout: 5000 }).toString();
      return output;
    } catch (err: unknown) {
      let errorMessage = 'Unknown error';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      logger.error('[SkillLite] Sandbox execution failed', errorMessage);
      throw new Error(`Sandbox violation or error: ${errorMessage}`);
    }
  }
}

export const skillLite = new SkillLiteSandbox();
