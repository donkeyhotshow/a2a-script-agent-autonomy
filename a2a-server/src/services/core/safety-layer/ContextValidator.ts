/**
 * ContextValidator — ADR-0035 component 2
 *
 * Validates context integrity using SHA-256 hash comparison.
 * CPU-only, < 1 ms (synchronous hash on serialised context string).
 */
import { createHash } from 'node:crypto';
import type { IntegrityResult } from './types.js';

export class ContextValidator {
  private static serialise(context: Record<string, unknown>): string {
    return JSON.stringify(context, Object.keys(context).sort());
  }

  private static digestSerialised(serialised: string): string {
    return createHash('sha256').update(serialised, 'utf8').digest('hex');
  }

  /**
   * Compute a canonical SHA-256 over the provided context object.
   * Uses deterministic JSON serialisation (sorted keys via replacer).
   */
  static hash(context: Record<string, unknown>): string {
    return ContextValidator.digestSerialised(ContextValidator.serialise(context));
  }

  /**
   * Validate that the context hash supplied by the caller matches
   * a freshly computed hash of the actual context.
   *
   * @param context      The current context object.
   * @param suppliedHash The hash the caller claims describes the context.
   */
  validate(context: Record<string, unknown>, suppliedHash: string): IntegrityResult {
    const serialised = ContextValidator.serialise(context);
    const actualHash = ContextValidator.digestSerialised(serialised);

    return {
      valid: actualHash === suppliedHash,
      expected_hash: suppliedHash,
      actual_hash: actualHash,
      context_size_bytes: Buffer.byteLength(serialised, 'utf8'),
    };
  }
}
