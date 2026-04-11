/**
 * Session Compaction — ADR-ClawCode-Orchestration §14.3
 *
 * Automatically triggers a `compress_history` interrupt when the serialised
 * context reaches 80 % of the configured context-window budget, preventing
 * the model from losing early turns due to truncation.
 *
 * Integration point:
 *   Call `shouldCompact()` at the top of each GrayRoomOrchestrator.runLoop()
 *   iteration (after extracting context, before calling the LLM).  When it
 *   returns true, inject a `compress_history` InterruptDirective so the
 *   existing gray-room compaction path handles the summary.
 *
 * What is preserved after compaction:
 *   - Final file states (last write-file / edit-patch result per path)
 *   - Key decisions (EXECUTION_DECISION, CONFIDENCE_TRACE, WAITING_STATE)
 *   - Up to `targetEntries` history entries (default 5, range 3–7)
 *
 * What is dropped:
 *   - Intermediate LLM turns superseded by later ones
 *   - Raw tool call/result turns beyond the preserved window
 */
export interface CompactionConfig {
    /**
     * Context-window size in characters (proxy for tokens: ~4 chars/token).
     * Default: 128 000 chars  ≈ 32k tokens.
     */
    contextWindowChars?: number;
    /**
     * Fraction of contextWindowChars that triggers compaction.
     * Default: 0.8 (80 %).
     */
    compactionThreshold?: number;
    /**
     * Target number of history entries after compaction (3–7).
     * Default: 5.
     */
    targetEntries?: number;
}
export interface CompactionCheckResult {
    /** True when context has reached the compaction threshold */
    shouldCompact: boolean;
    /** Current context size in characters */
    currentChars: number;
    /** Threshold in characters */
    thresholdChars: number;
    /** Fill ratio 0–1 */
    fillRatio: number;
}
/**
 * Check whether the current context has reached the compaction threshold.
 *
 * @param ctx    The full serialised context object (or its JSON string).
 * @param config Optional overrides.
 */
export declare function checkCompactionNeeded(ctx: Record<string, unknown> | string, config?: CompactionConfig): CompactionCheckResult;
export interface HistoryEntry {
    role?: string;
    message?: string;
    artifact_type?: string;
    [key: string]: unknown;
}
/**
 * Compact a history array to `targetEntries` entries by:
 *
 *  1. Preserving the first entry (original task framing).
 *  2. Preserving all entries whose `artifact_type` is in PRESERVED_ARTIFACT_TYPES.
 *  3. Preserving the last N remaining entries (most recent context).
 *  4. Deduplicating by insertion order — no entry appears twice.
 *
 * This is a deterministic offline pass (no LLM call).  The GrayRoomOrchestrator
 * `compress_history` path calls the LLM for a semantic summary; this function
 * is used as a fast pre-pass or as a standalone fallback.
 *
 * @param history       Array of history entries to compact.
 * @param targetEntries Maximum number of entries to retain.
 */
export declare function compactHistory(history: HistoryEntry[], targetEntries?: number): HistoryEntry[];
/**
 * Apply in-place compaction to a mutable context object.
 *
 * Mutates `ctx.history` and `ctx.context.history` (if present) to the
 * compacted version, and sets `ctx._compacted_at` for audit.
 *
 * @param ctx    Full context object (mutated in place).
 * @param config Optional overrides.
 * @returns      True when compaction was actually performed.
 */
export declare function applyCompaction(ctx: Record<string, unknown>, config?: CompactionConfig): boolean;
//# sourceMappingURL=session-compaction.d.ts.map