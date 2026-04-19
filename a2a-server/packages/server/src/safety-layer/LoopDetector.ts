import { createHash } from "node:crypto";
import { LoopSignal, SafetySignalSeverity } from './types.js';

/**
 * LoopDetector — ADR-0035
 *
 * Detects repetitive execution patterns in the agent's internal turns.
 * Matches by [reason + outcomeClass + contextHash].
 *
 * Public API:
 *   check()  — canonical method, accepts a pre-computed ctxHash
 *   detect() — convenience wrapper that hashes context itself (deprecated alias)
 */
export class LoopDetector {
    private history: Map<string, number> = new Map();
    private readonly MODERATE_THRESHOLD = 3;
    private readonly CRITICAL_THRESHOLD = 5;

    // ── Canonical method ──────────────────────────────────────────────────────

    /**
     * Check if the (action, outcomeClass, ctxHash) triple is repeating.
     *
     * @param action       - The action / tool being called
     * @param outcomeClass - Classification of the result ("success", "fail", etc.)
     * @param ctxHash      - Pre-computed SHA-256 hash of relevant context
     * @param turnId       - Informational turn counter (reserved for diagnostics)
     */
    public check(
        action: string,
        outcomeClass: string,
        ctxHash: string,
        turnId?: string,
    ): LoopSignal | null {
        void turnId; // reserved for future diagnostics
        return this._checkByHash(action, outcomeClass, ctxHash);
    }

    // ── Legacy convenience wrapper ────────────────────────────────────────────

    /**
     * @deprecated Use check() with a pre-computed hash.
     *
     * Hashes the context object internally, then delegates to _checkByHash().
     */
    public detect(
        reason: string,
        outcomeClass: string,
        context: Record<string, unknown>,
    ): LoopSignal | null {
        console.warn('[LoopDetector] detect() is deprecated. Use check() with a pre-computed hash instead.');
        const ctxHash = this._computeHash(context);
        return this._checkByHash(reason, outcomeClass, ctxHash);
    }

    // ── Reset ──────────────────────────────────────────────────────────────────

    /**
     * Clear the detection history (call between sessions).
     */
    public reset(): void {
        this.history.clear();
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private _checkByHash(
        reason: string,
        outcomeClass: string,
        contextHash: string,
    ): LoopSignal | null {
        const key = `${reason}|${outcomeClass}|${contextHash}`;
        const currentCount = (this.history.get(key) ?? 0) + 1;
        this.history.set(key, currentCount);

        if (currentCount >= this.MODERATE_THRESHOLD) {
            const severity: SafetySignalSeverity =
                currentCount >= this.CRITICAL_THRESHOLD ? 'critical' : 'moderate';

            return {
                reason,
                outcomeClass,
                contextHash,
                count: currentCount,
                severity,
                timestamp: new Date().toISOString(),
            };
        }

        return null;
    }

    private _computeHash(data: unknown): string {
        try {
            return createHash('sha256')
                .update(JSON.stringify(data))
                .digest('hex');
        } catch {
            return `error-hash-${Date.now()}`;
        }
    }
}
