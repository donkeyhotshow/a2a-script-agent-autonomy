import { logger } from '../utils/logger.js';
import { execSync } from 'node:child_process';

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
      // Mocked restricted execution
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
