import { logger } from '../utils/logger.js';

/**
 * Stub “L3” sandbox — **not** isolated. Arbitrary shell execution is disabled until a real sandbox
 * (bwrap/seatbelt) + fixed allowlist exists. See `docs/PURPLE-ALERT-HARMFUL-HUNT.md`.
 */
export class SkillLiteSandbox {
  /**
   * Execute with OS-native hard isolation (L3) — not implemented; refuses arbitrary commands.
   */
  execute(command: string, dir: string): string {
    logger.warn('[SkillLite] execute() called but shell execution is disabled (security stub)', {
      command,
      dir,
    });
    throw new Error(
      'SkillLiteSandbox.execute is not implemented: arbitrary process execution is disabled. ' +
        'Add a real sandbox + argv allowlist before wiring callers.'
    );
  }
}

export const skillLite = new SkillLiteSandbox();
